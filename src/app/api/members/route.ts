import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { addDays, endOfMonth, parse, startOfMonth } from "date-fns";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/api-auth";
import { memberSchema } from "@/lib/validations";
import { calcExpiryDate, deriveMemberStatus } from "@/lib/utils";
import { normalizePhone } from "@/lib/phone";
import { sendWelcomeMessages } from "@/lib/notify";
import { generateMemberCode } from "@/lib/member-code";

export async function GET(request: NextRequest) {
  const authResult = await requireSession();
  if (authResult.error) return authResult.error;

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const status = searchParams.get("status");
  const paymentStatus = searchParams.get("paymentStatus");
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const pageSize = Math.min(200, Math.max(1, Number(searchParams.get("pageSize") ?? 10)));
  const expiringSoon = searchParams.get("expiringSoon") === "true";
  const joinedThisMonth = searchParams.get("joinedThisMonth") === "true";
  const paidThisMonth = searchParams.get("paidThisMonth") === "true";
  const joinedMonth = searchParams.get("joinedMonth"); // YYYY-MM
  const exportAll = searchParams.get("export") === "true";

  const where: Prisma.MemberWhereInput = {};

  if (q) {
    where.OR = [
      { fullName: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
      { phone: { contains: q, mode: "insensitive" } },
      { memberCode: { contains: q, mode: "insensitive" } },
    ];
  }

  if (status) where.status = status as Prisma.EnumMemberStatusFilter["equals"];
  if (paymentStatus) {
    where.paymentStatus = paymentStatus as Prisma.EnumPaymentStatusFilter["equals"];
  }

  const now = new Date();

  if (expiringSoon) {
    where.expiryDate = { gte: now, lte: addDays(now, 7) };
    where.status = "ACTIVE";
  }

  // Joined filters use membership startDate (when they joined the gym)
  if (joinedThisMonth) {
    where.startDate = { gte: startOfMonth(now), lte: endOfMonth(now) };
  }

  if (joinedMonth && /^\d{4}-\d{2}$/.test(joinedMonth)) {
    const monthStart = startOfMonth(parse(`${joinedMonth}-01`, "yyyy-MM-dd", new Date()));
    where.startDate = { gte: monthStart, lte: endOfMonth(monthStart) };
  }

  if (paidThisMonth) {
    where.payments = {
      some: {
        status: "PAID",
        paidAt: { gte: startOfMonth(now), lte: endOfMonth(now) },
      },
    };
  }

  if (exportAll) {
    const members = await prisma.member.findMany({
      where,
      include: { plan: true },
      orderBy: { startDate: "desc" },
      take: 5000,
    });
    return NextResponse.json({ data: members });
  }

  const [total, members] = await Promise.all([
    prisma.member.count({ where }),
    prisma.member.findMany({
      where,
      include: { plan: true },
      orderBy: { startDate: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return NextResponse.json({
    data: members,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  });
}

async function uniqueMemberCode(tx: Prisma.TransactionClient) {
  for (let i = 0; i < 8; i++) {
    const code = generateMemberCode();
    const exists = await tx.member.findUnique({ where: { memberCode: code } });
    if (!exists) return code;
  }
  return generateMemberCode() + Date.now().toString(36).slice(-3).toUpperCase();
}

export async function POST(request: NextRequest) {
  const authResult = await requireSession();
  if (authResult.error) return authResult.error;

  const body = await request.json();
  const parsed = memberSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  const phone = normalizePhone(data.phone) ?? data.phone.trim();
  const plan = await prisma.membershipPlan.findUnique({ where: { id: data.planId } });
  if (!plan || !plan.isActive) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  const startDate = new Date(data.startDate);
  const expiryDate = calcExpiryDate(startDate, plan.durationDays);
  const status = deriveMemberStatus(expiryDate, undefined, data.status);

  try {
    const member = await prisma.$transaction(async (tx) => {
      const memberCode = await uniqueMemberCode(tx);
      const created = await tx.member.create({
        data: {
          memberCode,
          fullName: data.fullName,
          email: data.email.toLowerCase().trim(),
          phone,
          gender: data.gender,
          emergencyContact: data.emergencyContact || null,
          planId: data.planId,
          startDate,
          expiryDate,
          paymentStatus: data.paymentStatus,
          status,
          notes: data.notes || null,
        },
        include: { plan: true },
      });

      await tx.payment.create({
        data: {
          memberId: created.id,
          planId: plan.id,
          amount: plan.feeAmount,
          status: data.paymentStatus,
          paidAt: data.paymentStatus === "PAID" ? new Date() : null,
          dueDate: startDate,
          method: data.paymentStatus === "PAID" ? "Card" : null,
          createdById: authResult.session!.user.id,
        },
      });

      return created;
    });

    const welcome = await sendWelcomeMessages({
      memberId: member.id,
      userId: authResult.session!.user.id,
      fullName: member.fullName,
      planName: member.plan.name,
      expiryDate: member.expiryDate,
    });

    return NextResponse.json({ ...member, welcome }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "Email already exists" }, { status: 409 });
    }
    throw error;
  }
}

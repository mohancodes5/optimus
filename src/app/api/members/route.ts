import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/api-auth";
import { memberSchema } from "@/lib/validations";
import { calcExpiryDate, deriveMemberStatus } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const authResult = await requireSession();
  if (authResult.error) return authResult.error;

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const status = searchParams.get("status");
  const paymentStatus = searchParams.get("paymentStatus");
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const pageSize = Math.min(50, Math.max(1, Number(searchParams.get("pageSize") ?? 10)));
  const expiringSoon = searchParams.get("expiringSoon") === "true";

  const where: Prisma.MemberWhereInput = {};

  if (q) {
    where.OR = [
      { fullName: { contains: q } },
      { email: { contains: q } },
      { phone: { contains: q } },
    ];
  }

  if (status) where.status = status as Prisma.EnumMemberStatusFilter["equals"];
  if (paymentStatus) {
    where.paymentStatus = paymentStatus as Prisma.EnumPaymentStatusFilter["equals"];
  }

  if (expiringSoon) {
    const now = new Date();
    const in7 = new Date();
    in7.setDate(in7.getDate() + 7);
    where.expiryDate = { gte: now, lte: in7 };
    where.status = "ACTIVE";
  }

  const [total, members] = await Promise.all([
    prisma.member.count({ where }),
    prisma.member.findMany({
      where,
      include: { plan: true },
      orderBy: { createdAt: "desc" },
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

export async function POST(request: NextRequest) {
  const authResult = await requireSession();
  if (authResult.error) return authResult.error;

  const body = await request.json();
  const parsed = memberSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  const plan = await prisma.membershipPlan.findUnique({ where: { id: data.planId } });
  if (!plan || !plan.isActive) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  const startDate = new Date(data.startDate);
  const expiryDate = calcExpiryDate(startDate, plan.durationDays);
  const status = deriveMemberStatus(expiryDate);

  try {
    const member = await prisma.$transaction(async (tx) => {
      const created = await tx.member.create({
        data: {
          fullName: data.fullName,
          email: data.email,
          phone: data.phone,
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

    return NextResponse.json(member, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "Email already exists" }, { status: 409 });
    }
    throw error;
  }
}

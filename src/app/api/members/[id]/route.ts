import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/api-auth";
import { memberSchema } from "@/lib/validations";
import { calcExpiryDate, deriveMemberStatus } from "@/lib/utils";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const authResult = await requireSession();
  if (authResult.error) return authResult.error;

  const { id } = await params;
  const member = await prisma.member.findUnique({
    where: { id },
    include: {
      plan: true,
      payments: { orderBy: { createdAt: "desc" }, include: { plan: true } },
      attendances: { orderBy: { checkedInAt: "desc" }, take: 50 },
      notifications: { orderBy: { createdAt: "desc" }, take: 20 },
    },
  });

  if (!member) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  return NextResponse.json(member);
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const authResult = await requireSession();
  if (authResult.error) return authResult.error;

  const { id } = await params;
  const body = await request.json();

  // Quick actions: renew or update payment status only
  if (body.action === "renew") {
    const member = await prisma.member.findUnique({
      where: { id },
      include: { plan: true },
    });
    if (!member) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const startDate = new Date();
    const expiryDate = calcExpiryDate(startDate, member.plan.durationDays);

    const updated = await prisma.$transaction(async (tx) => {
      const m = await tx.member.update({
        where: { id },
        data: {
          startDate,
          expiryDate,
          paymentStatus: "PAID",
          status: "ACTIVE",
        },
        include: { plan: true },
      });

      await tx.payment.create({
        data: {
          memberId: id,
          planId: member.planId,
          amount: member.plan.feeAmount,
          status: "PAID",
          paidAt: startDate,
          dueDate: startDate,
          method: "Card",
          notes: "Plan renewed",
          createdById: authResult.session!.user.id,
        },
      });

      return m;
    });

    return NextResponse.json(updated);
  }

  const parsed = memberSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  const existing = await prisma.member.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let planId = existing.planId;
  let durationDays: number | null = null;

  if (data.planId) {
    const plan = await prisma.membershipPlan.findUnique({ where: { id: data.planId } });
    if (!plan) return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    planId = plan.id;
    durationDays = plan.durationDays;
  } else if (data.startDate) {
    const plan = await prisma.membershipPlan.findUnique({ where: { id: existing.planId } });
    durationDays = plan?.durationDays ?? null;
  }

  const startDate = data.startDate ? new Date(data.startDate) : existing.startDate;
  const expiryDate =
    durationDays != null ? calcExpiryDate(startDate, durationDays) : existing.expiryDate;

  try {
    const updated = await prisma.member.update({
      where: { id },
      data: {
        fullName: data.fullName,
        email: data.email,
        phone: data.phone,
        gender: data.gender,
        emergencyContact: data.emergencyContact,
        planId,
        startDate,
        expiryDate,
        paymentStatus: data.paymentStatus,
        status: deriveMemberStatus(expiryDate, existing.status),
        notes: data.notes,
      },
      include: { plan: true },
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "Email already exists" }, { status: 409 });
    }
    throw error;
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const authResult = await requireSession(["ADMIN"]);
  if (authResult.error) return authResult.error;

  const { id } = await params;
  await prisma.member.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

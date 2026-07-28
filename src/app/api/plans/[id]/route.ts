import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/api-auth";
import { planSchema } from "@/lib/validations";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const authResult = await requireSession(["ADMIN"]);
  if (authResult.error) return authResult.error;

  const { id } = await params;
  const body = await request.json();
  const parsed = planSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const plan = await prisma.membershipPlan.update({
    where: { id },
    data: {
      name: parsed.data.name,
      description: parsed.data.description,
      category: parsed.data.category,
      durationDays: parsed.data.durationDays,
      feeAmount: parsed.data.feeAmount,
      perks: parsed.data.perks,
      isActive: parsed.data.isActive,
    },
  });

  return NextResponse.json(plan);
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const authResult = await requireSession(["ADMIN"]);
  if (authResult.error) return authResult.error;

  const { id } = await params;
  const memberCount = await prisma.member.count({ where: { planId: id } });
  if (memberCount > 0) {
    // Soft-delete style: deactivate instead of hard delete when in use
    const plan = await prisma.membershipPlan.update({
      where: { id },
      data: { isActive: false },
    });
    return NextResponse.json({
      plan,
      message: "Plan deactivated because members are assigned to it",
    });
  }

  await prisma.membershipPlan.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/api-auth";
import { planSchema } from "@/lib/validations";

export async function GET() {
  const authResult = await requireSession();
  if (authResult.error) return authResult.error;

  const plans = await prisma.membershipPlan.findMany({
    orderBy: { feeAmount: "asc" },
    include: { _count: { select: { members: true } } },
  });

  return NextResponse.json(plans);
}

export async function POST(request: NextRequest) {
  const authResult = await requireSession(["ADMIN"]);
  if (authResult.error) return authResult.error;

  const body = await request.json();
  const parsed = planSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const plan = await prisma.membershipPlan.create({
    data: {
      name: parsed.data.name,
      description: parsed.data.description || null,
      durationDays: parsed.data.durationDays,
      feeAmount: parsed.data.feeAmount,
      perks: parsed.data.perks,
      isActive: parsed.data.isActive,
    },
  });

  return NextResponse.json(plan, { status: 201 });
}

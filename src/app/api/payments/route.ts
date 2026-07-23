import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  const authResult = await requireSession();
  if (authResult.error) return authResult.error;

  const { searchParams } = new URL(request.url);
  const memberId = searchParams.get("memberId");

  const payments = await prisma.payment.findMany({
    where: memberId ? { memberId } : undefined,
    include: {
      member: { select: { id: true, fullName: true } },
      plan: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json(payments);
}

export async function PATCH(request: NextRequest) {
  const authResult = await requireSession();
  if (authResult.error) return authResult.error;

  const body = await request.json();
  const { id, status } = body as { id?: string; status?: "PAID" | "PENDING" | "OVERDUE" };

  if (!id || !status) {
    return NextResponse.json({ error: "id and status required" }, { status: 400 });
  }

  const payment = await prisma.$transaction(async (tx) => {
    const updated = await tx.payment.update({
      where: { id },
      data: {
        status,
        paidAt: status === "PAID" ? new Date() : null,
      },
    });

    await tx.member.update({
      where: { id: updated.memberId },
      data: { paymentStatus: status },
    });

    return updated;
  });

  return NextResponse.json(payment);
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/api-auth";
import { attendanceSchema } from "@/lib/validations";
import { startOfDay, endOfDay } from "date-fns";

export async function GET(request: NextRequest) {
  const authResult = await requireSession();
  if (authResult.error) return authResult.error;

  const { searchParams } = new URL(request.url);
  const memberId = searchParams.get("memberId");
  const today = searchParams.get("today") === "true";

  const where: {
    memberId?: string;
    checkedInAt?: { gte: Date; lte: Date };
  } = {};

  if (memberId) where.memberId = memberId;
  if (today) {
    const now = new Date();
    where.checkedInAt = { gte: startOfDay(now), lte: endOfDay(now) };
  }

  const records = await prisma.attendance.findMany({
    where,
    include: {
      member: { select: { id: true, fullName: true, email: true, phone: true, status: true } },
    },
    orderBy: { checkedInAt: "desc" },
    take: 100,
  });

  return NextResponse.json(records);
}

export async function POST(request: NextRequest) {
  const authResult = await requireSession();
  if (authResult.error) return authResult.error;

  const body = await request.json();
  const parsed = attendanceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const member = await prisma.member.findUnique({ where: { id: parsed.data.memberId } });
  if (!member) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  if (member.status === "EXPIRED" || member.status === "SUSPENDED") {
    return NextResponse.json(
      { error: `Cannot check in: membership is ${member.status.toLowerCase()}` },
      { status: 400 }
    );
  }

  const now = new Date();
  const existing = await prisma.attendance.findFirst({
    where: {
      memberId: member.id,
      checkedInAt: { gte: startOfDay(now), lte: endOfDay(now) },
    },
  });

  if (existing) {
    return NextResponse.json(
      { error: "Member already checked in today", attendance: existing },
      { status: 409 }
    );
  }

  const attendance = await prisma.attendance.create({
    data: {
      memberId: member.id,
      notes: parsed.data.notes || null,
      checkedInById: authResult.session!.user.id,
    },
    include: {
      member: { select: { id: true, fullName: true, email: true, phone: true } },
    },
  });

  return NextResponse.json(attendance, { status: 201 });
}

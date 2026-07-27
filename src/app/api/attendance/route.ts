import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/api-auth";
import { attendanceSchema } from "@/lib/validations";
import { parseMemberQrPayload } from "@/lib/member-code";
import { startOfDay, endOfDay } from "date-fns";

export async function GET(request: NextRequest) {
  const authResult = await requireSession();
  if (authResult.error) return authResult.error;

  const { searchParams } = new URL(request.url);
  const memberId = searchParams.get("memberId");
  const today = searchParams.get("today") === "true";
  const date = searchParams.get("date"); // yyyy-MM-dd
  const exportAll = searchParams.get("export") === "true";

  const where: {
    memberId?: string;
    checkedInAt?: { gte: Date; lte: Date };
  } = {};

  if (memberId) where.memberId = memberId;
  if (today || date) {
    const base = date ? new Date(`${date}T12:00:00`) : new Date();
    where.checkedInAt = { gte: startOfDay(base), lte: endOfDay(base) };
  }

  const records = await prisma.attendance.findMany({
    where,
    include: {
      member: {
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          status: true,
          memberCode: true,
        },
      },
    },
    orderBy: { checkedInAt: "desc" },
    take: exportAll ? 5000 : 100,
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

  const codeOrId = parsed.data.memberCode
    ? parseMemberQrPayload(parsed.data.memberCode)
    : parsed.data.memberId!;

  const member = await prisma.member.findFirst({
    where: {
      OR: [{ id: codeOrId }, { memberCode: codeOrId.toUpperCase() }, { memberCode: codeOrId }],
    },
  });

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
  const todays = await prisma.attendance.findMany({
    where: {
      memberId: member.id,
      checkedInAt: { gte: startOfDay(now), lte: endOfDay(now) },
    },
    orderBy: { checkedInAt: "desc" },
  });

  const openSession = todays.find((a) => !a.checkedOutAt);
  const action =
    parsed.data.action === "auto"
      ? openSession
        ? "checkout"
        : "checkin"
      : parsed.data.action;

  if (action === "checkout") {
    if (!openSession) {
      return NextResponse.json(
        { error: "No open check-in to check out", member },
        { status: 409 }
      );
    }

    const attendance = await prisma.attendance.update({
      where: { id: openSession.id },
      data: { checkedOutAt: now },
      include: {
        member: {
          select: { id: true, fullName: true, email: true, phone: true, memberCode: true },
        },
      },
    });

    return NextResponse.json({
      action: "checkout",
      attendance,
      message: `${member.fullName} checked out`,
    });
  }

  if (openSession) {
    return NextResponse.json(
      {
        error: "Member already checked in — scan again to check out",
        action: "checkout_available",
        attendance: openSession,
      },
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
      member: {
        select: { id: true, fullName: true, email: true, phone: true, memberCode: true },
      },
    },
  });

  return NextResponse.json(
    {
      action: "checkin",
      attendance,
      message: `${member.fullName} checked in`,
    },
    { status: 201 }
  );
}

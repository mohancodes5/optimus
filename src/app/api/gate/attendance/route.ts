import { NextRequest, NextResponse } from "next/server";
import { startOfDay, endOfDay } from "date-fns";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { parseMemberQrPayload } from "@/lib/member-code";

const schema = z.object({
  code: z.string().min(1),
  action: z.enum(["auto", "checkin", "checkout"]).default("auto"),
});

/** Public self check-in / check-out (no staff login) */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Member code is required" }, { status: 400 });
  }

  const value = parseMemberQrPayload(parsed.data.code).trim();
  const upper = value.toUpperCase();

  const member = await prisma.member.findFirst({
    where: {
      OR: [
        { memberCode: upper },
        { memberCode: value },
        { phone: { contains: value.replace(/\s+/g, "") } },
        { email: { equals: value.toLowerCase(), mode: "insensitive" } },
      ],
    },
  });

  if (!member) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  if (member.status === "EXPIRED" || member.status === "SUSPENDED") {
    return NextResponse.json(
      { error: `Cannot continue: membership is ${member.status.toLowerCase()}` },
      { status: 403 }
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
      return NextResponse.json({ error: "You are not checked in yet" }, { status: 409 });
    }

    const attendance = await prisma.attendance.update({
      where: { id: openSession.id },
      data: { checkedOutAt: now },
      include: {
        member: { select: { fullName: true, memberCode: true } },
      },
    });

    return NextResponse.json({
      action: "checkout",
      message: `Goodbye, ${member.fullName}! Checked out successfully.`,
      attendance,
    });
  }

  if (openSession) {
    return NextResponse.json(
      { error: "You are already checked in. Use Check Out when you leave." },
      { status: 409 }
    );
  }

  const attendance = await prisma.attendance.create({
    data: {
      memberId: member.id,
      notes: "Self check-in via gate QR",
    },
    include: {
      member: { select: { fullName: true, memberCode: true } },
    },
  });

  return NextResponse.json(
    {
      action: "checkin",
      message: `Welcome, ${member.fullName}! Checked in successfully.`,
      attendance,
    },
    { status: 201 }
  );
}

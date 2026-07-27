import { NextRequest, NextResponse } from "next/server";
import { startOfDay, endOfDay } from "date-fns";
import { prisma } from "@/lib/prisma";
import { parseMemberQrPayload } from "@/lib/member-code";

function normalizeLookup(raw: string) {
  return parseMemberQrPayload(raw).trim();
}

async function findMember(raw: string) {
  const value = normalizeLookup(raw);
  if (!value) return null;

  const upper = value.toUpperCase();
  return prisma.member.findFirst({
    where: {
      OR: [
        { memberCode: upper },
        { memberCode: value },
        { phone: { contains: value.replace(/\s+/g, "") } },
        { email: { equals: value.toLowerCase(), mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      fullName: true,
      memberCode: true,
      status: true,
      phone: true,
      plan: { select: { name: true } },
    },
  });
}

async function todayState(memberId: string) {
  const now = new Date();
  const todays = await prisma.attendance.findMany({
    where: {
      memberId,
      checkedInAt: { gte: startOfDay(now), lte: endOfDay(now) },
    },
    orderBy: { checkedInAt: "desc" },
  });
  const open = todays.find((a) => !a.checkedOutAt) ?? null;
  return {
    open,
    nextAction: open ? ("checkout" as const) : ("checkin" as const),
    checkedInAt: open?.checkedInAt?.toISOString() ?? null,
  };
}

/** Public lookup for self check-in kiosk */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const code = typeof body.code === "string" ? body.code : "";
  if (!code.trim()) {
    return NextResponse.json({ error: "Enter your member code or phone" }, { status: 400 });
  }

  const member = await findMember(code);
  if (!member) {
    return NextResponse.json({ error: "Member not found. Check your code and try again." }, { status: 404 });
  }

  if (member.status === "EXPIRED" || member.status === "SUSPENDED") {
    return NextResponse.json(
      {
        error: `Membership is ${member.status.toLowerCase()}. Please speak to the front desk.`,
        member: {
          fullName: member.fullName,
          memberCode: member.memberCode,
          status: member.status,
        },
      },
      { status: 403 }
    );
  }

  const state = await todayState(member.id);

  return NextResponse.json({
    member: {
      id: member.id,
      fullName: member.fullName,
      memberCode: member.memberCode,
      status: member.status,
      planName: member.plan.name,
      phoneHint: member.phone.slice(-4),
    },
    nextAction: state.nextAction,
    checkedInAt: state.checkedInAt,
  });
}

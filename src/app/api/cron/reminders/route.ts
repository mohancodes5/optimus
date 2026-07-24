import { NextRequest, NextResponse } from "next/server";
import { addDays, subHours } from "date-fns";
import { prisma } from "@/lib/prisma";
import { notifyMember } from "@/lib/notify";
import { formatDate, daysUntilExpiry } from "@/lib/utils";

export const dynamic = "force-dynamic";

function authorizeCron(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = request.headers.get("authorization");
  return header === `Bearer ${secret}`;
}

/**
 * Daily reminders for expiring (≤7 days) and unpaid memberships.
 * Secure with CRON_SECRET. Configure in vercel.json crons.
 */
export async function GET(request: NextRequest) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const in7 = addDays(now, 7);
  const since = subHours(now, 20);

  const [expiring, unpaid] = await Promise.all([
    prisma.member.findMany({
      where: {
        status: "ACTIVE",
        expiryDate: { gte: now, lte: in7 },
      },
      include: { plan: true },
      take: 100,
    }),
    prisma.member.findMany({
      where: {
        paymentStatus: { in: ["PENDING", "OVERDUE"] },
        status: { in: ["ACTIVE", "EXPIRED"] },
      },
      include: { plan: true },
      take: 100,
    }),
  ]);

  const results: Array<Record<string, unknown>> = [];

  for (const member of expiring) {
    const recent = await prisma.notification.findFirst({
      where: {
        memberId: member.id,
        type: "EXPIRING",
        createdAt: { gte: since },
      },
    });
    if (recent) continue;

    const days = daysUntilExpiry(member.expiryDate);
    const title = "Membership expiring soon";
    const message = `Hi ${member.fullName}, your ${member.plan.name} plan expires in ${days} day(s) on ${formatDate(member.expiryDate)}. Renew to keep training.`;

    for (const channel of ["SMS", "EMAIL"] as const) {
      const delivery = await notifyMember({
        memberId: member.id,
        type: "EXPIRING",
        channel,
        title,
        message,
        idempotencyKey: `cron-expiring/${member.id}/${formatDate(now)}/${channel}`,
      });
      results.push({ memberId: member.id, type: "EXPIRING", ...delivery });
    }
  }

  for (const member of unpaid) {
    const recent = await prisma.notification.findFirst({
      where: {
        memberId: member.id,
        type: "UNPAID",
        createdAt: { gte: since },
      },
    });
    if (recent) continue;

    const title = "Payment reminder";
    const message = `Hi ${member.fullName}, your Optimus Fitness membership payment is still ${member.paymentStatus.toLowerCase()}. Please settle to avoid interruption.`;

    for (const channel of ["SMS", "EMAIL"] as const) {
      const delivery = await notifyMember({
        memberId: member.id,
        type: "UNPAID",
        channel,
        title,
        message,
        idempotencyKey: `cron-unpaid/${member.id}/${formatDate(now)}/${channel}`,
      });
      results.push({ memberId: member.id, type: "UNPAID", ...delivery });
    }
  }

  return NextResponse.json({
    ok: true,
    scanned: { expiring: expiring.length, unpaid: unpaid.length },
    sent: results.filter((r) => r.sent).length,
    failed: results.filter((r) => !r.sent && !r.skipped).length,
    skipped: results.filter((r) => r.skipped).length,
    results,
  });
}

import { NextRequest, NextResponse } from "next/server";
import { addDays, subHours } from "date-fns";
import { prisma } from "@/lib/prisma";
import { sendReminderMessages } from "@/lib/notify";
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
 * Sends SMS + WhatsApp + Email when configured.
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

    const deliveries = await sendReminderMessages({
      memberId: member.id,
      type: "EXPIRING",
      title,
      message,
      variable1: formatDate(member.expiryDate),
      variable2: `${days} day(s)`,
    });
    for (const delivery of deliveries) {
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

    const deliveries = await sendReminderMessages({
      memberId: member.id,
      type: "UNPAID",
      title,
      message,
      variable1: formatDate(now),
      variable2: member.paymentStatus.toLowerCase(),
    });
    for (const delivery of deliveries) {
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

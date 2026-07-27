import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/api-auth";
import {
  addDays,
  endOfMonth,
  format,
  startOfMonth,
  subMonths,
} from "date-fns";

export async function GET() {
  const authResult = await requireSession();
  if (authResult.error) return authResult.error;

  const now = new Date();
  const monthStart = startOfMonth(now);
  const in7 = addDays(now, 7);

  const [
    activeMembers,
    monthlyRevenueAgg,
    expiringSoon,
    newJoiners,
    unpaidCount,
    revenueByMonthRaw,
    growthByMonthRaw,
    expiringMembers,
  ] = await Promise.all([
    prisma.member.count({ where: { status: "ACTIVE" } }),
    prisma.payment.aggregate({
      where: {
        status: "PAID",
        paidAt: { gte: monthStart, lte: endOfMonth(now) },
      },
      _sum: { amount: true },
    }),
    prisma.member.count({
      where: {
        status: "ACTIVE",
        expiryDate: { gte: now, lte: in7 },
      },
    }),
    prisma.member.count({
      where: { startDate: { gte: monthStart, lte: endOfMonth(now) } },
    }),
    prisma.member.count({
      where: { paymentStatus: { in: ["PENDING", "OVERDUE"] } },
    }),
    prisma.payment.findMany({
      where: {
        status: "PAID",
        paidAt: { gte: startOfMonth(subMonths(now, 5)) },
      },
      select: { amount: true, paidAt: true },
    }),
    prisma.member.findMany({
      where: { startDate: { gte: startOfMonth(subMonths(now, 5)) } },
      select: { startDate: true },
    }),
    prisma.member.findMany({
      where: {
        status: "ACTIVE",
        expiryDate: { gte: now, lte: in7 },
      },
      include: { plan: true },
      orderBy: { expiryDate: "asc" },
      take: 10,
    }),
  ]);

  const monthKeys: string[] = [];
  for (let i = 5; i >= 0; i--) {
    monthKeys.push(format(subMonths(now, i), "yyyy-MM"));
  }

  const revenueChart = monthKeys.map((key) => {
    const total = revenueByMonthRaw
      .filter((p) => p.paidAt && format(p.paidAt, "yyyy-MM") === key)
      .reduce((sum, p) => sum + Number(p.amount), 0);
    return {
      month: format(new Date(`${key}-01`), "MMM"),
      revenue: Math.round(total * 100) / 100,
    };
  });

  const growthChart = monthKeys.map((key) => {
    const count = growthByMonthRaw.filter(
      (m) => format(m.startDate, "yyyy-MM") === key
    ).length;
    return {
      month: format(new Date(`${key}-01`), "MMM"),
      members: count,
    };
  });

  return NextResponse.json({
    kpis: {
      activeMembers,
      monthlyRevenue: Number(monthlyRevenueAgg._sum.amount ?? 0),
      expiringSoon,
      newJoiners,
      unpaidCount,
    },
    charts: {
      revenue: revenueChart,
      growth: growthChart,
    },
    expiringMembers,
  });
}

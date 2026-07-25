import { Users, IndianRupee, AlertTriangle, UserPlus } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  addDays,
  endOfMonth,
  format,
  startOfMonth,
  subMonths,
} from "date-fns";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { AnalyticsCharts } from "@/components/dashboard/analytics-charts";
import { ExpiringPlansWidget } from "@/components/dashboard/expiring-plans-widget";
import { formatCurrency } from "@/lib/utils";

async function getDashboardData() {
  const now = new Date();
  const monthStart = startOfMonth(now);
  const in7 = addDays(now, 7);

  const [
    activeMembers,
    monthlyRevenueAgg,
    expiringSoon,
    newJoiners,
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
      where: { status: "ACTIVE", expiryDate: { gte: now, lte: in7 } },
    }),
    prisma.member.count({ where: { createdAt: { gte: monthStart } } }),
    prisma.payment.findMany({
      where: {
        status: "PAID",
        paidAt: { gte: startOfMonth(subMonths(now, 5)) },
      },
      select: { amount: true, paidAt: true },
    }),
    prisma.member.findMany({
      where: { createdAt: { gte: startOfMonth(subMonths(now, 5)) } },
      select: { createdAt: true },
    }),
    prisma.member.findMany({
      where: { status: "ACTIVE", expiryDate: { gte: now, lte: in7 } },
      include: { plan: true },
      orderBy: { expiryDate: "asc" },
      take: 10,
    }),
  ]);

  const monthKeys: string[] = [];
  for (let i = 5; i >= 0; i--) {
    monthKeys.push(format(subMonths(now, i), "yyyy-MM"));
  }

  const revenue = monthKeys.map((key) => ({
    month: format(new Date(`${key}-01`), "MMM"),
    revenue:
      Math.round(
        revenueByMonthRaw
          .filter((p) => p.paidAt && format(p.paidAt, "yyyy-MM") === key)
          .reduce((sum, p) => sum + Number(p.amount), 0) * 100
      ) / 100,
  }));

  const growth = monthKeys.map((key) => ({
    month: format(new Date(`${key}-01`), "MMM"),
    members: growthByMonthRaw.filter((m) => format(m.createdAt, "yyyy-MM") === key)
      .length,
  }));

  return {
    kpis: {
      activeMembers,
      monthlyRevenue: Number(monthlyRevenueAgg._sum.amount ?? 0),
      expiringSoon,
      newJoiners,
    },
    charts: { revenue, growth },
    expiringMembers: expiringMembers.map((m) => ({
      ...m,
      expiryDate: m.expiryDate.toISOString(),
      plan: { ...m.plan, feeAmount: Number(m.plan.feeAmount) },
    })),
  };
}

export default async function DashboardPage() {
  const session = await auth();
  const data = await getDashboardData();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Welcome back, {session?.user?.name?.split(" ")[0] ?? "team"}. Here&apos;s your gym at a
          glance.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Active Members"
          value={String(data.kpis.activeMembers)}
          hint="Currently active memberships"
          icon={Users}
          accent="bg-sky/15 text-sky"
          href="/members?status=ACTIVE"
        />
        <KpiCard
          title="Monthly Revenue"
          value={formatCurrency(data.kpis.monthlyRevenue)}
          hint="Paid invoices this month"
          icon={IndianRupee}
          accent="bg-lime/15 text-lime"
          href="/revenue"
        />
        <KpiCard
          title="Expiring Soon"
          value={String(data.kpis.expiringSoon)}
          hint="Plans ending in ≤ 7 days"
          icon={AlertTriangle}
          accent="bg-warning/15 text-warning"
          href="/members?expiringSoon=true"
        />
        <KpiCard
          title="New Joiners"
          value={String(data.kpis.newJoiners)}
          hint="Joined this month"
          icon={UserPlus}
          accent="bg-primary/15 text-primary"
          href="/members?joinedThisMonth=true"
        />
      </div>

      <AnalyticsCharts revenue={data.charts.revenue} growth={data.charts.growth} />

      <div className="grid gap-4 lg:grid-cols-2">
        <ExpiringPlansWidget members={data.expiringMembers} />
        <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-accent to-secondary p-5 shadow-sm">
          <h2 className="text-base font-semibold text-foreground">Operations snapshot</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Use Check-In for front-desk attendance, Alerts for unpaid/expiring reminders, and
            Members to renew plans in one click from the expiring list.
          </p>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            <li className="text-success">• Green badges = Active / Paid</li>
            <li className="text-warning">• Amber badges = Expiring soon / Pending</li>
            <li className="text-danger">• Red badges = Expired / Overdue</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

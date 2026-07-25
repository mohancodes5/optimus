import Link from "next/link";
import { endOfMonth, format, startOfMonth } from "date-fns";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function RevenuePage() {
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const payments = await prisma.payment.findMany({
    where: {
      status: "PAID",
      paidAt: { gte: monthStart, lte: monthEnd },
    },
    include: {
      member: { select: { id: true, fullName: true, email: true, phone: true } },
      plan: { select: { id: true, name: true } },
    },
    orderBy: { paidAt: "desc" },
  });

  const total = payments.reduce((sum, p) => sum + Number(p.amount), 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Monthly Revenue</h1>
          <p className="text-sm text-muted-foreground">
            Paid invoices for {format(now, "MMMM yyyy")} · Total {formatCurrency(total)}
          </p>
        </div>
        <Link
          href="/"
          className="inline-flex h-8 items-center gap-1 rounded-md border border-border px-3 text-xs font-medium hover:bg-accent hover:text-accent-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Payments this month</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Paid on</TableHead>
                <TableHead>Method</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                    No paid invoices this month
                  </TableCell>
                </TableRow>
              ) : (
                payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <Link
                        href={`/members/${p.member.id}`}
                        className="font-medium hover:text-primary"
                      >
                        {p.member.fullName}
                      </Link>
                      <div className="text-xs text-muted-foreground">{p.member.email}</div>
                    </TableCell>
                    <TableCell>{p.plan.name}</TableCell>
                    <TableCell>{p.paidAt ? formatDate(p.paidAt) : "—"}</TableCell>
                    <TableCell>
                      <Badge variant="success">{p.method ?? "Paid"}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(Number(p.amount))}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

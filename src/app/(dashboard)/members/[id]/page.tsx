import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  memberStatusBadge,
  derivePaymentBadge,
} from "@/lib/utils";

type Props = { params: Promise<{ id: string }> };

export default async function MemberProfilePage({ params }: Props) {
  const { id } = await params;
  const member = await prisma.member.findUnique({
    where: { id },
    include: {
      plan: true,
      payments: { orderBy: { createdAt: "desc" }, include: { plan: true } },
      attendances: { orderBy: { checkedInAt: "desc" }, take: 30 },
      notifications: { orderBy: { createdAt: "desc" }, take: 20 },
    },
  });

  if (!member) notFound();

  const status = memberStatusBadge(member.status, member.expiryDate);
  const payment = derivePaymentBadge(member.paymentStatus, member.expiryDate);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/members"
          className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to members
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{member.fullName}</h1>
            <p className="text-sm text-muted-foreground">
              {member.email} · {member.phone}
            </p>
          </div>
          <div className="flex gap-2">
            <Badge variant={status.tone}>{status.label}</Badge>
            <Badge variant={payment.tone}>{payment.label}</Badge>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Personal & membership details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row label="Gender" value={member.gender} />
            <Row label="Emergency" value={member.emergencyContact || "—"} />
            <Row label="Plan" value={member.plan.name} />
            <Row label="Fee" value={formatCurrency(Number(member.plan.feeAmount))} />
            <Row label="Start" value={formatDate(member.startDate)} />
            <Row label="Expiry" value={formatDate(member.expiryDate)} />
            <Row label="Notes" value={member.notes || "—"} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Payment History</CardTitle>
            <CardDescription>Invoices and renewals</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {member.payments.length === 0 ? (
              <Empty text="No payments yet" />
            ) : (
              member.payments.map((p) => (
                <div
                  key={p.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 px-3 py-2"
                >
                  <div>
                    <p className="font-medium">{p.plan.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Due {formatDate(p.dueDate)}
                      {p.paidAt ? ` · Paid ${formatDate(p.paidAt)}` : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{formatCurrency(Number(p.amount))}</p>
                    <Badge
                      variant={
                        p.status === "PAID"
                          ? "success"
                          : p.status === "OVERDUE"
                            ? "danger"
                            : "warning"
                      }
                    >
                      {p.status}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Check-In History</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {member.attendances.length === 0 ? (
              <Empty text="No check-ins recorded" />
            ) : (
              member.attendances.map((a) => (
                <div
                  key={a.id}
                  className="flex justify-between rounded-lg border border-border/60 px-3 py-2 text-sm"
                >
                  <span>Checked in</span>
                  <span className="text-muted-foreground">{formatDateTime(a.checkedInAt)}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {member.notifications.length === 0 ? (
              <Empty text="No alerts sent" />
            ) : (
              member.notifications.map((n) => (
                <div key={n.id} className="rounded-lg border border-border/60 px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">{n.title}</p>
                    <Badge variant={n.sent ? "success" : "warning"}>
                      {n.sent ? "Sent" : "Queued"}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{n.message}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border/50 py-2 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="py-6 text-center text-sm text-muted-foreground">{text}</p>;
}

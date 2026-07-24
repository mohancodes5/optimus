"use client";

import { useState } from "react";
import { Bell, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { daysUntilExpiry, formatCurrency, formatDate } from "@/lib/utils";

type ExpiringMember = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  expiryDate: string;
  plan: { name: string; feeAmount: string | number };
};

export function ExpiringPlansWidget({
  members: initial,
}: {
  members: ExpiringMember[];
}) {
  const [members, setMembers] = useState(initial);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function sendAlert(member: ExpiringMember) {
    setLoadingId(member.id);
    try {
      const days = daysUntilExpiry(member.expiryDate);
      const payload = {
        memberId: member.id,
        type: "EXPIRING" as const,
        title: "Membership renewal reminder",
        message: `Hi ${member.fullName}, your ${member.plan.name} plan at Optimus Fitness expires in ${days} day(s) on ${formatDate(member.expiryDate)}. Renew to keep training.`,
      };

      const [smsRes, emailRes] = await Promise.all([
        fetch("/api/notifications", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, channel: "SMS" }),
        }),
        fetch("/api/notifications", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, channel: "EMAIL" }),
        }),
      ]);

      const smsJson = await smsRes.json();
      const emailJson = await emailRes.json();

      if (smsJson.delivery?.sent) {
        toast.success(`SMS reminder sent to ${member.phone}`);
      } else if (smsJson.delivery?.skipped) {
        toast.message("SMS skipped — set TWILIO_AUTH_TOKEN in env");
      } else if (smsJson.delivery?.error) {
        toast.error(`SMS failed: ${smsJson.delivery.error}`);
      }

      if (emailJson.delivery?.sent) {
        toast.success(`Email reminder sent to ${member.email}`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send renewal alert");
    } finally {
      setLoadingId(null);
    }
  }

  async function renewPlan(member: ExpiringMember) {
    setLoadingId(member.id);
    try {
      const res = await fetch(`/api/members/${member.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "renew" }),
      });
      if (!res.ok) throw new Error("Failed to renew");
      setMembers((prev) => prev.filter((m) => m.id !== member.id));
      toast.success(`${member.fullName}'s plan renewed`);
    } catch {
      toast.error("Could not renew plan");
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-warning" />
          Expiring Soon
        </CardTitle>
        <CardDescription>Memberships ending within the next 7 days</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {members.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No plans expiring in the next week.
          </p>
        ) : (
          members.map((member) => {
            const days = daysUntilExpiry(member.expiryDate);
            return (
              <div
                key={member.id}
                className="rounded-lg border border-border/70 bg-secondary/30 p-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{member.fullName}</p>
                    <p className="text-xs text-muted-foreground">
                      {member.plan.name} · {formatCurrency(Number(member.plan.feeAmount))}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Expires {formatDate(member.expiryDate)}
                    </p>
                  </div>
                  <Badge variant="warning">{days} day{days === 1 ? "" : "s"} left</Badge>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={loadingId === member.id}
                    onClick={() => sendAlert(member)}
                  >
                    <Bell className="h-3.5 w-3.5" />
                    Send SMS / Email Alert
                  </Button>
                  <Button
                    size="sm"
                    disabled={loadingId === member.id}
                    onClick={() => renewPlan(member)}
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Renew Plan
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}

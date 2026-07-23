"use client";

import { useEffect, useState } from "react";
import { Bell, Mail, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime } from "@/lib/utils";

type Notification = {
  id: string;
  type: string;
  channel: string;
  title: string;
  message: string;
  sent: boolean;
  sentAt: string | null;
  createdAt: string;
  member: { id: string; fullName: string; email: string; phone: string } | null;
};

type Member = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  paymentStatus: string;
  expiryDate: string;
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unpaid, setUnpaid] = useState<Member[]>([]);
  const [expiring, setExpiring] = useState<Member[]>([]);
  const [busy, setBusy] = useState(false);

  async function load() {
    const [nRes, uRes, eRes] = await Promise.all([
      fetch("/api/notifications"),
      fetch("/api/members?paymentStatus=PENDING&pageSize=20"),
      fetch("/api/members?expiringSoon=true&pageSize=20"),
    ]);
    setNotifications(await nRes.json());
    const unpaidJson = await uRes.json();
    const expiringJson = await eRes.json();
    setUnpaid(unpaidJson.data ?? []);
    setExpiring(expiringJson.data ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  async function sendReminder(
    member: Member,
    type: "UNPAID" | "EXPIRING",
    channel: "EMAIL" | "SMS"
  ) {
    setBusy(true);
    try {
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberId: member.id,
          type,
          channel,
          title: type === "UNPAID" ? "Payment reminder" : "Renewal reminder",
          message:
            type === "UNPAID"
              ? `Hi ${member.fullName}, your membership payment is still pending. Please settle to avoid interruption.`
              : `Hi ${member.fullName}, your membership is expiring soon. Renew today to keep your access.`,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success(`${channel} reminder queued for ${member.fullName}`);
      await load();
    } catch {
      toast.error("Could not send reminder");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Notifications</h1>
        <p className="text-sm text-muted-foreground">
          Trigger email/SMS reminders for unpaid or expiring memberships
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-warning" />
              Unpaid Memberships
            </CardTitle>
            <CardDescription>Send payment reminders</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {unpaid.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">All caught up</p>
            ) : (
              unpaid.map((m) => (
                <div
                  key={m.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/70 p-3"
                >
                  <div>
                    <p className="font-medium">{m.fullName}</p>
                    <p className="text-xs text-muted-foreground">{m.email}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() => sendReminder(m, "UNPAID", "EMAIL")}
                    >
                      Email
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() => sendReminder(m, "UNPAID", "SMS")}
                    >
                      SMS
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-warning" />
              Expiring Soon
            </CardTitle>
            <CardDescription>Send renewal reminders</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {expiring.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">None expiring soon</p>
            ) : (
              expiring.map((m) => (
                <div
                  key={m.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/70 p-3"
                >
                  <div>
                    <p className="font-medium">{m.fullName}</p>
                    <p className="text-xs text-muted-foreground">{m.phone}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() => sendReminder(m, "EXPIRING", "EMAIL")}
                    >
                      Email
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() => sendReminder(m, "EXPIRING", "SMS")}
                    >
                      SMS
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Delivery Log
          </CardTitle>
          <CardDescription>Simulated outbound alerts</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {notifications.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No notifications yet</p>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                className="rounded-lg border border-border/60 px-3 py-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium">{n.title}</p>
                  <div className="flex gap-2">
                    <Badge variant="secondary">{n.channel}</Badge>
                    <Badge variant={n.sent ? "success" : "warning"}>
                      {n.sent ? "Sent" : "Queued"}
                    </Badge>
                  </div>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{n.message}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {n.member?.fullName ?? "—"} · {formatDateTime(n.sentAt || n.createdAt)}
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

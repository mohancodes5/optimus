"use client";

import { useCallback, useEffect, useState } from "react";
import { QrCode, Search, CheckCircle2, LogOut } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils";
import { QrScanner } from "@/components/check-in/qr-scanner";

type MemberHit = {
  id: string;
  memberCode: string;
  fullName: string;
  email: string;
  phone: string;
  status: string;
  plan?: { name: string };
};

type Attendance = {
  id: string;
  checkedInAt: string;
  checkedOutAt: string | null;
  member: { id: string; fullName: string; email: string; phone: string };
};

export function CheckInPanel() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<MemberHit[]>([]);
  const [today, setToday] = useState<Attendance[]>([]);
  const [qrOpen, setQrOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const loadToday = useCallback(async () => {
    const res = await fetch("/api/attendance?today=true");
    setToday(await res.json());
  }, []);

  useEffect(() => {
    loadToday();
  }, [loadToday]);

  useEffect(() => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      const res = await fetch(`/api/members?q=${encodeURIComponent(q)}&pageSize=8`);
      const json = await res.json();
      setResults(json.data ?? []);
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  function openSessionFor(memberId: string) {
    return today.find((a) => a.member.id === memberId && !a.checkedOutAt);
  }

  async function scanMember(payload: {
    memberId?: string;
    memberCode?: string;
    action?: "auto" | "checkin" | "checkout";
    nameHint?: string;
  }) {
    setLoading(true);
    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberId: payload.memberId,
          memberCode: payload.memberCode,
          action: payload.action ?? "auto",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Attendance failed");

      const name = data.attendance?.member?.fullName ?? payload.nameHint ?? "Member";
      if (data.action === "checkout") {
        toast.success(`${name} checked out`);
      } else {
        toast.success(`${name} checked in`);
      }
      setQ("");
      setResults([]);
      await loadToday();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Attendance failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Check-In</h1>
          <p className="text-sm text-muted-foreground">
            First scan checks in · next scan checks out
          </p>
        </div>
        <Button variant="outline" onClick={() => setQrOpen(true)}>
          <QrCode className="h-4 w-4" />
          QR Scanner
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Search</CardTitle>
          <CardDescription>Find a member by name, email, phone, or member code</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Start typing to find a member..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            {results.map((m) => {
              const open = openSessionFor(m.id);
              const canAttend = m.status === "ACTIVE";
              return (
                <div
                  key={m.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/70 bg-secondary/30 p-3"
                >
                  <div>
                    <p className="font-medium">{m.fullName}</p>
                    <p className="text-xs text-muted-foreground">
                      {m.memberCode} · {m.email} · {m.phone}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={m.status === "ACTIVE" ? "success" : "danger"}>{m.status}</Badge>
                    {open ? (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={loading || !canAttend}
                        onClick={() =>
                          scanMember({ memberId: m.id, action: "checkout", nameHint: m.fullName })
                        }
                      >
                        <LogOut className="h-3.5 w-3.5" />
                        Check Out
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        disabled={loading || !canAttend}
                        onClick={() =>
                          scanMember({ memberId: m.id, action: "checkin", nameHint: m.fullName })
                        }
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Check In
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Today&apos;s Attendance</CardTitle>
          <CardDescription>
            {today.length} session{today.length === 1 ? "" : "s"} recorded
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {today.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No check-ins yet today</p>
          ) : (
            today.map((a) => (
              <div
                key={a.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 px-3 py-2"
              >
                <div>
                  <p className="font-medium">{a.member.fullName}</p>
                  <p className="text-xs text-muted-foreground">{a.member.email}</p>
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  <p>In {formatDateTime(a.checkedInAt)}</p>
                  <p>
                    {a.checkedOutAt
                      ? `Out ${formatDateTime(a.checkedOutAt)}`
                      : "Still in gym"}
                  </p>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>QR Scanner</DialogTitle>
            <DialogDescription>
              Point the camera at a member QR. First scan = check-in, next scan = check-out.
            </DialogDescription>
          </DialogHeader>
          {qrOpen ? (
            <QrScanner
              active={qrOpen && !loading}
              onScan={async (code) => {
                await scanMember({ memberCode: code });
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

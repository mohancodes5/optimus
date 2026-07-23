"use client";

import { useEffect, useState } from "react";
import { QrCode, Search, CheckCircle2 } from "lucide-react";
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

type MemberHit = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  status: string;
  plan?: { name: string };
};

type Attendance = {
  id: string;
  checkedInAt: string;
  member: { id: string; fullName: string; email: string; phone: string };
};

export function CheckInPanel() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<MemberHit[]>([]);
  const [today, setToday] = useState<Attendance[]>([]);
  const [qrOpen, setQrOpen] = useState(false);
  const [qrCode, setQrCode] = useState("");
  const [loading, setLoading] = useState(false);

  async function loadToday() {
    const res = await fetch("/api/attendance?today=true");
    setToday(await res.json());
  }

  useEffect(() => {
    loadToday();
  }, []);

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

  async function checkIn(memberId: string, name: string) {
    setLoading(true);
    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Check-in failed");
      toast.success(`${name} checked in`);
      setQ("");
      setResults([]);
      setQrOpen(false);
      setQrCode("");
      await loadToday();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Check-in failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleQrSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Simulated QR payload: member email or id
    const code = qrCode.trim();
    if (!code) return;
    const res = await fetch(`/api/members?q=${encodeURIComponent(code)}&pageSize=1`);
    const json = await res.json();
    const member = json.data?.[0];
    if (!member) {
      toast.error("No member found for that code");
      return;
    }
    await checkIn(member.id, member.fullName);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Check-In</h1>
          <p className="text-sm text-muted-foreground">
            Mark attendance with search or QR code
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
          <CardDescription>Find a member by name, email, or phone</CardDescription>
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
            {results.map((m) => (
              <div
                key={m.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/70 bg-secondary/30 p-3"
              >
                <div>
                  <p className="font-medium">{m.fullName}</p>
                  <p className="text-xs text-muted-foreground">
                    {m.email} · {m.phone}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={m.status === "ACTIVE" ? "success" : "danger"}>{m.status}</Badge>
                  <Button size="sm" disabled={loading} onClick={() => checkIn(m.id, m.fullName)}>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Check In
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Today&apos;s Attendance</CardTitle>
          <CardDescription>{today.length} check-ins recorded</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {today.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No check-ins yet today</p>
          ) : (
            today.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2"
              >
                <div>
                  <p className="font-medium">{a.member.fullName}</p>
                  <p className="text-xs text-muted-foreground">{a.member.email}</p>
                </div>
                <p className="text-xs text-muted-foreground">{formatDateTime(a.checkedInAt)}</p>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>QR / Member Code</DialogTitle>
            <DialogDescription>
              Simulate a scanner by entering a member email, phone, or name.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleQrSubmit} className="space-y-4">
            <div className="flex aspect-square items-center justify-center rounded-xl border border-dashed border-border bg-secondary/40">
              <div className="text-center">
                <QrCode className="mx-auto mb-2 h-12 w-12 text-primary" />
                <p className="text-sm text-muted-foreground">Camera simulator ready</p>
              </div>
            </div>
            <Input
              placeholder="Scan or type member code..."
              value={qrCode}
              onChange={(e) => setQrCode(e.target.value)}
              autoFocus
            />
            <Button type="submit" className="w-full" disabled={loading}>
              Confirm Check-In
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

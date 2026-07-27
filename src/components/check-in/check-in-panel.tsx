"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import QRCode from "react-qr-code";
import { format } from "date-fns";
import {
  Search,
  CheckCircle2,
  LogOut,
  Download,
  RefreshCw,
  ScanLine,
  ExternalLink,
} from "lucide-react";
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
import { APP_NAME } from "@/lib/brand";
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
  member: {
    id: string;
    fullName: string;
    email: string;
    phone: string;
    memberCode?: string;
  };
};

export function CheckInPanel() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<MemberHit[]>([]);
  const [today, setToday] = useState<Attendance[]>([]);
  const [staffScanOpen, setStaffScanOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [origin, setOrigin] = useState("");

  const gateUrl = useMemo(() => (origin ? `${origin}/gate` : "/gate"), [origin]);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const loadToday = useCallback(async () => {
    const res = await fetch("/api/attendance?today=true");
    setToday(await res.json());
  }, []);

  useEffect(() => {
    loadToday();
    const id = setInterval(loadToday, 15000);
    return () => clearInterval(id);
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
      toast.success(data.action === "checkout" ? `${name} checked out` : `${name} checked in`);
      setQ("");
      setResults([]);
      await loadToday();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Attendance failed");
    } finally {
      setLoading(false);
    }
  }

  async function exportAttendance() {
    setExporting(true);
    try {
      const date = format(new Date(), "yyyy-MM-dd");
      const res = await fetch(`/api/attendance?date=${date}&export=true`);
      const rows: Attendance[] = await res.json();
      if (!Array.isArray(rows) || rows.length === 0) {
        toast.error("No attendance to export for today");
        return;
      }

      const escape = (v: string | number | null | undefined) => {
        const s = String(v ?? "");
        if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
        return s;
      };

      const header = [
        "Member Code",
        "Full Name",
        "Email",
        "Phone",
        "Checked In",
        "Checked Out",
        "Status",
      ];
      const lines = [
        header.join(","),
        ...rows.map((a) =>
          [
            a.member.memberCode ?? "",
            a.member.fullName,
            a.member.email,
            a.member.phone,
            formatDateTime(a.checkedInAt),
            a.checkedOutAt ? formatDateTime(a.checkedOutAt) : "Still in gym",
            a.checkedOutAt ? "Completed" : "In gym",
          ]
            .map(escape)
            .join(",")
        ),
      ];

      const blob = new Blob(["\uFEFF" + lines.join("\n")], {
        type: "application/vnd.ms-excel;charset=utf-8;",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `attendance-${date}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${rows.length} records`);
    } catch {
      toast.error("Export failed");
    } finally {
      setExporting(false);
    }
  }

  const inGymCount = today.filter((a) => !a.checkedOutAt).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Check-In</h1>
          <p className="text-sm text-muted-foreground">
            Members scan the gym QR on their phone, then check in or check out
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => loadToday()}>
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
          <Button variant="outline" disabled={exporting} onClick={exportAttendance}>
            <Download className="h-4 w-4" />
            {exporting ? "Exporting..." : "Export Excel"}
          </Button>
          <Button variant="outline" onClick={() => setStaffScanOpen(true)}>
            <ScanLine className="h-4 w-4" />
            Staff scanner
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-primary/20 shadow-sm shadow-primary/10">
          <CardHeader>
            <CardTitle>Gym check-in QR</CardTitle>
            <CardDescription>
              Display this on a screen or print it. Members open the camera on their phone, scan,
              enter their member code, then tap Check In.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
              {origin ? (
                <QRCode value={gateUrl} size={220} />
              ) : (
                <div className="flex h-[220px] w-[220px] items-center justify-center text-sm text-muted-foreground">
                  Loading QR...
                </div>
              )}
            </div>
            <div className="w-full space-y-2 text-center">
              <p className="text-sm font-medium text-foreground">{APP_NAME} Gate</p>
              <p className="break-all font-mono text-xs text-muted-foreground">{gateUrl}</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-1"
                onClick={() => window.open(gateUrl, "_blank", "noopener,noreferrer")}
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Open member page
              </Button>
            </div>
            <ol className="w-full list-decimal space-y-1 rounded-xl bg-secondary/50 p-4 pl-8 text-sm text-muted-foreground">
              <li>Member scans this QR with their phone camera</li>
              <li>They enter member code (e.g. OPT-A1B2C3) or phone</li>
              <li>First visit today → Check In · later → Check Out</li>
            </ol>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Front desk search</CardTitle>
            <CardDescription>
              Manual check-in if a member cannot use the QR flow
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search name, email, phone, or code..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            <div className="max-h-[360px] space-y-2 overflow-y-auto">
              {results.length === 0 && q.trim() ? (
                <p className="py-6 text-center text-sm text-muted-foreground">No members found</p>
              ) : null}
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
                        {m.memberCode} · {m.phone}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={m.status === "ACTIVE" ? "success" : "danger"}>
                        {m.status}
                      </Badge>
                      {open ? (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={loading || !canAttend}
                          onClick={() =>
                            scanMember({
                              memberId: m.id,
                              action: "checkout",
                              nameHint: m.fullName,
                            })
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
                            scanMember({
                              memberId: m.id,
                              action: "checkin",
                              nameHint: m.fullName,
                            })
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
      </div>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle>Today&apos;s Attendance</CardTitle>
            <CardDescription>
              {today.length} session{today.length === 1 ? "" : "s"} · {inGymCount} currently in gym
            </CardDescription>
          </div>
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
                  <p className="text-xs text-muted-foreground">
                    {a.member.memberCode ? `${a.member.memberCode} · ` : ""}
                    {a.member.phone || a.member.email}
                  </p>
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  <p>In {formatDateTime(a.checkedInAt)}</p>
                  <p className={a.checkedOutAt ? "" : "font-medium text-success"}>
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

      <Dialog open={staffScanOpen} onOpenChange={setStaffScanOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Staff QR scanner</DialogTitle>
            <DialogDescription>
              Optional: scan a member&apos;s personal QR from their profile card.
            </DialogDescription>
          </DialogHeader>
          {staffScanOpen ? (
            <QrScanner
              active={staffScanOpen && !loading}
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

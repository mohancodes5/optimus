"use client";

import { useState } from "react";
import { CheckCircle2, LogOut, Dumbbell, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { APP_NAME } from "@/lib/brand";
import { formatDateTime } from "@/lib/utils";

type GateMember = {
  id: string;
  fullName: string;
  memberCode: string;
  status: string;
  planName: string;
  phoneHint: string;
};

export function GateCheckIn() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [member, setMember] = useState<GateMember | null>(null);
  const [nextAction, setNextAction] = useState<"checkin" | "checkout">("checkin");
  const [checkedInAt, setCheckedInAt] = useState<string | null>(null);
  const [doneMessage, setDoneMessage] = useState("");

  async function lookup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setDoneMessage("");
    try {
      const res = await fetch("/api/gate/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lookup failed");
      setMember(data.member);
      setNextAction(data.nextAction);
      setCheckedInAt(data.checkedInAt);
    } catch (err) {
      setMember(null);
      toast.error(err instanceof Error ? err.message : "Lookup failed");
    } finally {
      setLoading(false);
    }
  }

  async function confirmAction(action: "checkin" | "checkout") {
    if (!member) return;
    setLoading(true);
    try {
      const res = await fetch("/api/gate/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: member.memberCode, action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setDoneMessage(data.message);
      toast.success(data.message);
      setMember(null);
      setCode("");
      setCheckedInAt(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setMember(null);
    setDoneMessage("");
    setCode("");
    setCheckedInAt(null);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-secondary to-background px-4 py-10">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-sky text-white shadow-lg shadow-primary/30">
            <Dumbbell className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{APP_NAME}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Member self check-in</p>
        </div>

        <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xl shadow-primary/5">
          {doneMessage ? (
            <div className="space-y-4 text-center">
              <CheckCircle2 className="mx-auto h-12 w-12 text-success" />
              <p className="text-lg font-semibold text-foreground">{doneMessage}</p>
              <Button className="w-full" onClick={reset}>
                Done — next member
              </Button>
            </div>
          ) : !member ? (
            <form onSubmit={lookup} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code">Member code or phone</Label>
                <Input
                  id="code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="e.g. OPT-A1B2C3 or your phone"
                  autoFocus
                  autoComplete="off"
                  className="h-12 text-base"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Find your code on your member profile or membership card.
                </p>
              </div>
              <Button type="submit" className="h-11 w-full" disabled={loading || !code.trim()}>
                {loading ? "Checking..." : "Continue"}
              </Button>
            </form>
          ) : (
            <div className="space-y-5">
              <button
                type="button"
                onClick={reset}
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Different member
              </button>

              <div className="rounded-xl border border-border/70 bg-secondary/40 p-4 text-center">
                <p className="text-xl font-semibold text-foreground">{member.fullName}</p>
                <p className="mt-1 font-mono text-sm text-muted-foreground">{member.memberCode}</p>
                <p className="mt-1 text-xs text-muted-foreground">{member.planName}</p>
                <div className="mt-3 flex justify-center">
                  <Badge variant={member.status === "ACTIVE" ? "success" : "danger"}>
                    {member.status}
                  </Badge>
                </div>
                {checkedInAt ? (
                  <p className="mt-3 text-xs text-muted-foreground">
                    Checked in at {formatDateTime(checkedInAt)}
                  </p>
                ) : null}
              </div>

              {nextAction === "checkout" ? (
                <Button
                  variant="outline"
                  className="h-14 w-full text-base"
                  disabled={loading}
                  onClick={() => confirmAction("checkout")}
                >
                  <LogOut className="h-5 w-5" />
                  Check Out
                </Button>
              ) : (
                <Button
                  className="h-14 w-full text-base"
                  disabled={loading}
                  onClick={() => confirmAction("checkin")}
                >
                  <CheckCircle2 className="h-5 w-5" />
                  Check In
                </Button>
              )}
            </div>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Need help? Ask the front desk.
        </p>
      </div>
    </div>
  );
}

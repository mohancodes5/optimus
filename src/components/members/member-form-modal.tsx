"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { calcExpiryDate, formatCurrency, formatDate } from "@/lib/utils";

type Plan = {
  id: string;
  name: string;
  durationDays: number;
  feeAmount: string | number;
  isActive: boolean;
};

type MemberFormValues = {
  id?: string;
  fullName: string;
  email: string;
  phone: string;
  gender: "MALE" | "FEMALE" | "OTHER";
  emergencyContact: string;
  planId: string;
  startDate: string;
  paymentStatus: "PAID" | "PENDING";
  notes: string;
};

const empty: MemberFormValues = {
  fullName: "",
  email: "",
  phone: "",
  gender: "MALE",
  emergencyContact: "",
  planId: "",
  startDate: new Date().toISOString().slice(0, 10),
  paymentStatus: "PENDING",
  notes: "",
};

export function MemberFormModal({
  open,
  onOpenChange,
  plans,
  initial,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plans: Plan[];
  initial?: (Partial<MemberFormValues> & { emergencyContact?: string | null; notes?: string | null }) | null;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<MemberFormValues>(empty);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm({
        ...empty,
        ...initial,
        emergencyContact: initial?.emergencyContact ?? "",
        notes: initial?.notes ?? "",
      });
    }
  }, [open, initial]);

  const selectedPlan = useMemo(
    () => plans.find((p) => p.id === form.planId),
    [plans, form.planId]
  );

  const expiryPreview = useMemo(() => {
    if (!selectedPlan || !form.startDate) return null;
    return calcExpiryDate(new Date(form.startDate), selectedPlan.durationDays);
  }, [selectedPlan, form.startDate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const url = form.id ? `/api/members/${form.id}` : "/api/members";
      const method = form.id ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.formErrors?.[0] || data.error || "Save failed");
      }
      toast.success(form.id ? "Member updated" : "Member added");
      onOpenChange(false);
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save member");
    } finally {
      setSaving(false);
    }
  }

  const activePlans = plans.filter((p) => p.isActive || p.id === form.planId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{form.id ? "Edit Member" : "Add Member"}</DialogTitle>
          <DialogDescription>
            Capture personal details, assign a plan, and set payment status.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                required
                value={form.fullName}
                onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                required
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Gender</Label>
              <Select
                value={form.gender}
                onValueChange={(v: MemberFormValues["gender"]) =>
                  setForm((f) => ({ ...f, gender: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MALE">Male</SelectItem>
                  <SelectItem value="FEMALE">Female</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="emergency">Emergency Contact</Label>
              <Input
                id="emergency"
                value={form.emergencyContact}
                onChange={(e) =>
                  setForm((f) => ({ ...f, emergencyContact: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Membership Plan</Label>
              <Select
                value={form.planId}
                onValueChange={(v) => setForm((f) => ({ ...f, planId: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a plan" />
                </SelectTrigger>
                <SelectContent>
                  {activePlans.map((plan) => (
                    <SelectItem key={plan.id} value={plan.id}>
                      {plan.name} · {formatCurrency(Number(plan.feeAmount))} ·{" "}
                      {plan.durationDays}d
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedPlan ? (
                <p className="text-xs text-muted-foreground">
                  Duration {selectedPlan.durationDays} days · Fee{" "}
                  {formatCurrency(Number(selectedPlan.feeAmount))}
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                required
                value={form.startDate}
                onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Expiry (auto)</Label>
              <Input
                readOnly
                value={expiryPreview ? formatDate(expiryPreview) : "Select plan & start"}
              />
            </div>
            <div className="space-y-2">
              <Label>Payment Status</Label>
              <Select
                value={form.paymentStatus}
                onValueChange={(v: "PAID" | "PENDING") =>
                  setForm((f) => ({ ...f, paymentStatus: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PAID">Paid</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !form.planId}>
              {saving ? "Saving..." : form.id ? "Save Changes" : "Add Member"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

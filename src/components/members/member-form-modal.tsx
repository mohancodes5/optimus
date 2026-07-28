"use client";

import { useEffect, useMemo, useState, type ComponentType, type ReactNode } from "react";
import { toast } from "sonner";
import { UserRound, MapPin, CreditCard, StickyNote } from "lucide-react";
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
import { calcExpiryDate, cn, formatCurrency, formatDate } from "@/lib/utils";
import {
  PLAN_CATEGORIES,
  PLAN_CATEGORY_LABELS,
  packageLabelForDays,
  type PlanCategoryValue,
} from "@/lib/plans";

type Plan = {
  id: string;
  name: string;
  category: PlanCategoryValue;
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
  address: string;
  emergencyContact: string;
  partnerName: string;
  planId: string;
  startDate: string;
  paymentStatus: "PAID" | "PENDING";
  status: "ACTIVE" | "EXPIRED" | "SUSPENDED";
  notes: string;
};

const empty: MemberFormValues = {
  fullName: "",
  email: "",
  phone: "",
  gender: "MALE",
  address: "",
  emergencyContact: "",
  partnerName: "",
  planId: "",
  startDate: new Date().toISOString().slice(0, 10),
  paymentStatus: "PENDING",
  status: "ACTIVE",
  notes: "",
};

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3 rounded-xl border border-border/70 bg-secondary/30 p-4">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">{children}</div>
    </section>
  );
}

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
  initial?: (Partial<MemberFormValues> & {
    address?: string | null;
    emergencyContact?: string | null;
    partnerName?: string | null;
    notes?: string | null;
  }) | null;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<MemberFormValues>(empty);
  const [category, setCategory] = useState<PlanCategoryValue | "">("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;

    const nextForm: MemberFormValues = {
      ...empty,
      ...initial,
      address: initial?.address ?? "",
      emergencyContact: initial?.emergencyContact ?? "",
      partnerName: initial?.partnerName ?? "",
      notes: initial?.notes ?? "",
    };
    setForm(nextForm);

    const matched = plans.find((p) => p.id === nextForm.planId);
    setCategory(matched?.category ?? "");
  }, [open, initial, plans]);

  const selectedPlan = useMemo(
    () => plans.find((p) => p.id === form.planId),
    [plans, form.planId]
  );

  const packageOptions = useMemo(() => {
    if (!category) return [];
    return plans
      .filter(
        (p) =>
          String(p.category).toUpperCase() === category &&
          (p.isActive || p.id === form.planId)
      )
      .sort((a, b) => a.durationDays - b.durationDays);
  }, [plans, category, form.planId]);

  const expiryPreview = useMemo(() => {
    if (!selectedPlan || !form.startDate) return null;
    return calcExpiryDate(new Date(form.startDate), selectedPlan.durationDays);
  }, [selectedPlan, form.startDate]);

  function handleCategoryChange(next: PlanCategoryValue) {
    setCategory(next);
    setForm((f) => ({
      ...f,
      planId: "",
      partnerName: next === "COUPLES" ? f.partnerName : "",
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.planId) {
      toast.error("Select a plan category and package");
      return;
    }
    if (category === "COUPLES" && !form.partnerName.trim()) {
      toast.error("Enter the partner name for the couples package");
      return;
    }
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
      toast.success(form.id ? "Member updated" : "Member registered");
      onOpenChange(false);
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save member");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-xl">
            {form.id ? "Edit Member" : "Register New Member"}
          </DialogTitle>
          <DialogDescription>
            Choose Men / Women / Couples, then select a package (1 / 3 / 6 months or 1 year).
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Section icon={UserRound} title="Personal details">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="fullName">Full name *</Label>
              <Input
                id="fullName"
                required
                placeholder="Member full name"
                value={form.fullName}
                onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                required
                placeholder="name@email.com"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone (WhatsApp / SMS) *</Label>
              <Input
                id="phone"
                required
                placeholder="+919876543210 or 9876543210"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Gender *</Label>
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
              <Label htmlFor="emergency">Emergency contact</Label>
              <Input
                id="emergency"
                placeholder="Name or phone"
                value={form.emergencyContact}
                onChange={(e) =>
                  setForm((f) => ({ ...f, emergencyContact: e.target.value }))
                }
              />
            </div>
          </Section>

          <Section icon={MapPin} title="Address">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="address">Residential address *</Label>
              <Textarea
                id="address"
                required
                rows={3}
                placeholder="House / street, area, city, state, PIN"
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                className="min-h-[88px] resize-y"
              />
            </div>
          </Section>

          <Section icon={CreditCard} title="Membership">
            <div className="space-y-3 sm:col-span-2">
              <Label>Member category *</Label>
              <p className="text-xs text-muted-foreground">
                Choose Men, Women, or Couples — then pick a package below.
              </p>
              <div
                className="grid gap-2 sm:grid-cols-3"
                role="radiogroup"
                aria-label="Member category"
              >
                {PLAN_CATEGORIES.map((value) => {
                  const selected = category === value;
                  return (
                    <label
                      key={value}
                      className={cn(
                        "flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-3 text-sm transition-colors",
                        selected
                          ? "border-primary bg-primary/10 text-foreground ring-1 ring-primary/30"
                          : "border-border/80 bg-background hover:bg-secondary/50"
                      )}
                    >
                      <input
                        type="radio"
                        name="planCategory"
                        value={value}
                        checked={selected}
                        onChange={() => handleCategoryChange(value)}
                        className="h-4 w-4 accent-primary"
                      />
                      <span className="font-medium">{PLAN_CATEGORY_LABELS[value]}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {category ? (
              <div className="space-y-3 sm:col-span-2">
                <Label>Package plan *</Label>
                {packageOptions.length === 0 ? (
                  <p className="text-sm text-destructive">
                    No active packages for {PLAN_CATEGORY_LABELS[category]}. Add them under Plans.
                  </p>
                ) : (
                  <div
                    className="grid gap-2 sm:grid-cols-2"
                    role="radiogroup"
                    aria-label="Package plan"
                  >
                    {packageOptions.map((plan) => {
                      const selected = form.planId === plan.id;
                      return (
                        <label
                          key={plan.id}
                          className={cn(
                            "flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-3 text-sm transition-colors",
                            selected
                              ? "border-primary bg-primary/10 text-foreground ring-1 ring-primary/30"
                              : "border-border/80 bg-background hover:bg-secondary/50"
                          )}
                        >
                          <input
                            type="radio"
                            name="planPackage"
                            value={plan.id}
                            checked={selected}
                            onChange={() => setForm((f) => ({ ...f, planId: plan.id }))}
                            className="mt-0.5 h-4 w-4 accent-primary"
                          />
                          <span className="min-w-0">
                            <span className="block font-medium">
                              {packageLabelForDays(plan.durationDays)}
                            </span>
                            <span className="block text-xs text-muted-foreground">
                              {formatCurrency(Number(plan.feeAmount))} · {plan.durationDays} days
                            </span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
                {selectedPlan ? (
                  <p className="text-xs text-muted-foreground">
                    Selected: {PLAN_CATEGORY_LABELS[selectedPlan.category]} ·{" "}
                    {packageLabelForDays(selectedPlan.durationDays)} ·{" "}
                    {formatCurrency(Number(selectedPlan.feeAmount))}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Select one package for {PLAN_CATEGORY_LABELS[category]}.
                  </p>
                )}
              </div>
            ) : (
              <div className="sm:col-span-2 rounded-xl border border-dashed border-border/80 bg-background/60 px-3 py-4 text-center text-sm text-muted-foreground">
                Package plans will appear here after you choose a member category.
              </div>
            )}

            {category === "COUPLES" ? (
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="partnerName">Partner name *</Label>
                <Input
                  id="partnerName"
                  required
                  placeholder="Enter partner / spouse full name"
                  value={form.partnerName}
                  onChange={(e) => setForm((f) => ({ ...f, partnerName: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">
                  Required for couples membership packages.
                </p>
              </div>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="startDate">Start date *</Label>
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
                className="bg-muted/40"
                value={expiryPreview ? formatDate(expiryPreview) : "Select package & start"}
              />
            </div>
            <div className="space-y-2">
              <Label>Payment status</Label>
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
            <div className="space-y-2">
              <Label>Membership status</Label>
              <Select
                value={form.status}
                onValueChange={(v: MemberFormValues["status"]) =>
                  setForm((f) => ({ ...f, status: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="EXPIRED">Expired</SelectItem>
                  <SelectItem value="SUSPENDED">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </Section>

          <Section icon={StickyNote} title="Notes">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="notes">Internal notes</Label>
              <Textarea
                id="notes"
                rows={2}
                placeholder="Optional notes for staff"
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>
          </Section>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                saving ||
                !form.planId ||
                !form.address.trim() ||
                (category === "COUPLES" && !form.partnerName.trim())
              }
            >
              {saving ? "Saving..." : form.id ? "Save Changes" : "Register Member"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

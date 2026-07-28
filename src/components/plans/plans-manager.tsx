"use client";

import { useMemo, useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils";
import {
  PLAN_CATEGORIES,
  PLAN_CATEGORY_LABELS,
  packageLabelForDays,
  type PlanCategoryValue,
} from "@/lib/plans";

type Plan = {
  id: string;
  name: string;
  description: string | null;
  category: PlanCategoryValue;
  durationDays: number;
  feeAmount: string | number;
  perks: string[];
  isActive: boolean;
  _count?: { members: number };
};

type FormState = {
  id?: string;
  name: string;
  description: string;
  category: PlanCategoryValue;
  durationDays: string;
  feeAmount: string;
  perks: string;
  isActive: boolean;
};

const empty: FormState = {
  name: "",
  description: "",
  category: "MEN",
  durationDays: "30",
  feeAmount: "999",
  perks: "",
  isActive: true,
};

export function PlansManager({
  initialPlans,
  canManage,
}: {
  initialPlans: Plan[];
  canManage: boolean;
}) {
  const [plans, setPlans] = useState(initialPlans);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(empty);
  const [saving, setSaving] = useState(false);

  const grouped = useMemo(() => {
    return PLAN_CATEGORIES.map((category) => ({
      category,
      label: PLAN_CATEGORY_LABELS[category],
      items: plans
        .filter((p) => p.category === category)
        .sort((a, b) => a.durationDays - b.durationDays),
    }));
  }, [plans]);

  async function refresh() {
    const res = await fetch("/api/plans");
    setPlans(await res.json());
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        description: form.description || null,
        category: form.category,
        durationDays: Number(form.durationDays),
        feeAmount: Number(form.feeAmount),
        perks: form.perks
          .split(",")
          .map((p) => p.trim())
          .filter(Boolean),
        isActive: form.isActive,
      };
      const res = await fetch(form.id ? `/api/plans/${form.id}` : "/api/plans", {
        method: form.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed");
      }
      toast.success(form.id ? "Plan updated" : "Plan created");
      setOpen(false);
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save plan");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete or deactivate this plan?")) return;
    const res = await fetch(`/api/plans/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      toast.error("Could not delete plan");
      return;
    }
    toast.success(data.message || "Plan removed");
    await refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Membership Plans</h1>
          <p className="text-sm text-muted-foreground">
            Men&apos;s, Women&apos;s, and Couples packages — 1 / 3 / 6 months and 1 year
          </p>
        </div>
        {canManage ? (
          <Button
            onClick={() => {
              setForm(empty);
              setOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            New Plan
          </Button>
        ) : null}
      </div>

      {grouped.map((group) => (
        <section key={group.category} className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {group.label}
          </h2>
          {group.items.length === 0 ? (
            <p className="text-sm text-muted-foreground">No packages in this category yet.</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {group.items.map((plan) => (
                <Card key={plan.id} className={!plan.isActive ? "opacity-60" : undefined}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <CardTitle className="text-base">
                          {packageLabelForDays(plan.durationDays)}
                        </CardTitle>
                        <CardDescription className="line-clamp-2">
                          {plan.description || plan.name}
                        </CardDescription>
                      </div>
                      <Badge variant={plan.isActive ? "success" : "neutral"}>
                        {plan.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="text-2xl font-semibold">
                        {formatCurrency(Number(plan.feeAmount))}
                      </p>
                      <p className="text-sm text-muted-foreground">{plan.durationDays} days</p>
                    </div>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      {(plan.perks ?? []).map((perk) => (
                        <li key={perk}>• {perk}</li>
                      ))}
                    </ul>
                    <p className="text-xs text-muted-foreground">
                      {plan._count?.members ?? 0} members assigned
                    </p>
                    {canManage ? (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setForm({
                              id: plan.id,
                              name: plan.name,
                              description: plan.description ?? "",
                              category: plan.category,
                              durationDays: String(plan.durationDays),
                              feeAmount: String(plan.feeAmount),
                              perks: (plan.perks ?? []).join(", "),
                              isActive: plan.isActive,
                            });
                            setOpen(true);
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Edit
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => remove(plan.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>
      ))}

      {/* Show any inactive legacy plans without a matching category grouping edge case */}
      {plans.some((p) => !PLAN_CATEGORIES.includes(p.category)) ? (
        <p className="text-xs text-muted-foreground">Some plans have an unknown category.</p>
      ) : null}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{form.id ? "Edit Plan" : "Create Plan"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={save} className="space-y-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={form.category}
                onValueChange={(v: PlanCategoryValue) =>
                  setForm((f) => ({ ...f, category: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PLAN_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {PLAN_CATEGORY_LABELS[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Men's - 3 Months"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Duration (days)</Label>
                <Select
                  value={form.durationDays}
                  onValueChange={(v) => setForm((f) => ({ ...f, durationDays: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">1 Month (30)</SelectItem>
                    <SelectItem value="90">3 Months (90)</SelectItem>
                    <SelectItem value="180">6 Months (180)</SelectItem>
                    <SelectItem value="365">1 Year (365)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Fee (₹)</Label>
                <Input
                  type="number"
                  min={0}
                  step="1"
                  required
                  value={form.feeAmount}
                  onChange={(e) => setForm((f) => ({ ...f, feeAmount: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Perks (comma-separated)</Label>
              <Input
                value={form.perks}
                onChange={(e) => setForm((f) => ({ ...f, perks: e.target.value }))}
                placeholder="Gym floor, Locker room, Classes"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save Plan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

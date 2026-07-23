"use client";

import { useState } from "react";
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
import { formatCurrency } from "@/lib/utils";

type Plan = {
  id: string;
  name: string;
  description: string | null;
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
  durationDays: string;
  feeAmount: string;
  perks: string;
  isActive: boolean;
};

const empty: FormState = {
  name: "",
  description: "",
  durationDays: "30",
  feeAmount: "49.99",
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
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Membership Plans</h1>
          <p className="text-sm text-muted-foreground">
            Pricing, duration, and included perks
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

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {plans.map((plan) => (
          <Card key={plan.id} className={!plan.isActive ? "opacity-60" : undefined}>
            <CardHeader>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <CardTitle>{plan.name}</CardTitle>
                  <CardDescription>{plan.description || "No description"}</CardDescription>
                </div>
                <Badge variant={plan.isActive ? "success" : "neutral"}>
                  {plan.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-2xl font-semibold">{formatCurrency(Number(plan.feeAmount))}</p>
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{form.id ? "Edit Plan" : "Create Plan"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={save} className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
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
                <Input
                  type="number"
                  min={1}
                  required
                  value={form.durationDays}
                  onChange={(e) => setForm((f) => ({ ...f, durationDays: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Fee</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
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
                placeholder="Gym floor, Sauna, Classes"
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

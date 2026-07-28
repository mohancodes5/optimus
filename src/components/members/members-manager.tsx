"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { format, subMonths } from "date-fns";
import { Plus, Search, Pencil, X, Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MemberFormModal } from "@/components/members/member-form-modal";
import { formatCurrency, formatDate, memberStatusBadge, derivePaymentBadge } from "@/lib/utils";

type Plan = {
  id: string;
  name: string;
  category: "MEN" | "WOMEN" | "COUPLES";
  durationDays: number;
  feeAmount: string | number;
  isActive: boolean;
};

type Member = {
  id: string;
  memberCode: string;
  fullName: string;
  email: string;
  phone: string;
  gender: "MALE" | "FEMALE" | "OTHER";
  address: string | null;
  emergencyContact: string | null;
  planId: string;
  startDate: string;
  expiryDate: string;
  paymentStatus: "PAID" | "PENDING" | "OVERDUE";
  status: "ACTIVE" | "EXPIRED" | "SUSPENDED";
  notes: string | null;
  plan: Plan;
};

function monthOptions() {
  const now = new Date();
  return Array.from({ length: 12 }, (_, i) => {
    const d = subMonths(now, i);
    return {
      value: format(d, "yyyy-MM"),
      label: format(d, "MMMM yyyy"),
    };
  });
}

export function MembersManager({ plans }: { plans: Plan[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const months = useMemo(() => monthOptions(), []);
  const [members, setMembers] = useState<Member[]>([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState(() => searchParams.get("status") ?? "all");
  const [paymentStatus, setPaymentStatus] = useState("all");
  const [joinedMonth, setJoinedMonth] = useState(
    () =>
      searchParams.get("joinedMonth") ??
      (searchParams.get("joinedThisMonth") === "true" ? format(new Date(), "yyyy-MM") : "all")
  );
  const [expiringSoon, setExpiringSoon] = useState(
    () => searchParams.get("expiringSoon") === "true"
  );
  const [paidThisMonth, setPaidThisMonth] = useState(
    () => searchParams.get("paidThisMonth") === "true"
  );
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<{
    id: string;
    fullName: string;
    email: string;
    phone: string;
    gender: "MALE" | "FEMALE" | "OTHER";
    address: string;
    emergencyContact: string;
    planId: string;
    startDate: string;
    paymentStatus: "PAID" | "PENDING";
    status: "ACTIVE" | "EXPIRED" | "SUSPENDED";
    notes: string;
  }> | null>(null);

  useEffect(() => {
    setStatus(searchParams.get("status") ?? "all");
    setExpiringSoon(searchParams.get("expiringSoon") === "true");
    setPaidThisMonth(searchParams.get("paidThisMonth") === "true");
    setJoinedMonth(
      searchParams.get("joinedMonth") ??
        (searchParams.get("joinedThisMonth") === "true" ? format(new Date(), "yyyy-MM") : "all")
    );
    setPage(1);
  }, [searchParams]);

  const activeFilterLabel = useMemo(() => {
    if (expiringSoon) return "Expiring soon";
    if (paidThisMonth) return "Paid this month";
    if (joinedMonth !== "all") {
      const label = months.find((m) => m.value === joinedMonth)?.label ?? joinedMonth;
      return `Joined in ${label}`;
    }
    if (status !== "all") return status;
    return null;
  }, [expiringSoon, paidThisMonth, joinedMonth, status, months]);

  const clearDashboardFilter = () => {
    setStatus("all");
    setExpiringSoon(false);
    setPaidThisMonth(false);
    setJoinedMonth("all");
    setPage(1);
    router.replace("/members");
  };

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      pageSize: "10",
    });
    if (q) params.set("q", q);
    if (status !== "all" && !expiringSoon) params.set("status", status);
    if (paymentStatus !== "all") params.set("paymentStatus", paymentStatus);
    if (expiringSoon) params.set("expiringSoon", "true");
    if (paidThisMonth) params.set("paidThisMonth", "true");
    if (joinedMonth !== "all") params.set("joinedMonth", joinedMonth);

    const res = await fetch(`/api/members?${params}`);
    const json = await res.json();
    setMembers(json.data ?? []);
    setTotalPages(json.pagination?.totalPages ?? 1);
    setLoading(false);
  }, [page, q, status, paymentStatus, expiringSoon, paidThisMonth, joinedMonth]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  async function exportExcel() {
    setExporting(true);
    try {
      const params = new URLSearchParams({ export: "true", pageSize: "5000" });
      if (q) params.set("q", q);
      if (status !== "all" && !expiringSoon) params.set("status", status);
      if (paymentStatus !== "all") params.set("paymentStatus", paymentStatus);
      if (expiringSoon) params.set("expiringSoon", "true");
      if (paidThisMonth) params.set("paidThisMonth", "true");
      if (joinedMonth !== "all") params.set("joinedMonth", joinedMonth);

      const res = await fetch(`/api/members?${params}`);
      const json = await res.json();
      const rows: Member[] = json.data ?? [];
      if (rows.length === 0) {
        toast.error("No members to export");
        return;
      }

      const header = [
        "Member Code",
        "Full Name",
        "Email",
        "Phone",
        "Gender",
        "Plan",
        "Fee",
        "Start Date",
        "Expiry Date",
        "Payment Status",
        "Status",
        "Notes",
      ];

      const escape = (v: string | number | null | undefined) => {
        const s = String(v ?? "");
        if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
        return s;
      };

      const lines = [
        header.join(","),
        ...rows.map((m) =>
          [
            m.memberCode,
            m.fullName,
            m.email,
            m.phone,
            m.gender,
            m.plan.name,
            Number(m.plan.feeAmount),
            formatDate(m.startDate),
            formatDate(m.expiryDate),
            m.paymentStatus,
            m.status,
            m.notes ?? "",
          ]
            .map(escape)
            .join(",")
        ),
      ];

      // BOM so Excel opens UTF-8 correctly
      const blob = new Blob(["\uFEFF" + lines.join("\n")], {
        type: "application/vnd.ms-excel;charset=utf-8;",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `members-${format(new Date(), "yyyy-MM-dd")}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${rows.length} members`);
    } catch {
      toast.error("Export failed");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Members</h1>
          <p className="text-sm text-muted-foreground">
            {activeFilterLabel
              ? `Showing: ${activeFilterLabel}`
              : "Search, filter, and manage gym memberships"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" disabled={exporting} onClick={exportExcel}>
            <Download className="h-4 w-4" />
            {exporting ? "Exporting..." : "Export Excel"}
          </Button>
          <Button
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Add Member
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-base">Directory</CardTitle>
            {activeFilterLabel ? (
              <Button size="sm" variant="outline" onClick={clearDashboardFilter}>
                <X className="h-3.5 w-3.5" />
                Clear filter
              </Button>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search name, email, phone, or code..."
                value={q}
                onChange={(e) => {
                  setPage(1);
                  setQ(e.target.value);
                }}
              />
            </div>
            <Select
              value={status}
              onValueChange={(v) => {
                setPage(1);
                setExpiringSoon(false);
                setPaidThisMonth(false);
                setStatus(v);
                const params = new URLSearchParams();
                if (v !== "all") params.set("status", v);
                if (joinedMonth !== "all") params.set("joinedMonth", joinedMonth);
                router.replace(params.toString() ? `/members?${params}` : "/members");
              }}
            >
              <SelectTrigger className="w-full lg:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="EXPIRED">Expired</SelectItem>
                <SelectItem value="SUSPENDED">Suspended</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={paymentStatus}
              onValueChange={(v) => {
                setPage(1);
                setPaymentStatus(v);
              }}
            >
              <SelectTrigger className="w-full lg:w-40">
                <SelectValue placeholder="Payment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All payments</SelectItem>
                <SelectItem value="PAID">Paid</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="OVERDUE">Overdue</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={joinedMonth}
              onValueChange={(v) => {
                setPage(1);
                setExpiringSoon(false);
                setPaidThisMonth(false);
                setJoinedMonth(v);
                const params = new URLSearchParams();
                if (status !== "all") params.set("status", status);
                if (v !== "all") params.set("joinedMonth", v);
                router.replace(params.toString() ? `/members?${params}` : "/members");
              }}
            >
              <SelectTrigger className="w-full lg:w-48">
                <SelectValue placeholder="Joined month" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All join months</SelectItem>
                {months.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Start</TableHead>
                <TableHead>Expiry</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                    Loading members...
                  </TableCell>
                </TableRow>
              ) : members.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                    No members found
                  </TableCell>
                </TableRow>
              ) : (
                members.map((m) => {
                  const statusBadge = memberStatusBadge(m.status, m.expiryDate);
                  const paymentBadge = derivePaymentBadge(m.paymentStatus, m.expiryDate);
                  return (
                    <TableRow key={m.id}>
                      <TableCell>
                        <Link href={`/members/${m.id}`} className="font-medium hover:text-primary">
                          {m.fullName}
                        </Link>
                        <div className="text-xs text-muted-foreground font-mono">{m.memberCode}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{m.email}</div>
                        <div className="text-xs text-muted-foreground">{m.phone}</div>
                      </TableCell>
                      <TableCell>
                        <div>{m.plan.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {formatCurrency(Number(m.plan.feeAmount))}
                        </div>
                      </TableCell>
                      <TableCell>{formatDate(m.startDate)}</TableCell>
                      <TableCell>{formatDate(m.expiryDate)}</TableCell>
                      <TableCell>
                        <Badge variant={paymentBadge.tone}>{paymentBadge.label}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusBadge.tone}>{statusBadge.label}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditing({
                              id: m.id,
                              fullName: m.fullName,
                              email: m.email,
                              phone: m.phone,
                              gender: m.gender,
                              address: m.address ?? "",
                              emergencyContact: m.emergencyContact ?? "",
                              planId: m.planId,
                              startDate: m.startDate.slice(0, 10),
                              paymentStatus:
                                m.paymentStatus === "OVERDUE" ? "PENDING" : m.paymentStatus,
                              status: m.status,
                              notes: m.notes ?? "",
                            });
                            setModalOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>

          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Page {page} of {totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <MemberFormModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        plans={plans}
        initial={editing}
        onSaved={load}
      />
    </div>
  );
}

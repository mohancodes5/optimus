"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Plus, Search, Pencil } from "lucide-react";
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
  durationDays: number;
  feeAmount: string | number;
  isActive: boolean;
};

type Member = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  gender: "MALE" | "FEMALE" | "OTHER";
  emergencyContact: string | null;
  planId: string;
  startDate: string;
  expiryDate: string;
  paymentStatus: "PAID" | "PENDING" | "OVERDUE";
  status: "ACTIVE" | "EXPIRED" | "SUSPENDED";
  notes: string | null;
  plan: Plan;
};

export function MembersManager({ plans }: { plans: Plan[] }) {
  const searchParams = useSearchParams();
  const initialStatus = searchParams.get("status") ?? "all";
  const initialExpiring = searchParams.get("expiringSoon") === "true";
  const initialJoined = searchParams.get("joinedThisMonth") === "true";

  const [members, setMembers] = useState<Member[]>([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState(initialStatus);
  const [paymentStatus, setPaymentStatus] = useState("all");
  const [expiringSoon, setExpiringSoon] = useState(initialExpiring);
  const [joinedThisMonth, setJoinedThisMonth] = useState(initialJoined);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<{
    id: string;
    fullName: string;
    email: string;
    phone: string;
    gender: "MALE" | "FEMALE" | "OTHER";
    emergencyContact: string;
    planId: string;
    startDate: string;
    paymentStatus: "PAID" | "PENDING";
    notes: string;
  }> | null>(null);

  useEffect(() => {
    setStatus(searchParams.get("status") ?? "all");
    setExpiringSoon(searchParams.get("expiringSoon") === "true");
    setJoinedThisMonth(searchParams.get("joinedThisMonth") === "true");
    setPage(1);
  }, [searchParams]);

  const filterLabel = useMemo(() => {
    if (expiringSoon) return "Showing members expiring within 7 days";
    if (joinedThisMonth) return "Showing members who joined this month";
    if (status === "ACTIVE") return "Showing active members";
    return null;
  }, [expiringSoon, joinedThisMonth, status]);

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
    if (joinedThisMonth) params.set("joinedThisMonth", "true");

    const res = await fetch(`/api/members?${params}`);
    const json = await res.json();
    setMembers(json.data ?? []);
    setTotalPages(json.pagination?.totalPages ?? 1);
    setLoading(false);
  }, [page, q, status, paymentStatus, expiringSoon, joinedThisMonth]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  function clearSpecialFilters() {
    setExpiringSoon(false);
    setJoinedThisMonth(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Members</h1>
          <p className="text-sm text-muted-foreground">
            {filterLabel ?? "Search, filter, and manage gym memberships"}
          </p>
        </div>
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

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Directory</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search name, email, or phone..."
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
                clearSpecialFilters();
                setStatus(v);
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
            {(expiringSoon || joinedThisMonth) && (
              <Button
                variant="outline"
                onClick={() => {
                  setPage(1);
                  clearSpecialFilters();
                  setStatus("all");
                }}
              >
                Clear filter
              </Button>
            )}
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
                              emergencyContact: m.emergencyContact ?? "",
                              planId: m.planId,
                              startDate: m.startDate.slice(0, 10),
                              paymentStatus:
                                m.paymentStatus === "OVERDUE" ? "PENDING" : m.paymentStatus,
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

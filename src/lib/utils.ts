import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { addDays, differenceInCalendarDays, format, isBefore, startOfDay } from "date-fns";
import type { MemberStatus, PaymentStatus } from "@prisma/client";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | string) {
  const value = typeof amount === "string" ? Number(amount) : amount;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

export function formatDate(date: Date | string) {
  return format(new Date(date), "MMM d, yyyy");
}

export function formatDateTime(date: Date | string) {
  return format(new Date(date), "MMM d, yyyy · h:mm a");
}

export function calcExpiryDate(startDate: Date, durationDays: number) {
  return addDays(startDate, durationDays);
}

export function daysUntilExpiry(expiryDate: Date | string) {
  return differenceInCalendarDays(startOfDay(new Date(expiryDate)), startOfDay(new Date()));
}

export function deriveMemberStatus(
  expiryDate: Date | string,
  current?: MemberStatus
): MemberStatus {
  if (current === "SUSPENDED") return "SUSPENDED";
  const days = daysUntilExpiry(expiryDate);
  if (days < 0) return "EXPIRED";
  return "ACTIVE";
}

export function derivePaymentBadge(
  paymentStatus: PaymentStatus,
  expiryDate: Date | string
): {
  label: string;
  tone: "success" | "warning" | "danger" | "neutral";
} {
  if (paymentStatus === "OVERDUE" || isBefore(new Date(expiryDate), startOfDay(new Date()))) {
    return { label: paymentStatus === "OVERDUE" ? "Overdue" : "Expired", tone: "danger" };
  }
  if (paymentStatus === "PENDING") {
    return { label: "Pending", tone: "warning" };
  }
  const days = daysUntilExpiry(expiryDate);
  if (days <= 7) {
    return { label: "Expiring Soon", tone: "warning" };
  }
  return { label: "Paid", tone: "success" };
}

export function memberStatusBadge(status: MemberStatus, expiryDate: Date | string) {
  const days = daysUntilExpiry(expiryDate);
  if (status === "SUSPENDED") return { label: "Suspended", tone: "neutral" as const };
  if (status === "EXPIRED" || days < 0) return { label: "Expired", tone: "danger" as const };
  if (days <= 7) return { label: "Expiring Soon", tone: "warning" as const };
  return { label: "Active", tone: "success" as const };
}

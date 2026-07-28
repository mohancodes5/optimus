import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const memberSchema = z.object({
  fullName: z.string().min(2, "Name is required"),
  email: z.string().email("Valid email required"),
  phone: z.string().min(7, "Phone is required"),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]),
  address: z.string().trim().min(5, "Address is required"),
  emergencyContact: z.string().optional().nullable(),
  planId: z.string().min(1, "Plan is required"),
  startDate: z.string().min(1, "Start date is required"),
  paymentStatus: z.enum(["PAID", "PENDING", "OVERDUE"]).default("PENDING"),
  status: z.enum(["ACTIVE", "EXPIRED", "SUSPENDED"]).optional(),
  notes: z.string().optional().nullable(),
});

export const planSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional().nullable(),
  category: z.enum(["MEN", "WOMEN", "COUPLES"]),
  durationDays: z.coerce.number().int().positive(),
  feeAmount: z.coerce.number().positive(),
  perks: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
});

export const attendanceSchema = z.object({
  memberId: z.string().min(1).optional(),
  memberCode: z.string().min(1).optional(),
  notes: z.string().optional().nullable(),
  action: z.enum(["auto", "checkin", "checkout"]).default("auto"),
}).refine((data) => Boolean(data.memberId || data.memberCode), {
  message: "memberId or memberCode is required",
});

export const notificationSchema = z.object({
  memberId: z.string().min(1),
  type: z.enum(["EXPIRING", "UNPAID", "RENEWAL", "GENERAL"]),
  channel: z.enum(["EMAIL", "SMS", "WHATSAPP", "IN_APP"]).default("EMAIL"),
  title: z.string().min(1),
  message: z.string().min(1),
});

export type MemberInput = z.infer<typeof memberSchema>;
export type PlanInput = z.infer<typeof planSchema>;

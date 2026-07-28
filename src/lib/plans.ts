import { Prisma, type PlanCategory } from "@prisma/client";

export const PLAN_CATEGORIES = ["MEN", "WOMEN", "COUPLES"] as const;

export type PlanCategoryValue = (typeof PLAN_CATEGORIES)[number];

export const PLAN_CATEGORY_LABELS: Record<PlanCategoryValue, string> = {
  MEN: "Men's Plan",
  WOMEN: "Women's Plan",
  COUPLES: "Couples Plan",
};

/** Canonical package durations offered under each category. */
export const PLAN_PACKAGES = [
  { key: "1m", label: "1 Month", durationDays: 30 },
  { key: "3m", label: "3 Months", durationDays: 90 },
  { key: "6m", label: "6 Months", durationDays: 180 },
  { key: "1y", label: "1 Year", durationDays: 365 },
] as const;

export function packageLabelForDays(durationDays: number): string {
  const match = PLAN_PACKAGES.find((p) => p.durationDays === durationDays);
  if (match) return match.label;
  if (durationDays % 30 === 0 && durationDays >= 30) {
    const months = durationDays / 30;
    return months === 1 ? "1 Month" : `${months} Months`;
  }
  return `${durationDays} days`;
}

export function categoryLabel(category: PlanCategory | string | null | undefined): string {
  if (!category) return "Plan";
  return PLAN_CATEGORY_LABELS[category as PlanCategoryValue] ?? category;
}

export function asStringArray(value: Prisma.JsonValue | string[] | null | undefined): string[] {
  if (!value) return [];
  if (!Array.isArray(value)) return [];

  const result: string[] = [];
  for (const item of value) {
    if (typeof item === "string") {
      result.push(item);
    }
  }
  return result;
}

/** Production catalog: 3 categories × 4 packages. */
export const PRODUCTION_PLANS = [
  // Men's
  {
    id: "plan_men_1m",
    name: "Men's - 1 Month",
    category: "MEN" as const,
    description: "Men's gym membership for 1 month",
    durationDays: 30,
    feeAmount: 999,
    perks: ["Gym floor", "Locker room"],
  },
  {
    id: "plan_men_3m",
    name: "Men's - 3 Months",
    category: "MEN" as const,
    description: "Men's gym membership for 3 months",
    durationDays: 90,
    feeAmount: 2499,
    perks: ["Gym floor", "Locker room", "Group classes"],
  },
  {
    id: "plan_men_6m",
    name: "Men's - 6 Months",
    category: "MEN" as const,
    description: "Men's gym membership for 6 months",
    durationDays: 180,
    feeAmount: 4499,
    perks: ["Gym floor", "Locker room", "Group classes"],
  },
  {
    id: "plan_men_1y",
    name: "Men's - 1 Year",
    category: "MEN" as const,
    description: "Men's gym membership for 1 year",
    durationDays: 365,
    feeAmount: 7999,
    perks: ["Gym floor", "Locker room", "Group classes", "Priority support"],
  },
  // Women's
  {
    id: "plan_women_1m",
    name: "Women's - 1 Month",
    category: "WOMEN" as const,
    description: "Women's gym membership for 1 month",
    durationDays: 30,
    feeAmount: 999,
    perks: ["Gym floor", "Locker room"],
  },
  {
    id: "plan_women_3m",
    name: "Women's - 3 Months",
    category: "WOMEN" as const,
    description: "Women's gym membership for 3 months",
    durationDays: 90,
    feeAmount: 2499,
    perks: ["Gym floor", "Locker room", "Group classes"],
  },
  {
    id: "plan_women_6m",
    name: "Women's - 6 Months",
    category: "WOMEN" as const,
    description: "Women's gym membership for 6 months",
    durationDays: 180,
    feeAmount: 4499,
    perks: ["Gym floor", "Locker room", "Group classes"],
  },
  {
    id: "plan_women_1y",
    name: "Women's - 1 Year",
    category: "WOMEN" as const,
    description: "Women's gym membership for 1 year",
    durationDays: 365,
    feeAmount: 7999,
    perks: ["Gym floor", "Locker room", "Group classes", "Priority support"],
  },
  // Couples
  {
    id: "plan_couples_1m",
    name: "Couples - 1 Month",
    category: "COUPLES" as const,
    description: "Couples gym membership for 1 month",
    durationDays: 30,
    feeAmount: 1799,
    perks: ["Gym floor", "Locker room", "2 members"],
  },
  {
    id: "plan_couples_3m",
    name: "Couples - 3 Months",
    category: "COUPLES" as const,
    description: "Couples gym membership for 3 months",
    durationDays: 90,
    feeAmount: 4499,
    perks: ["Gym floor", "Locker room", "Group classes", "2 members"],
  },
  {
    id: "plan_couples_6m",
    name: "Couples - 6 Months",
    category: "COUPLES" as const,
    description: "Couples gym membership for 6 months",
    durationDays: 180,
    feeAmount: 7999,
    perks: ["Gym floor", "Locker room", "Group classes", "2 members"],
  },
  {
    id: "plan_couples_1y",
    name: "Couples - 1 Year",
    category: "COUPLES" as const,
    description: "Couples gym membership for 1 year",
    durationDays: 365,
    feeAmount: 13999,
    perks: ["Gym floor", "Locker room", "Group classes", "Priority support", "2 members"],
  },
] as const;

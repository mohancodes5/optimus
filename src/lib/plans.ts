import { Prisma } from "@prisma/client";

export function asStringArray(value: Prisma.JsonValue | string[] | null | undefined): string[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }
  return [];
}

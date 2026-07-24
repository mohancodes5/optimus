import { Prisma } from "@prisma/client";

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

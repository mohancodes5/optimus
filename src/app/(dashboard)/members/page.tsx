import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { MembersManager } from "@/components/members/members-manager";

export default async function MembersPage() {
  const plans = await prisma.membershipPlan.findMany({
    orderBy: [{ category: "asc" }, { durationDays: "asc" }],
  });

  const serializedPlans = plans.map((p) => ({
    id: p.id,
    name: p.name,
    category: p.category,
    durationDays: p.durationDays,
    feeAmount: Number(p.feeAmount),
    isActive: p.isActive,
  }));

  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading members...</p>}>
      <MembersManager plans={serializedPlans} />
    </Suspense>
  );
}

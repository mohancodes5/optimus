import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { MembersManager } from "@/components/members/members-manager";

export default async function MembersPage() {
  const plans = await prisma.membershipPlan.findMany({
    orderBy: { feeAmount: "asc" },
  });

  const serializedPlans = plans.map((p) => ({
    ...p,
    feeAmount: Number(p.feeAmount),
  }));

  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading members...</p>}>
      <MembersManager plans={serializedPlans} />
    </Suspense>
  );
}

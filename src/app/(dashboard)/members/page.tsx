import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { MembersManager } from "@/components/members/members-manager";

export default async function MembersPage() {
  const plans = await prisma.membershipPlan.findMany({
    orderBy: { feeAmount: "asc" },
  });

  return (
    <Suspense
      fallback={
        <div className="py-10 text-center text-sm text-muted-foreground">Loading members...</div>
      }
    >
      <MembersManager
        plans={plans.map((p) => ({
          ...p,
          feeAmount: Number(p.feeAmount),
        }))}
      />
    </Suspense>
  );
}

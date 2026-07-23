import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { asStringArray } from "@/lib/plans";
import { PlansManager } from "@/components/plans/plans-manager";

export default async function PlansPage() {
  const session = await auth();
  const plans = await prisma.membershipPlan.findMany({
    orderBy: { feeAmount: "asc" },
    include: { _count: { select: { members: true } } },
  });

  return (
    <PlansManager
      canManage={session?.user?.role === "ADMIN"}
      initialPlans={plans.map((p) => ({
        ...p,
        feeAmount: Number(p.feeAmount),
        perks: asStringArray(p.perks),
      }))}
    />
  );
}

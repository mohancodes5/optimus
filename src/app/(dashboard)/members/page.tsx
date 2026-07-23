import { prisma } from "@/lib/prisma";
import { MembersManager } from "@/components/members/members-manager";

export default async function MembersPage() {
  const plans = await prisma.membershipPlan.findMany({
    orderBy: { feeAmount: "asc" },
  });

  return (
    <MembersManager
      plans={plans.map((p) => ({
        ...p,
        feeAmount: Number(p.feeAmount),
      }))}
    />
  );
}

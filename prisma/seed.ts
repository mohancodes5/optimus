import "dotenv/config";
import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { PRODUCTION_PLANS } from "../src/lib/plans";

const prisma = new PrismaClient();

/**
 * Production bootstrap — admin + Men/Women/Couples plan catalog.
 * Never creates fake members, payments, or attendance.
 *
 * Required env:
 *   SEED_ADMIN_EMAIL
 *   SEED_ADMIN_PASSWORD  (min 10 characters)
 * Optional:
 *   SEED_ADMIN_NAME      (default: "Admin")
 *   SEED_CLEAR_DEMO=true — wipe members/payments/attendance/notifications first
 *   SEED_SYNC_PLANS=true — upsert the 12 production packages (default: true when no plans)
 */
async function main() {
  const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD ?? "";
  const name = process.env.SEED_ADMIN_NAME?.trim() || "Admin";
  const clearDemo = process.env.SEED_CLEAR_DEMO === "true";
  const syncPlans =
    process.env.SEED_SYNC_PLANS === "true" ||
    process.env.SEED_SYNC_PLANS === undefined;

  if (!email || !email.includes("@")) {
    throw new Error("Set SEED_ADMIN_EMAIL in .env (e.g. owner@yourgym.com)");
  }
  if (password.length < 10) {
    throw new Error("Set SEED_ADMIN_PASSWORD in .env (minimum 10 characters)");
  }

  console.log("Bootstrapping production data...");

  if (clearDemo) {
    console.log("Clearing members, payments, attendance, and notifications...");
    await prisma.notification.deleteMany();
    await prisma.attendance.deleteMany();
    await prisma.payment.deleteMany();
    await prisma.member.deleteMany();
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const admin = await prisma.user.upsert({
    where: { email },
    update: { name, passwordHash, role: Role.ADMIN },
    create: { name, email, passwordHash, role: Role.ADMIN },
  });

  // Remove legacy demo accounts if present
  await prisma.user.deleteMany({
    where: {
      email: { in: ["staff@gymflow.app", "admin@gymflow.app"] },
      NOT: { id: admin.id },
    },
  });

  if (syncPlans) {
    // Deactivate legacy duration-only plans
    await prisma.membershipPlan.updateMany({
      where: { name: { in: ["Monthly", "Quarterly", "Annual"] } },
      data: { isActive: false },
    });

    for (const plan of PRODUCTION_PLANS) {
      await prisma.membershipPlan.upsert({
        where: { id: plan.id },
        update: {
          name: plan.name,
          description: plan.description,
          category: plan.category,
          durationDays: plan.durationDays,
          feeAmount: plan.feeAmount,
          perks: [...plan.perks],
          isActive: true,
        },
        create: {
          id: plan.id,
          name: plan.name,
          description: plan.description,
          category: plan.category,
          durationDays: plan.durationDays,
          feeAmount: plan.feeAmount,
          perks: [...plan.perks],
          isActive: true,
        },
      });
    }
    console.log(`Synced ${PRODUCTION_PLANS.length} membership packages (Men / Women / Couples).`);
  } else {
    const planCount = await prisma.membershipPlan.count();
    console.log(`Keeping ${planCount} existing plan(s) (SEED_SYNC_PLANS=false).`);
  }

  console.log("Bootstrap complete.");
  console.log(`Admin login: ${admin.email}`);
  console.log("Add real members from the Members page — no demo data was created.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

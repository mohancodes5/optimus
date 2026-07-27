import "dotenv/config";
import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

/**
 * Production bootstrap — creates admin + starter plans only.
 * Never creates fake members, payments, or attendance.
 *
 * Required env:
 *   SEED_ADMIN_EMAIL
 *   SEED_ADMIN_PASSWORD  (min 10 characters)
 * Optional:
 *   SEED_ADMIN_NAME      (default: "Admin")
 *   SEED_CLEAR_DEMO=true — wipe members/payments/attendance/notifications first
 */
async function main() {
  const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD ?? "";
  const name = process.env.SEED_ADMIN_NAME?.trim() || "Admin";
  const clearDemo = process.env.SEED_CLEAR_DEMO === "true";

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

  // Remove legacy demo staff account if present
  await prisma.user.deleteMany({
    where: {
      email: { in: ["staff@gymflow.app", "admin@gymflow.app"] },
      NOT: { id: admin.id },
    },
  });

  const planCount = await prisma.membershipPlan.count();
  if (planCount === 0) {
    await prisma.membershipPlan.createMany({
      data: [
        {
          name: "Monthly",
          description: "Full gym access for 30 days",
          durationDays: 30,
          feeAmount: 999,
          perks: ["Gym floor", "Locker room"],
          isActive: true,
        },
        {
          name: "Quarterly",
          description: "3-month membership",
          durationDays: 90,
          feeAmount: 2499,
          perks: ["Gym floor", "Locker room", "Group classes"],
          isActive: true,
        },
        {
          name: "Annual",
          description: "Best value yearly membership",
          durationDays: 365,
          feeAmount: 8999,
          perks: ["All quarterly perks", "Priority support"],
          isActive: true,
        },
      ],
    });
    console.log("Created starter membership plans (INR).");
  } else {
    console.log(`Keeping ${planCount} existing plan(s).`);
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

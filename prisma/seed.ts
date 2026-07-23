import "dotenv/config";
import { PrismaClient, Role, Gender, PaymentStatus, MemberStatus } from "@prisma/client";
import bcrypt from "bcryptjs";
import { addDays, addMonths, subDays, subMonths, startOfMonth } from "date-fns";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  await prisma.notification.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.member.deleteMany();
  await prisma.membershipPlan.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash("password123", 12);

  const admin = await prisma.user.create({
    data: {
      name: "Alex Admin",
      email: "admin@gymflow.app".toLowerCase(),
      passwordHash,
      role: Role.ADMIN,
    },
  });

  const staff = await prisma.user.create({
    data: {
      name: "Sam Staff",
      email: "staff@gymflow.app".toLowerCase(),
      passwordHash,
      role: Role.STAFF,
    },
  });

  const plans = await Promise.all([
    prisma.membershipPlan.create({
      data: {
        name: "Monthly Basic",
        description: "Full gym floor access for 30 days",
        durationDays: 30,
        feeAmount: 49.99,
        perks: ["Gym floor", "Locker room", "Free Wi-Fi"],
      },
    }),
    prisma.membershipPlan.create({
      data: {
        name: "Quarterly Pro",
        description: "3-month membership with class access",
        durationDays: 90,
        feeAmount: 129.99,
        perks: ["Gym floor", "Group classes", "Sauna", "Guest pass (2/mo)"],
      },
    }),
    prisma.membershipPlan.create({
      data: {
        name: "Annual Elite",
        description: "Best value yearly membership",
        durationDays: 365,
        feeAmount: 449.99,
        perks: [
          "All Pro perks",
          "Personal training intro (2 sessions)",
          "Nutrition consult",
          "Priority booking",
        ],
      },
    }),
    prisma.membershipPlan.create({
      data: {
        name: "PT Add-on",
        description: "8 personal training sessions",
        durationDays: 30,
        feeAmount: 199.99,
        perks: ["8 PT sessions", "Custom workout plan", "Progress tracking"],
      },
    }),
  ]);

  const [monthly, quarterly, annual] = plans;
  const now = new Date();

  const memberSeeds = [
    {
      fullName: "Jordan Lee",
      email: "jordan.lee@email.com",
      phone: "+1-555-0101",
      gender: Gender.MALE,
      emergencyContact: "+1-555-0199",
      planId: monthly.id,
      startDate: subDays(now, 20),
      expiryDate: addDays(now, 10),
      paymentStatus: PaymentStatus.PAID,
      status: MemberStatus.ACTIVE,
    },
    {
      fullName: "Taylor Morgan",
      email: "taylor.morgan@email.com",
      phone: "+1-555-0102",
      gender: Gender.FEMALE,
      emergencyContact: "+1-555-0198",
      planId: quarterly.id,
      startDate: subDays(now, 85),
      expiryDate: addDays(now, 5),
      paymentStatus: PaymentStatus.PAID,
      status: MemberStatus.ACTIVE,
    },
    {
      fullName: "Casey Rivera",
      email: "casey.rivera@email.com",
      phone: "+1-555-0103",
      gender: Gender.OTHER,
      emergencyContact: "+1-555-0197",
      planId: annual.id,
      startDate: subMonths(now, 2),
      expiryDate: addMonths(now, 10),
      paymentStatus: PaymentStatus.PAID,
      status: MemberStatus.ACTIVE,
    },
    {
      fullName: "Riley Chen",
      email: "riley.chen@email.com",
      phone: "+1-555-0104",
      gender: Gender.FEMALE,
      emergencyContact: "+1-555-0196",
      planId: monthly.id,
      startDate: subDays(now, 35),
      expiryDate: subDays(now, 5),
      paymentStatus: PaymentStatus.OVERDUE,
      status: MemberStatus.EXPIRED,
    },
    {
      fullName: "Avery Brooks",
      email: "avery.brooks@email.com",
      phone: "+1-555-0105",
      gender: Gender.MALE,
      emergencyContact: "+1-555-0195",
      planId: quarterly.id,
      startDate: startOfMonth(now),
      expiryDate: addDays(startOfMonth(now), 90),
      paymentStatus: PaymentStatus.PENDING,
      status: MemberStatus.ACTIVE,
    },
    {
      fullName: "Quinn Patel",
      email: "quinn.patel@email.com",
      phone: "+1-555-0106",
      gender: Gender.MALE,
      emergencyContact: "+1-555-0194",
      planId: monthly.id,
      startDate: subDays(now, 3),
      expiryDate: addDays(now, 27),
      paymentStatus: PaymentStatus.PAID,
      status: MemberStatus.ACTIVE,
    },
    {
      fullName: "Morgan Blake",
      email: "morgan.blake@email.com",
      phone: "+1-555-0107",
      gender: Gender.FEMALE,
      emergencyContact: "+1-555-0193",
      planId: annual.id,
      startDate: subDays(now, 10),
      expiryDate: addDays(now, 355),
      paymentStatus: PaymentStatus.PAID,
      status: MemberStatus.ACTIVE,
    },
    {
      fullName: "Jamie Soto",
      email: "jamie.soto@email.com",
      phone: "+1-555-0108",
      gender: Gender.OTHER,
      emergencyContact: "+1-555-0192",
      planId: monthly.id,
      startDate: subDays(now, 28),
      expiryDate: addDays(now, 2),
      paymentStatus: PaymentStatus.PENDING,
      status: MemberStatus.ACTIVE,
    },
  ];

  const members = [];
  for (const seed of memberSeeds) {
    const member = await prisma.member.create({ data: seed });
    members.push(member);

    await prisma.payment.create({
      data: {
        memberId: member.id,
        planId: seed.planId,
        amount: plans.find((p) => p.id === seed.planId)!.feeAmount,
        status: seed.paymentStatus,
        paidAt: seed.paymentStatus === PaymentStatus.PAID ? seed.startDate : null,
        dueDate: seed.startDate,
        method: seed.paymentStatus === PaymentStatus.PAID ? "Card" : null,
        createdById: admin.id,
      },
    });
  }

  // Historical revenue for charts (last 6 months)
  for (let i = 5; i >= 1; i--) {
    const monthDate = subMonths(now, i);
    await prisma.payment.create({
      data: {
        memberId: members[0].id,
        planId: monthly.id,
        amount: 49.99 + i * 20,
        status: PaymentStatus.PAID,
        paidAt: monthDate,
        dueDate: monthDate,
        method: "Card",
        createdById: admin.id,
        notes: "Historical seed payment",
      },
    });
  }

  // Attendance logs
  for (const member of members.slice(0, 5)) {
    for (let d = 0; d < 4; d++) {
      await prisma.attendance.create({
        data: {
          memberId: member.id,
          checkedInAt: subDays(now, d * 2),
          checkedInById: staff.id,
        },
      });
    }
  }

  await prisma.notification.createMany({
    data: [
      {
        memberId: members[1].id,
        userId: admin.id,
        type: "EXPIRING",
        channel: "EMAIL",
        title: "Plan expiring soon",
        message: `${members[1].fullName}'s plan expires in 5 days.`,
        sent: true,
        sentAt: subDays(now, 1),
      },
      {
        memberId: members[4].id,
        userId: staff.id,
        type: "UNPAID",
        channel: "SMS",
        title: "Payment pending",
        message: `Reminder: ${members[4].fullName} has a pending payment.`,
        sent: false,
      },
    ],
  });

  console.log("Seed complete.");
  console.log("Login: admin@gymflow.app / password123");
  console.log("Login: staff@gymflow.app / password123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

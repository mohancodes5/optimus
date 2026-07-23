import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/api-auth";
import { notificationSchema } from "@/lib/validations";

export async function GET() {
  const authResult = await requireSession();
  if (authResult.error) return authResult.error;

  const notifications = await prisma.notification.findMany({
    include: {
      member: { select: { id: true, fullName: true, email: true, phone: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json(notifications);
}

export async function POST(request: NextRequest) {
  const authResult = await requireSession();
  if (authResult.error) return authResult.error;

  const body = await request.json();
  const parsed = notificationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const member = await prisma.member.findUnique({
    where: { id: parsed.data.memberId },
  });
  if (!member) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  // Simulated send — mark as sent immediately for demo / staging
  const notification = await prisma.notification.create({
    data: {
      memberId: member.id,
      userId: authResult.session!.user.id,
      type: parsed.data.type,
      channel: parsed.data.channel,
      title: parsed.data.title,
      message: parsed.data.message,
      sent: true,
      sentAt: new Date(),
    },
    include: {
      member: { select: { id: true, fullName: true, email: true, phone: true } },
    },
  });

  return NextResponse.json(
    {
      notification,
      delivery: {
        simulated: true,
        channel: parsed.data.channel,
        recipient:
          parsed.data.channel === "SMS" ? member.phone : member.email,
        status: "delivered",
      },
    },
    { status: 201 }
  );
}

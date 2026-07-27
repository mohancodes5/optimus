import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/api-auth";
import { notificationSchema } from "@/lib/validations";
import { notifyMember } from "@/lib/notify";

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

  try {
    const member = await prisma.member.findUnique({
      where: { id: parsed.data.memberId },
      include: { plan: true },
    });

    const delivery = await notifyMember({
      memberId: parsed.data.memberId,
      userId: authResult.session!.user.id,
      type: parsed.data.type,
      channel: parsed.data.channel,
      title: parsed.data.title,
      message: parsed.data.message,
      idempotencyKey: `${parsed.data.type}-${parsed.data.channel}/${parsed.data.memberId}/${Date.now()}`,
      contentSid:
        parsed.data.channel === "WHATSAPP"
          ? process.env.TWILIO_WHATSAPP_CONTENT_SID_REMINDER ||
            process.env.TWILIO_WHATSAPP_CONTENT_SID ||
            undefined
          : undefined,
      whatsappVariables:
        parsed.data.channel === "WHATSAPP"
          ? {
              "1": member ? new Date(member.expiryDate).toLocaleDateString("en-IN") : "soon",
              "2": member?.plan?.name ?? "membership",
            }
          : undefined,
    });

    const notification = await prisma.notification.findUnique({
      where: { id: delivery.notificationId },
      include: {
        member: { select: { id: true, fullName: true, email: true, phone: true } },
      },
    });

    return NextResponse.json(
      {
        notification,
        delivery: {
          simulated: false,
          sent: delivery.sent,
          skipped: delivery.skipped ?? false,
          channel: delivery.channel,
          recipient: delivery.recipient,
          providerId: delivery.providerId,
          status: delivery.sent ? "delivered" : delivery.skipped ? "skipped" : "failed",
          error: delivery.error,
        },
      },
      { status: delivery.sent || delivery.skipped ? 201 : 502 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to send notification" },
      { status: 500 }
    );
  }
}

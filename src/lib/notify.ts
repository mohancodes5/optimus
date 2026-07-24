import type { NotificationChannel, NotificationType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { sendSms } from "@/lib/sms";
import { formatDate } from "@/lib/utils";
import { APP_NAME } from "@/lib/brand";

export type NotifyInput = {
  memberId: string;
  userId?: string | null;
  type: NotificationType;
  channel: NotificationChannel;
  title: string;
  message: string;
  idempotencyKey?: string;
};

export type NotifyResult = {
  notificationId: string;
  sent: boolean;
  channel: NotificationChannel;
  recipient: string;
  providerId?: string;
  error?: string;
  skipped?: boolean;
};

export async function notifyMember(input: NotifyInput): Promise<NotifyResult> {
  const member = await prisma.member.findUnique({
    where: { id: input.memberId },
  });

  if (!member) {
    throw new Error("Member not found");
  }

  const recipient = input.channel === "SMS" ? member.phone : member.email;
  let sent = false;
  let providerId: string | undefined;
  let error: string | undefined;
  let skipped = false;

  if (input.channel === "EMAIL" || input.channel === "IN_APP") {
    if (input.channel === "EMAIL") {
      const result = await sendEmail({
        to: member.email,
        subject: input.title,
        text: input.message,
        idempotencyKey: input.idempotencyKey,
      });
      sent = result.ok;
      providerId = result.id;
      error = result.error;
      skipped = Boolean(result.skipped);
    } else {
      sent = true;
    }
  }

  if (input.channel === "SMS") {
    // Keep SMS short — title + body can be redundant for Twilio
    const body =
      input.type === "GENERAL"
        ? input.message
        : `${input.title}: ${input.message}`;
    const result = await sendSms({
      to: member.phone,
      body,
    });
    sent = result.ok;
    providerId = result.sid;
    error = result.error;
    skipped = Boolean(result.skipped);
  }

  const notification = await prisma.notification.create({
    data: {
      memberId: member.id,
      userId: input.userId || null,
      type: input.type,
      channel: input.channel,
      title: input.title,
      message: error ? `${input.message}\n\n[Delivery error: ${error}]` : input.message,
      sent,
      sentAt: sent ? new Date() : null,
    },
  });

  return {
    notificationId: notification.id,
    sent,
    channel: input.channel,
    recipient,
    providerId,
    error,
    skipped,
  };
}

export async function sendWelcomeMessages(params: {
  memberId: string;
  userId?: string;
  fullName: string;
  planName: string;
  expiryDate: Date | string;
  channels?: NotificationChannel[];
}) {
  // Prefer SMS first for registration; email if configured
  const channels = params.channels ?? (["SMS", "EMAIL"] as NotificationChannel[]);
  const title = `Welcome to ${APP_NAME}`;
  const message = `Hi ${params.fullName}, you are added to ${APP_NAME} Studio. Your ${params.planName} plan is active until ${formatDate(params.expiryDate)}. Welcome aboard!`;

  const results: NotifyResult[] = [];
  for (const channel of channels) {
    results.push(
      await notifyMember({
        memberId: params.memberId,
        userId: params.userId,
        type: "GENERAL",
        channel,
        title,
        message,
        idempotencyKey: `welcome/${params.memberId}/${channel}`,
      })
    );
  }
  return results;
}

export async function sendRenewalMessages(params: {
  memberId: string;
  userId?: string;
  fullName: string;
  planName: string;
  expiryDate: Date | string;
}) {
  const title = `${APP_NAME} plan renewed`;
  const message = `Hi ${params.fullName}, your ${params.planName} membership at ${APP_NAME} was renewed. New expiry: ${formatDate(params.expiryDate)}.`;

  return Promise.all([
    notifyMember({
      memberId: params.memberId,
      userId: params.userId,
      type: "RENEWAL",
      channel: "SMS",
      title,
      message,
      idempotencyKey: `renewal-sms/${params.memberId}/${Date.now()}`,
    }),
    notifyMember({
      memberId: params.memberId,
      userId: params.userId,
      type: "RENEWAL",
      channel: "EMAIL",
      title,
      message,
      idempotencyKey: `renewal-email/${params.memberId}/${Date.now()}`,
    }),
  ]);
}

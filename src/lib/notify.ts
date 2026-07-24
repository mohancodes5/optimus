import type { NotificationChannel, NotificationType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { sendSms } from "@/lib/sms";
import { formatDate } from "@/lib/utils";

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
    const result = await sendSms({
      to: member.phone,
      body: `${input.title}\n${input.message}`,
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
  const channels = params.channels ?? (["SMS", "EMAIL"] as NotificationChannel[]);
  const title = "Welcome to GymFlow";
  const message = `Hi ${params.fullName}, welcome to GymFlow! Your ${params.planName} plan is active until ${formatDate(params.expiryDate)}. See you at the gym!`;

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
  const title = "Plan renewed";
  const message = `Hi ${params.fullName}, your ${params.planName} membership was renewed. New expiry: ${formatDate(params.expiryDate)}.`;

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

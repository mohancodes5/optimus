import type { NotificationChannel, NotificationType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { sendSms } from "@/lib/sms";
import { sendWhatsApp } from "@/lib/whatsapp";
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
  /** Optional WhatsApp template variables {"1":"...","2":"..."} */
  whatsappVariables?: Record<string, string>;
  contentSid?: string;
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

  const recipient =
    input.channel === "SMS" || input.channel === "WHATSAPP" ? member.phone : member.email;
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
    const body =
      input.type === "GENERAL" ? input.message : `${input.title}: ${input.message}`;
    const result = await sendSms({
      to: member.phone,
      body,
    });
    sent = result.ok;
    providerId = result.sid;
    error = result.error;
    skipped = Boolean(result.skipped);
  }

  if (input.channel === "WHATSAPP") {
    const body =
      input.type === "GENERAL" ? input.message : `${input.title}: ${input.message}`;
    const result = await sendWhatsApp({
      to: member.phone,
      body,
      contentSid: input.contentSid,
      contentVariables: input.whatsappVariables,
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

function defaultChannels(): NotificationChannel[] {
  const channels: NotificationChannel[] = ["SMS", "WHATSAPP", "EMAIL"];
  return channels;
}

export async function sendWelcomeMessages(params: {
  memberId: string;
  userId?: string;
  fullName: string;
  planName: string;
  expiryDate: Date | string;
  channels?: NotificationChannel[];
}) {
  const channels = params.channels ?? defaultChannels();
  const title = `Welcome to ${APP_NAME}`;
  const message = `Hi ${params.fullName}, you are added to ${APP_NAME}. Your ${params.planName} plan is active until ${formatDate(params.expiryDate)}. Welcome aboard!`;
  const expiry = formatDate(params.expiryDate);

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
        contentSid: process.env.TWILIO_WHATSAPP_CONTENT_SID_WELCOME || undefined,
        whatsappVariables: {
          "1": expiry,
          "2": params.planName,
        },
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
  const expiry = formatDate(params.expiryDate);

  return Promise.all(
    (["SMS", "WHATSAPP", "EMAIL"] as NotificationChannel[]).map((channel) =>
      notifyMember({
        memberId: params.memberId,
        userId: params.userId,
        type: "RENEWAL",
        channel,
        title,
        message,
        idempotencyKey: `renewal-${channel.toLowerCase()}/${params.memberId}/${Date.now()}`,
        contentSid: process.env.TWILIO_WHATSAPP_CONTENT_SID_REMINDER || undefined,
        whatsappVariables: {
          "1": expiry,
          "2": params.planName,
        },
      })
    )
  );
}

export async function sendReminderMessages(params: {
  memberId: string;
  userId?: string;
  type: Extract<NotificationType, "EXPIRING" | "UNPAID">;
  title: string;
  message: string;
  /** Template var 1 — often a date */
  variable1?: string;
  /** Template var 2 — often time / days / plan */
  variable2?: string;
}) {
  const channels: NotificationChannel[] = ["SMS", "WHATSAPP", "EMAIL"];
  const results: NotifyResult[] = [];

  for (const channel of channels) {
    results.push(
      await notifyMember({
        memberId: params.memberId,
        userId: params.userId,
        type: params.type,
        channel,
        title: params.title,
        message: params.message,
        idempotencyKey: `reminder-${params.type}-${channel}/${params.memberId}/${Date.now()}`,
        contentSid: process.env.TWILIO_WHATSAPP_CONTENT_SID_REMINDER || undefined,
        whatsappVariables: {
          "1": params.variable1 ?? params.title.slice(0, 40),
          "2": params.variable2 ?? "soon",
        },
      })
    );
  }
  return results;
}

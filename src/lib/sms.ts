import twilio from "twilio";
import { normalizePhone } from "@/lib/phone";

export type SmsResult = {
  ok: boolean;
  sid?: string;
  error?: string;
  skipped?: boolean;
  to?: string;
};

function getClient() {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) return null;
  return twilio(sid, token);
}

export async function sendSms(params: {
  to: string;
  body: string;
}): Promise<SmsResult> {
  const client = getClient();
  const from = process.env.TWILIO_PHONE_NUMBER;

  if (!client || !from) {
    return {
      ok: false,
      skipped: true,
      error: "Twilio is not configured (TWILIO_ACCOUNT_SID / AUTH_TOKEN / PHONE_NUMBER)",
    };
  }

  const to = normalizePhone(params.to);
  if (!to) {
    return {
      ok: false,
      error: `Invalid phone number: ${params.to}. Use E.164 like +919876543210`,
    };
  }

  try {
    const message = await client.messages.create({
      from,
      to,
      body: params.body.slice(0, 1600),
    });
    return { ok: true, sid: message.sid, to };
  } catch (error) {
    return {
      ok: false,
      to,
      error: error instanceof Error ? error.message : "SMS send failed",
    };
  }
}

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
  if (!sid || !token || token.includes("[") || token === "YOUR_AUTH_TOKEN") {
    return null;
  }
  return twilio(sid, token);
}

export async function sendSms(params: {
  to: string;
  body: string;
}): Promise<SmsResult> {
  const client = getClient();
  const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
  const from = process.env.TWILIO_PHONE_NUMBER;

  if (!client || (!messagingServiceSid && !from)) {
    return {
      ok: false,
      skipped: true,
      error:
        "Twilio is not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_MESSAGING_SERVICE_SID (or TWILIO_PHONE_NUMBER).",
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
      to,
      body: params.body.slice(0, 1600),
      ...(messagingServiceSid
        ? { messagingServiceSid }
        : { from: from! }),
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

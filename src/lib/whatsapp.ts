import twilio from "twilio";
import { normalizePhone, toWhatsAppAddress } from "@/lib/phone";

export type WhatsAppResult = {
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

function getWhatsAppFrom() {
  const from = process.env.TWILIO_WHATSAPP_FROM?.trim();
  if (!from) return null;
  return from.startsWith("whatsapp:") ? from : `whatsapp:${from}`;
}

/**
 * Send WhatsApp via Twilio.
 * - Uses Content Template (contentSid) when configured — required outside the 24h window
 * - Falls back to free-form body when no contentSid (sandbox / open session)
 */
export async function sendWhatsApp(params: {
  to: string;
  body: string;
  /** Template variables {"1":"...","2":"..."} for Twilio Content API */
  contentVariables?: Record<string, string>;
  contentSid?: string;
}): Promise<WhatsAppResult> {
  const client = getClient();
  const from = getWhatsAppFrom();

  if (!client || !from) {
    return {
      ok: false,
      skipped: true,
      error:
        "WhatsApp is not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_WHATSAPP_FROM (e.g. whatsapp:+14155238886).",
    };
  }

  const to = toWhatsAppAddress(params.to);
  if (!to) {
    return {
      ok: false,
      error: `Invalid phone number: ${params.to}. Use a valid mobile like 9876543210 or +919876543210`,
    };
  }

  const contentSid =
    params.contentSid ||
    process.env.TWILIO_WHATSAPP_CONTENT_SID?.trim() ||
    undefined;

  try {
    const message = await client.messages.create({
      from,
      to,
      ...(contentSid
        ? {
            contentSid,
            contentVariables: JSON.stringify(
              params.contentVariables ?? { "1": params.body.slice(0, 60), "2": "Optimus" }
            ),
          }
        : {
            body: params.body.slice(0, 1600),
          }),
    });
    return { ok: true, sid: message.sid, to: normalizePhone(params.to) ?? undefined };
  } catch (error) {
    // If template send fails, retry once with free-form body (sandbox / open session)
    if (contentSid) {
      try {
        const fallback = await client.messages.create({
          from,
          to,
          body: params.body.slice(0, 1600),
        });
        return { ok: true, sid: fallback.sid, to: normalizePhone(params.to) ?? undefined };
      } catch {
        // fall through to original error
      }
    }

    const msg = error instanceof Error ? error.message : "WhatsApp send failed";
    const hint = msg.toLowerCase().includes("not a valid") || msg.toLowerCase().includes("sandbox")
      ? " For Twilio WhatsApp Sandbox, the member must first send “join <code>” to +14155238886."
      : msg.toLowerCase().includes("permission") || msg.toLowerCase().includes("unverified")
        ? " Twilio trial accounts only message verified numbers — upgrade or verify the number."
        : "";
    return {
      ok: false,
      to: normalizePhone(params.to) ?? undefined,
      error: `${msg}${hint}`,
    };
  }
}

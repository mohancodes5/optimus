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
 *
 * Production tip:
 * - Sandbox requires each recipient to message "join <code>" to the sandbox number first.
 * - Outside the 24h window you need an approved Content Template (contentSid).
 * - Set TWILIO_WHATSAPP_USE_TEMPLATE=true to force templates; otherwise free-form body is preferred
 *   (more reliable for sandbox / open sessions).
 */
export async function sendWhatsApp(params: {
  to: string;
  body: string;
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

  const useTemplate = process.env.TWILIO_WHATSAPP_USE_TEMPLATE === "true";
  const contentSid = useTemplate
    ? params.contentSid || process.env.TWILIO_WHATSAPP_CONTENT_SID?.trim() || undefined
    : params.contentSid || undefined;

  const body = params.body.slice(0, 1600);

  async function sendWithTemplate() {
    if (!contentSid) return null;
    return client!.messages.create({
      from: from!,
      to: to!,
      contentSid,
      contentVariables: JSON.stringify(
        params.contentVariables ?? { "1": body.slice(0, 60), "2": "Optimus" }
      ),
    });
  }

  async function sendWithBody() {
    return client!.messages.create({
      from: from!,
      to: to!,
      body,
    });
  }

  try {
    // Prefer free-form body for reliability unless templates are forced
    const message = contentSid
      ? (await sendWithTemplate()) ?? (await sendWithBody())
      : await sendWithBody();

    return { ok: true, sid: message.sid, to: normalizePhone(params.to) ?? undefined };
  } catch (error) {
    // Cross-fallback: template ↔ body
    try {
      const fallback = contentSid ? await sendWithBody() : await sendWithTemplate();
      if (fallback) {
        return { ok: true, sid: fallback.sid, to: normalizePhone(params.to) ?? undefined };
      }
    } catch {
      // keep original error
    }

    const msg = error instanceof Error ? error.message : "WhatsApp send failed";
    const lower = msg.toLowerCase();
    let hint = "";
    if (lower.includes("sandbox") || lower.includes("not a valid whatsapp") || lower.includes("63007") || lower.includes("63016")) {
      hint =
        " Recipient must join the WhatsApp Sandbox first (send “join <code>” to +14155238886). For production, register a WhatsApp Business sender.";
    } else if (lower.includes("63032") || lower.includes("template") || lower.includes("63027")) {
      hint = " Use an approved WhatsApp Content Template, or set TWILIO_WHATSAPP_USE_TEMPLATE=false for free-form (24h window).";
    } else if (lower.includes("unverified") || lower.includes("permission")) {
      hint = " Verify the number in Twilio Console or upgrade off the trial account.";
    }

    return {
      ok: false,
      to: normalizePhone(params.to) ?? undefined,
      error: `${msg}${hint}`,
    };
  }
}

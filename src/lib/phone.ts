/**
 * Normalize phone numbers toward E.164 for Twilio SMS / WhatsApp.
 * Defaults to India (+91) for local mobile numbers.
 *
 * Accepts: 9876543210 | 09876543210 | 919876543210 | +919876543210 | 91 98765 43210
 */
export function normalizePhone(
  raw: string,
  defaultCountryCode = process.env.SMS_DEFAULT_COUNTRY_CODE || "+91"
): string | null {
  if (!raw?.trim()) return null;

  let value = raw.trim().replace(/[\s\-().]/g, "");

  if (value.startsWith("00")) {
    value = `+${value.slice(2)}`;
  }

  // Digits only (for format detection)
  const digits = value.startsWith("+")
    ? value.slice(1).replace(/\D/g, "")
    : value.replace(/\D/g, "");

  if (!digits) return null;

  let e164: string;

  if (value.startsWith("+")) {
    e164 = `+${digits}`;
  } else if (digits.length === 10 && /^[6-9]/.test(digits)) {
    // Indian mobile without country code
    e164 = `${defaultCountryCode}${digits}`;
  } else if (digits.length === 11 && digits.startsWith("0") && /^0[6-9]/.test(digits)) {
    // 0 + 10-digit mobile
    e164 = `${defaultCountryCode}${digits.slice(1)}`;
  } else if (digits.length === 12 && digits.startsWith("91")) {
    e164 = `+${digits}`;
  } else if (digits.length >= 11 && digits.length <= 15) {
    e164 = `+${digits}`;
  } else {
    return null;
  }

  // Ensure country code has leading +
  if (!e164.startsWith("+")) {
    e164 = `+${e164.replace(/\D/g, "")}`;
  }

  if (!/^\+[1-9]\d{7,14}$/.test(e164)) {
    return null;
  }

  return e164;
}

/** Format for WhatsApp Twilio API: whatsapp:+E164 */
export function toWhatsAppAddress(raw: string): string | null {
  const e164 = normalizePhone(raw);
  if (!e164) return null;
  return e164.startsWith("whatsapp:") ? e164 : `whatsapp:${e164}`;
}

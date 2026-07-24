/**
 * Normalize phone numbers toward E.164 for Twilio.
 * Defaults to India (+91) when a 10-digit local number is provided.
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

  if (!value.startsWith("+")) {
    const digits = value.replace(/\D/g, "");
    if (digits.length === 10) {
      value = `${defaultCountryCode}${digits}`;
    } else if (digits.length > 10) {
      value = `+${digits}`;
    } else {
      return null;
    }
  }

  if (!/^\+[1-9]\d{7,14}$/.test(value)) {
    return null;
  }

  return value;
}

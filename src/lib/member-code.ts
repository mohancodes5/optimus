import { randomBytes } from "crypto";

/** Short scannable member code, e.g. OPT-A1B2C3 */
export function generateMemberCode() {
  const token = randomBytes(3).toString("hex").toUpperCase();
  return `OPT-${token}`;
}

/** Parse QR payload: "OPTIMUS:OPT-ABC123" or raw "OPT-ABC123" / member id */
export function parseMemberQrPayload(raw: string) {
  const value = raw.trim();
  if (!value) return "";
  if (value.toUpperCase().startsWith("OPTIMUS:")) {
    return value.slice("OPTIMUS:".length).trim();
  }
  return value;
}

export function buildMemberQrPayload(memberCode: string) {
  return `OPTIMUS:${memberCode}`;
}

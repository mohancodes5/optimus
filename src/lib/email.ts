import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

export type EmailResult = {
  ok: boolean;
  id?: string;
  error?: string;
  skipped?: boolean;
};

export async function sendEmail(params: {
  to: string;
  subject: string;
  text: string;
  html?: string;
  idempotencyKey?: string;
}): Promise<EmailResult> {
  if (!resend) {
    return {
      ok: false,
      skipped: true,
      error: "RESEND_API_KEY is not configured",
    };
  }

  const from = process.env.EMAIL_FROM || "GymFlow <onboarding@resend.dev>";

  const { data, error } = await resend.emails.send(
    {
      from,
      to: [params.to],
      subject: params.subject,
      text: params.text,
      html:
        params.html ??
        `<div style="font-family:Arial,sans-serif;line-height:1.5;color:#0f1b2d">
          <p>${params.text.replace(/\n/g, "<br/>")}</p>
          <p style="color:#5b6b7c;font-size:12px;margin-top:24px">GymFlow · Membership alerts</p>
        </div>`,
    },
    params.idempotencyKey
      ? { idempotencyKey: params.idempotencyKey.slice(0, 256) }
      : undefined
  );

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true, id: data?.id };
}

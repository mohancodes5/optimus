# Real Email + SMS setup

GymFlow now sends real messages when providers are configured.

## What was added

| Trigger | Email | SMS |
|---------|-------|-----|
| Alerts page (manual) | ✅ Resend | ✅ Twilio |
| Dashboard “Send Renewal Alert” | ✅ | — |
| New member registered | ✅ Welcome | ✅ Welcome |
| Plan renewed | ✅ | ✅ |
| Daily cron 09:00 UTC | ✅ unpaid + expiring | ✅ unpaid + expiring |

If keys are missing, sends are **skipped** (logged in Notifications) and the app still works.

## 1. Resend (email)

1. Create account at https://resend.com  
2. Create an API key  
3. For production, verify a domain and set `EMAIL_FROM` to that domain  
4. For testing you can use `EMAIL_FROM="GymFlow <onboarding@resend.dev>"` (sends only to your Resend account email)

Add to Vercel + `.env`:

```env
RESEND_API_KEY="re_..."
EMAIL_FROM="GymFlow <onboarding@resend.dev>"
```

## 2. Twilio (SMS)

1. Create account at https://console.twilio.com  
2. Get Account SID + Auth Token  
3. Buy/get a phone number  
4. Member phones should be E.164 (`+919876543210`). 10-digit numbers are prefixed with `SMS_DEFAULT_COUNTRY_CODE` (default `+91`).

```env
TWILIO_ACCOUNT_SID="AC..."
TWILIO_AUTH_TOKEN="..."
TWILIO_PHONE_NUMBER="+1..."
SMS_DEFAULT_COUNTRY_CODE="+91"
```

## 3. Cron secret

```env
CRON_SECRET="long-random-string"
```

Vercel Cron calls `GET /api/cron/reminders` daily at 09:00 UTC with  
`Authorization: Bearer $CRON_SECRET`.

Manual test:

```bash
curl -H "Authorization: Bearer YOUR_CRON_SECRET" https://optimusv02.vercel.app/api/cron/reminders
```

## 4. Redeploy

After adding env vars on Vercel → **Redeploy**.

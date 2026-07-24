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

1. Twilio Console → Account SID + Auth Token  
2. Use a **Messaging Service SID** (MG...) — preferred  
   Or a From phone number  

```env
TWILIO_ACCOUNT_SID="ACxxxxxxxx"
TWILIO_AUTH_TOKEN="paste-real-auth-token-here"
TWILIO_MESSAGING_SERVICE_SID="MGxxxxxxxx"
SMS_DEFAULT_COUNTRY_CODE="+91"
```

Member phones: `+919876543210` (10-digit numbers get +91 automatically).

Welcome SMS example:  
`Hi Name, you are added to Optimus Fitness Studio. Your Monthly Basic plan is active until ...`

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

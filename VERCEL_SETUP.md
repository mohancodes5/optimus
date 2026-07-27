# Vercel + Supabase deploy

## Environment variables

Set these in **Vercel → Project → Settings → Environment Variables** (Production + Preview):

| Name | Notes |
|------|--------|
| `DATABASE_URL` | Supabase pooler port **6543** + `?pgbouncer=true` |
| `DIRECT_URL` | Supabase pooler port **5432** (session mode) |
| `AUTH_SECRET` | Long random secret (`openssl rand -base64 32`) |
| `NEXTAUTH_SECRET` | Same as `AUTH_SECRET` is fine |
| `AUTH_URL` | Your live URL, e.g. `https://your-app.vercel.app` |
| `AUTH_TRUST_HOST` | `true` |
| `TWILIO_*` / `RESEND_*` | Optional — SMS/email alerts |
| `CRON_SECRET` | Required if using daily reminder cron |

Do **not** use `db.xxx.supabase.co:5432` on Vercel (IPv6-only). Use `*.pooler.supabase.com`.

## First-time admin

Never ship demo passwords. On a machine with production DB URLs in `.env`:

```bash
# .env
SEED_ADMIN_EMAIL="owner@yourgym.com"
SEED_ADMIN_PASSWORD="your-strong-password"
SEED_ADMIN_NAME="Admin"
SEED_CLEAR_DEMO="true"   # optional wipe of members/payments

npm run db:seed
```

Then sign in with that email/password. Add staff users and real members from the app.

## Security checklist

1. Rotate any secrets that were ever shared in chat or committed by mistake.
2. Enable RLS on public tables if the Supabase Data API is exposed:

```sql
ALTER TABLE public."User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."MembershipPlan" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Member" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Payment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Attendance" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Notification" ENABLE ROW LEVEL SECURITY;
```

3. Redeploy after changing env vars.

# Vercel + Supabase (ready to deploy)

## Fixed
- Build error in `src/lib/plans.ts` — **fixed** (`next build` passes)
- Prisma switched to **PostgreSQL**
- Supabase project connected (`optimus` / `ap-southeast-1`)
- Tables created + demo data seeded
- Local Prisma Client connection verified

## Vercel environment variables

Copy values from your local `.env` into **Vercel → Project → Settings → Environment Variables**
(Production + Preview):

| Name | Where to get it |
|------|------------------|
| `DATABASE_URL` | From your `.env` (pooler port **6543**) |
| `DIRECT_URL` | From your `.env` (pooler port **5432**) |
| `AUTH_SECRET` | From your `.env` (or generate a new long secret) |
| `NEXTAUTH_SECRET` | Same as `AUTH_SECRET` is fine |
| `AUTH_URL` | `https://optimusv02.vercel.app` (your real site — **not** localhost, **not** gymflow-xyz) |
| `AUTH_TRUST_HOST` | `true` |

Then **Redeploy**.

Do **not** use `db.xxx.supabase.co:5432` on Vercel — that host is IPv6-only. Use the `*.pooler.supabase.com` URLs only.

## Local login

```bash
npm run dev
```

- Admin: `admin@gymflow.app` / `password123`
- Staff: `staff@gymflow.app` / `password123`

## Security

1. You shared DB passwords in chat — **rotate** them in Supabase after deploy works.
2. Tables have RLS disabled (Data API exposure). Run this in Supabase SQL Editor when ready:

```sql
ALTER TABLE public."User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."MembershipPlan" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Member" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Payment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Attendance" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Notification" ENABLE ROW LEVEL SECURITY;
```

Prisma still works afterward (uses a `BYPASSRLS` role).

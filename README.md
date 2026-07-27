# Optimus Fitness — Gym Management

Production gym management app built with **Next.js**, **Prisma**, **PostgreSQL**, **Auth.js**, **Tailwind CSS**, and **Recharts**. Deploy on **Vercel** + **Supabase**.

## Features

- Dashboard KPIs, revenue/growth charts, live date/time, expiring-soon alerts
- Members: search, status/payment/join-month filters, Excel export, QR codes
- Check-in / check-out via search or camera QR scanner
- Membership plans (Admin), INR pricing
- SMS/email reminders (Twilio + Resend)
- Roles: `ADMIN` | `STAFF`

## Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 16 (App Router) + TypeScript |
| UI | Tailwind CSS 4 + Radix components |
| DB | PostgreSQL via Prisma |
| Auth | Auth.js (NextAuth v5) credentials + JWT |
| Charts | Recharts |
| Deploy | Vercel |

## 1. Environment

```bash
cp .env.example .env
```

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Pooled Postgres (Vercel / app queries) |
| `DIRECT_URL` | Direct/session URL (migrations) |
| `AUTH_SECRET` | Auth.js secret (`openssl rand -base64 32`) |
| `AUTH_URL` | App URL (`http://localhost:3000` locally) |
| `SEED_ADMIN_EMAIL` | First admin email (bootstrap only) |
| `SEED_ADMIN_PASSWORD` | First admin password, min 10 chars |

See `.env.example` for Twilio, Resend, and cron secrets.

## 2. Install & bootstrap

```bash
npm install
npx prisma db push
npm run db:seed
npm run dev
```

`db:seed` creates **only** your admin user and starter plans (if none exist). It does **not** create fake members.

Optional: `SEED_CLEAR_DEMO=true` clears members/payments/attendance/notifications before bootstrap.

Open [http://localhost:3000](http://localhost:3000) and sign in with `SEED_ADMIN_*`.

Admins manage plans and can delete members. Staff manage members, check-ins, and alerts.

## 3. Deploy (Vercel)

1. Push to GitHub and import in [vercel.com/new](https://vercel.com/new)
2. Add env vars: `DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET`, `AUTH_URL` (your live URL), `AUTH_TRUST_HOST=true`
3. Deploy
4. Bootstrap admin once from your machine (production URLs in `.env`):

```bash
npx prisma db push
npm run db:seed
```

More detail: [VERCEL_SETUP.md](./VERCEL_SETUP.md)

## API overview

| Method | Route | Description |
|---|---|---|
| GET/POST | `/api/members` | List / create members |
| GET/PATCH/DELETE | `/api/members/[id]` | Profile, update, renew |
| GET/POST | `/api/plans` | List / create plans |
| PATCH/DELETE | `/api/plans/[id]` | Update / deactivate plan |
| GET/POST | `/api/attendance` | List / check-in & check-out |
| GET | `/api/dashboard/stats` | KPI + chart payloads |
| GET/POST | `/api/notifications` | List / send reminders |
| GET/PATCH | `/api/payments` | Payment history / status |

## Scripts

```bash
npm run dev          # Dev server
npm run build        # prisma generate + production build
npm run db:push      # Sync schema to DB
npm run db:seed      # Production admin + starter plans only
npm run db:studio    # Prisma Studio
```

## License

MIT

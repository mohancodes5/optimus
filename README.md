# GymFlow — Gym Management Application

Production-ready full-stack gym management dashboard built with **Next.js App Router**, **Prisma**, **PostgreSQL**, **NextAuth.js**, **Tailwind CSS**, and **Recharts**. Optimized for **Vercel** + **Supabase** or **Neon**.

## Features

- Interactive dashboard with KPI cards, revenue/growth charts, and expiring-soon alerts
- Member CRUD with search, filters, pagination, and profile history
- Membership plan management (Admin)
- Check-in / attendance tracker with QR simulator
- Simulated email/SMS renewal & unpaid reminders
- Role-based access: `ADMIN` | `STAFF`

## Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 16 (App Router) + TypeScript |
| UI | Tailwind CSS 4 + Radix/shadcn-style components |
| DB | PostgreSQL via Prisma ORM |
| Auth | Auth.js (NextAuth v5) credentials + JWT |
| Charts | Recharts |
| Deploy | Vercel serverless |

## Project structure

```
prisma/
  schema.prisma          # User, Member, MembershipPlan, Payment, Attendance, Notification
  seed.ts                # Demo admin/staff + sample members
src/
  app/
    (auth)/login/        # Sign-in
    (dashboard)/         # Protected app shell
      page.tsx           # Dashboard hub
      members/           # List + profile
      plans/             # Plan pricing
      check-in/          # Attendance
      notifications/     # Alerts
    api/                 # REST API routes
  components/            # UI + feature modules
  lib/                   # auth, prisma, validations, utils
  middleware.ts          # Route protection
```

## 1. Environment setup

Copy the example env file:

```bash
cp .env.example .env
```

### Required variables

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Pooled Postgres URL (use for app queries on Vercel) |
| `DIRECT_URL` | Direct Postgres URL (migrations / `db push`) |
| `AUTH_SECRET` | Random secret for Auth.js (`openssl rand -base64 32`) |
| `AUTH_URL` | App URL (`http://localhost:3000` locally) |

### Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. **Project Settings → Database → Connection string**
3. Use **Transaction pooler** (port `6543`) for `DATABASE_URL` and append `?pgbouncer=true`
4. Use **Direct connection** (port `5432`) for `DIRECT_URL`

Example:

```env
DATABASE_URL="postgresql://postgres.xxxx:PASSWORD@aws-0-....pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.xxxx:PASSWORD@aws-0-....supabase.com:5432/postgres"
AUTH_SECRET="paste-generated-secret"
AUTH_URL="http://localhost:3000"
```

### Neon

1. Create a project at [neon.tech](https://neon.tech)
2. Copy the pooled connection string → `DATABASE_URL`
3. Copy the direct (non-pooled) string → `DIRECT_URL`

## 2. Local install & database

```bash
npm install
npx prisma db push
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Demo logins

| Role | Email | Password |
|---|---|---|
| Admin | `admin@gymflow.app` | `password123` |
| Staff | `staff@gymflow.app` | `password123` |

Admins can create/edit/delete plans and delete members. Staff can manage members, check-ins, and notifications.

## Upload to GitHub

The project is not a git repo yet. Run these in the project folder (`Optimus`):

### 1. Create an empty repo on GitHub
1. Go to [github.com/new](https://github.com/new)
2. Name it e.g. `gymflow` (Public or Private)
3. **Do not** add a README, `.gitignore`, or license (this folder already has them)
4. Click **Create repository**

### 2. Push this project

```bash
cd C:\Users\MORULAA\Desktop\Optimus

git init
git add .
git commit -m "Initial commit: GymFlow gym management app"

git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/gymflow.git
git push -u origin main
```

Replace `YOUR_USERNAME` and `gymflow` with your GitHub username and repo name.

If GitHub asks you to sign in, use a **Personal Access Token** as the password (Settings → Developer settings → Personal access tokens), or sign in with GitHub CLI: `gh auth login`.

**Never commit `.env`** — it is already in `.gitignore`. Only `.env.example` should be on GitHub.

---

## Connect PostgreSQL (Supabase or Neon)

Locally the app uses **SQLite** so login works without setup. For production (and Vercel), switch to **PostgreSQL**.

### A. Create a database

**Option 1 — Neon (simple)**  
1. Sign up at [neon.tech](https://neon.tech) → create a project  
2. Open **Connection details**  
3. Copy **Pooled** connection string → `DATABASE_URL`  
4. Copy **Direct** connection string → `DIRECT_URL`

**Option 2 — Supabase**  
1. Sign up at [supabase.com](https://supabase.com) → create a project  
2. **Project Settings → Database → Connection string**  
3. **Transaction pooler** (port `6543`) → `DATABASE_URL` (add `?pgbouncer=true` if missing)  
4. **Direct** (port `5432`) → `DIRECT_URL`

### B. Switch Prisma from SQLite to PostgreSQL

Open `prisma/schema.prisma` and change the top to:

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

Update `prisma.config.ts` datasource url to use env (or remove hardcoded sqlite path).

Put this in your `.env`:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://USER:PASSWORD@HOST:5432/postgres"
AUTH_SECRET="paste-a-long-random-secret"
NEXTAUTH_SECRET="paste-a-long-random-secret"
AUTH_URL="http://localhost:3000"
```

Then create tables and demo users:

```bash
npx prisma generate
npx prisma db push
npm run db:seed
npm run dev
```

Login stays the same: `admin@gymflow.app` / `password123`

### C. Use the same Postgres on Vercel

1. Import the GitHub repo in [vercel.com/new](https://vercel.com/new)
2. Add env vars: `DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET`, `AUTH_URL` (`https://your-app.vercel.app`)
3. Deploy
4. From your PC (with production URLs in `.env`), run `npx prisma db push` and `npm run db:seed` once

## 3. One-click Vercel deployment

### Option A — Deploy button / CLI

1. Push this repo to GitHub (steps above)
2. Import the repo in [vercel.com/new](https://vercel.com/new)
3. Add environment variables in the Vercel project settings:

   - `DATABASE_URL`
   - `DIRECT_URL`
   - `AUTH_SECRET`
   - `AUTH_URL` = `https://your-project.vercel.app`

4. Deploy
5. After the first deploy, run migrations against production from your machine:

```bash
# Point .env at production URLs temporarily, then:
npx prisma db push
npm run db:seed
```

Or use Vercel’s Prisma / database integrations (Neon / Supabase) for managed connection strings.

### Option B — Vercel CLI

```bash
npm i -g vercel
vercel
vercel env add DATABASE_URL
vercel env add DIRECT_URL
vercel env add AUTH_SECRET
vercel env add AUTH_URL
vercel --prod
```

### Build notes

- `postinstall` / `build` run `prisma generate`
- Dashboard routes are `force-dynamic` (auth + live DB data)
- Notifications are **simulated** (logged as sent) — wire Resend / Twilio when ready

## API overview

| Method | Route | Description |
|---|---|---|
| GET/POST | `/api/members` | List / create members |
| GET/PATCH/DELETE | `/api/members/[id]` | Profile, update, renew |
| GET/POST | `/api/plans` | List / create plans |
| PATCH/DELETE | `/api/plans/[id]` | Update / deactivate plan |
| GET/POST | `/api/attendance` | Today’s check-ins / mark attendance |
| GET | `/api/dashboard/stats` | KPI + chart payloads |
| GET/POST | `/api/notifications` | List / send reminders |
| GET/PATCH | `/api/payments` | Payment history / status |

## Scripts

```bash
npm run dev          # Next.js dev server
npm run build        # prisma generate + production build
npm run db:push      # Sync schema to DB
npm run db:seed      # Seed demo data
npm run db:studio    # Prisma Studio
```

## License

MIT

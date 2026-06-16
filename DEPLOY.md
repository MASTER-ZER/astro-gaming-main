# Astro Gaming — Deployment Guide

This project has been migrated away from Replit and prepared for production on **Vercel** with a **Supabase** PostgreSQL database.

## What was changed

- Removed all Replit-specific files and packages (`.replit`, `replit.md`, `server/replit_integrations`, `@replit/*`, `@google-cloud/storage`, `google-auth-library`, unused passport/session deps).
- Replaced the `pg` driver with `postgres-js` for better Supabase / serverless compatibility.
- Added `DATABASE_URL` (runtime pooler) and `DIRECT_DATABASE_URL` (migrations) support.
- Created a Vercel serverless entry point at `api/index.ts` and `vercel.json`.
- Fixed TypeScript errors caused by Express 5 strict types.
- Added `.env.example` and this guide.

## Deployed URLs

- **Production:** https://astro-gaming-main.vercel.app
- **Vercel Dashboard:** https://vercel.com/eyad-s-projects-7eb7c468/astro-gaming-main

## Required environment variables

In the Vercel dashboard (or via `vercel env add`), set:

```text
DATABASE_URL=postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=10
DIRECT_DATABASE_URL=postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres
NODE_ENV=production
```

Optional:

```text
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=https://astro-gaming-main.vercel.app/auth/google/callback
TELEGRAM_BOT_TOKEN=
ADMIN_PASSWORD=
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
```

> Get `DATABASE_URL` and `DIRECT_DATABASE_URL` from Supabase: **Project Settings → Database → Connection string**.

## Supabase setup steps

1. Create a new Supabase project.
2. Go to **Database → Connect** and copy:
   - **Transaction pooler** (port `6543`) → use as `DATABASE_URL`
   - **Direct connection** (port `5432`) → use as `DIRECT_DATABASE_URL`
3. Import the existing data (optional). Open the Supabase SQL Editor and run the contents of `astro_database_export.sql`.
4. Push the Drizzle schema to make sure columns like `balance_before`/`balance_after` exist:

```bash
npx drizzle-kit push
```

Or generate and apply migrations:

```bash
npm run db:generate
npx drizzle-kit migrate
```

## GitHub push (recommended for auto-deploy)

The project is already linked to Vercel. To enable automatic deploys on every push, create a GitHub repository and push:

```bash
# Replace USERNAME with your GitHub username
git remote add origin https://github.com/USERNAME/astro-gaming-main.git
git branch -M main
git push -u origin main
```

Then in the Vercel dashboard, connect the GitHub repository under **Settings → Git**.

## Local development

```bash
npm install
# copy .env.example to .env and fill it
cp .env.example .env
npm run dev
```

## Commands

```bash
npm run dev       # start local dev server
npm run build     # build client + server
npm run check     # TypeScript check
npm run db:push   # push schema changes to Supabase
```

## Known remaining items

- The database URL must be set for the production API to work.
- Telegram, Google OAuth, and Web Push are optional; leave env vars empty to disable them.
- Uploaded files are stored in the PostgreSQL database (base64) and cached in `uploads/`, so they survive Vercel's ephemeral filesystem.

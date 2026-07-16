# KCB Water Factory

A small web app for running a water jar delivery business:

- Record jars loaded to a vehicle for a distributor, empty jars returned, and the payment received in one entry.
- Record standalone payments against a distributor's outstanding dues.
- Track each distributor's running jar balance and outstanding due (ledger view).
- Weekly and monthly reports with per-distributor breakdowns, printable to PDF.
- Simple username/password login, with an in-app change-password page.

## Getting started

Install dependencies and run the dev server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### First login

On first run the app creates one login automatically:

- **Username:** `admin`
- **Password:** `kcb1234`

Sign in and change this password right away from the **Account** page (top right of the nav bar once logged in).

### Data storage

By default, data is stored in a local SQLite file at `data/app.db` (created automatically, not committed to git). This works for local use and for any host with a persistent filesystem (Render, Railway, Fly.io, a VPS).

**If you deploy to Vercel** (or any other host with an ephemeral/serverless filesystem), you must use a hosted database instead — a local file won't survive between deploys or across function instances. This app uses [Turso](https://turso.tech) (hosted SQLite) for that case; see below.

### Configuration

Copy `.env.example` to `.env.local` and set `SESSION_SECRET` to a long random string (`openssl rand -base64 32`) before deploying anywhere other than your own machine.

## Deploying to Vercel (with Turso)

1. **Create a Turso database** (free tier is enough for this app):
   - Install the CLI: `curl -sSfL https://get.tur.so/install.sh | bash`
   - Sign in: `turso auth login`
   - Create the database: `turso db create kcb-water-factory`
   - Get the connection URL: `turso db show kcb-water-factory --url`
   - Create an auth token: `turso db tokens create kcb-water-factory`
2. **Import the project on Vercel:**
   - Go to [vercel.com/new](https://vercel.com/new) and import this GitHub repo.
   - Vercel auto-detects Next.js — no build settings to change.
3. **Set environment variables** in the Vercel project (Settings → Environment Variables):
   - `SESSION_SECRET` — a long random string (`openssl rand -base64 32`)
   - `TURSO_DATABASE_URL` — the URL from step 1 (starts with `libsql://`)
   - `TURSO_AUTH_TOKEN` — the token from step 1
4. **Deploy.** On first request the app creates its tables and the default `admin` / `kcb1234` login in the Turso database automatically. Sign in and change the password right away.

If `TURSO_DATABASE_URL` is not set, the app always falls back to the local `data/app.db` file — so local development needs no Turso account at all.

## Building for production

```bash
npm run build
npm start
```

## Tech stack

Next.js (App Router) + TypeScript + Tailwind CSS, with SQLite/[libSQL](https://turso.tech) (via `@libsql/client`) for storage and a cookie-based session for login.

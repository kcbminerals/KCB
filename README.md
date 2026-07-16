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

Data is stored in a local SQLite file at `data/app.db` (created automatically, not committed to git). Back this file up regularly — it's the only copy of your records.

### Configuration

Copy `.env.example` to `.env.local` and set `SESSION_SECRET` to a long random string (`openssl rand -base64 32`) before deploying anywhere other than your own machine.

## Building for production

```bash
npm run build
npm start
```

## Tech stack

Next.js (App Router) + TypeScript + Tailwind CSS, with SQLite (via `better-sqlite3`) for storage and a cookie-based session for login — no external services required.

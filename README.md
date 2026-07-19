# KCB Minerals

A small web app for running KCB Minerals' water jar delivery business:

- Record jars loaded to a vehicle for a distributor and the payment received in one entry — with an editable date and time, so older entries can be backfilled.
- Record standalone payments against a distributor's outstanding dues.
- After saving a delivery or payment, a **Send on WhatsApp** button opens WhatsApp with a ready-made receipt (jars, bill, paid, remaining balance) addressed to that distributor's phone number — one tap to notify them.
- Track each distributor's running jar balance and outstanding due (ledger view), including which KCB1/KCB2/Enrich category and vehicle(s) they belong to — a distributor can be served by more than one vehicle.
- When adding a distributor you can enter their **previous balance** (old dues from before this app); it is counted into their outstanding due and shown separately on their report.
- Daily, weekly and monthly reports, searchable/filterable by distributor and by category, printable to PDF, exportable to CSV.
- Two account roles: **Admin** (full access, including distributors/vehicles/reports/user management) and **Staff** (can record and manage deliveries & payments and add new distributors — no access to reports or business totals).
- Simple username/password login, with an in-app change-password page.

All data is stored directly in a **Google Sheet in your own Google Drive** — you can open it anytime to view, filter, or export your raw data, in addition to using the app.

## One-time setup: connect your Google Sheet

The app needs a Google Cloud "service account" (a robot account only your app uses) with permission to edit one Google Sheet you own. This takes about 10 minutes, once:

1. **Create a Google Cloud project**
   - Go to [console.cloud.google.com](https://console.cloud.google.com/), and create a new project (any name, e.g. "KCB Minerals").
2. **Enable the Google Sheets API**
   - In the project, go to **APIs & Services → Library**, search for **Google Sheets API**, and click **Enable**.
3. **Create a service account**
   - Go to **APIs & Services → Credentials → Create Credentials → Service account**.
   - Give it any name (e.g. "kcb-sheets-bot") and click through the defaults to **Done**.
   - Click into the service account you just created → **Keys** tab → **Add Key → Create new key → JSON**. This downloads a `.json` file — keep it safe, it's a credential.
4. **Create the Google Sheet**
   - Go to [sheets.google.com](https://sheets.google.com) and create a new, blank spreadsheet (any name, e.g. "KCB Minerals Data").
   - Copy its **Sheet ID** from the URL: `https://docs.google.com/spreadsheets/d/`**`THIS_PART_IS_THE_ID`**`/edit`
   - Click **Share** on the sheet, and share it with the service account's email address (found in the downloaded JSON file, under `client_email`, looks like `xxx@your-project.iam.gserviceaccount.com`) — give it **Editor** access.
5. **Set your environment variables** — copy `.env.example` to `.env.local` and fill in, using values from the downloaded JSON file:
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL` — the `client_email` field
   - `GOOGLE_PRIVATE_KEY` — the `private_key` field (keep the quotes and `\n` sequences exactly as in the JSON file)
   - `GOOGLE_SHEET_ID` — the Sheet ID from step 4
   - `SESSION_SECRET` — any long random string (`openssl rand -base64 32`)

The app creates all the tabs it needs (Users, Distributors, Vehicles, Deliveries, Payments) and the default login automatically the first time it runs — you don't need to set up the sheet's columns yourself.

## Your data can never be deleted by the app

- **Deleting an entry in the app only moves it, never erases it.** A deleted delivery or payment is moved to the **DeletedDeliveries** / **DeletedPayments** tab of your Google Sheet (with a `deleted_at` timestamp), keeping the main tabs clean. The app always verifies the copy landed in the archive tab **before** removing the original. Restore any entry from the app's **Deleted** page — it moves back and counts everywhere again.
- **The app never removes tabs, columns, or rows** — its sheet-setup code only ever *adds* missing tabs and columns.
- **Google Sheets keeps full version history.** In the sheet, go to **File → Version history → See version history** to view or restore the entire sheet as it was at any earlier moment — your ultimate undo for accidental hand-edits.
- **The app locks its tabs inside Google Sheets.** On startup the app protects every tab it manages (Users, Distributors, Vehicles, Deliveries, Payments) so that **only the app's service account can edit them directly**. Anyone else you share the sheet with can view but not change the data — Google blocks their edits. As the **owner** of the file you always keep full edit access (useful for restoring a soft-deleted row by clearing its `deleted` cell); Google never locks the owner out.
- **The file lives in your own Google Drive.** Even if the whole file is deleted from Drive, it sits in the Drive **Trash for 30 days** and can be restored from there. Avoid sharing the sheet with Editor access beyond the app's service account and people you trust.
- **A second copy lives outside Google.** See **Backups** below — a daily snapshot goes to Vercel Blob storage, and admins can download a backup file anytime from the dashboard.

## Backups (a copy of your data outside Google)

Two independent backup paths, both containing every table (login password hashes are excluded on purpose):

- **Manual, no setup needed:** on the admin dashboard, **Quick actions → Download backup** saves a complete JSON snapshot to your phone/computer. Do this weekly and you always hold your own offline copy.
- **Automatic daily snapshot to Vercel** (one-time setup, free tier):
  1. In the [Vercel dashboard](https://vercel.com/dashboard), open the project → **Storage** tab → **Create Database → Blob** → connect it to this project (this auto-adds the `BLOB_READ_WRITE_TOKEN` environment variable).
  2. In **Settings → Environment Variables**, add `CRON_SECRET` = any long random string.
  3. Redeploy. Every night (~3:00 AM IST) the app stores a full snapshot in Blob storage under `backups/`, keeping the most recent 60. You can browse and download them in the Vercel dashboard's Storage tab.

To restore from a backup file, the data can be re-entered or re-imported into a fresh Google Sheet — the snapshot has one JSON section per tab with the exact column names.

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

Sign in and change this password right away from the **Account** page (top right of the nav bar once logged in). This account is an **Admin** — from the **Users** page it can create additional logins for staff (entry-only) or other admins.

### Roles

- **Admin** — everything: dashboard, deliveries, payments, distributors, vehicles, reports, and the Users page to add/deactivate logins.
- **Staff** — can add, edit and delete deliveries and payments, and register new distributors (and vehicles inline). Cannot see the dashboard, reports, distributor ledgers/balances, or the Users page.

## Deploying to Vercel

1. Complete the **One-time setup** above first (you need the Google Sheet connected either way).
2. Go to [vercel.com/new](https://vercel.com/new) and import this GitHub repo. Vercel auto-detects Next.js — no build settings to change.
3. In the Vercel project's **Settings → Environment Variables**, add the same four variables from your `.env.local`: `SESSION_SECRET`, `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY`, `GOOGLE_SHEET_ID`.
4. Deploy. You'll get a real `https://` address reachable from any phone or computer.

Since everything lives in the same Google Sheet regardless of where the app runs, your local copy and a deployed copy both read/write the same live data if they share the same `GOOGLE_SHEET_ID`.

## Building for production

```bash
npm run build
npm start
```

## Tech stack

Next.js (App Router) + TypeScript + Tailwind CSS, with a Google Sheet (via `google-spreadsheet` + a Google service account) as the data store, and a cookie-based session for login.

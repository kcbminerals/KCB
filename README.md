# KCB Minerals

A small web app for running KCB Minerals' water jar delivery business:

- Record jars loaded to a vehicle for a distributor and the payment received in one entry — with an editable date and time, so older entries can be backfilled.
- Record standalone payments against a distributor's outstanding dues.
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

- **Deleting an entry in the app only hides it.** When someone deletes a delivery or payment, the row stays in your Google Sheet with a `1` in its `deleted` column — it just stops appearing in the app and its reports. To restore an entry, open the sheet and clear that `deleted` cell.
- **The app never removes tabs, columns, or rows** — its sheet-setup code only ever *adds* missing tabs and columns.
- **Google Sheets keeps full version history.** In the sheet, go to **File → Version history → See version history** to view or restore the entire sheet as it was at any earlier moment — your ultimate undo for accidental hand-edits.
- **The file lives in your own Google Drive.** Even if the whole file is deleted from Drive, it sits in the Drive **Trash for 30 days** and can be restored from there. Avoid sharing the sheet with Editor access beyond the app's service account and people you trust.

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

import "server-only";
import { JWT } from "google-auth-library";
import { GoogleSpreadsheet, GoogleSpreadsheetWorksheet } from "google-spreadsheet";
import bcrypt from "bcryptjs";
import { nowIstTimestamp } from "@/lib/format";

const USERS_HEADERS = [
  "id",
  "username",
  "password_hash",
  "name",
  "role",
  "active",
  "created_at",
];
const DISTRIBUTORS_HEADERS = [
  "id",
  "name",
  "phone",
  "address",
  "price_per_jar",
  "category",
  "vehicle_id",
  "active",
  "created_at",
  "opening_balance",
  "vehicle_ids",
];
const VEHICLES_HEADERS = ["id", "name", "plate_number", "active", "created_at"];
const DELIVERIES_HEADERS = [
  "id",
  "date",
  "distributor_id",
  "vehicle_id",
  "jars_loaded",
  "jars_returned",
  "price_per_jar",
  "bill_amount",
  "paid_amount",
  "notes",
  "created_at",
  "deleted",
];
const PAYMENTS_HEADERS = [
  "id",
  "date",
  "distributor_id",
  "amount",
  "method",
  "notes",
  "created_at",
  "deleted",
];

// Archive tabs: deleted entries live here (moved out of the main tabs),
// so the working tabs stay clean while nothing is ever truly lost.
const DELETED_DELIVERIES_HEADERS = [...DELIVERIES_HEADERS, "deleted_at"];
const DELETED_PAYMENTS_HEADERS = [...PAYMENTS_HEADERS, "deleted_at"];

export const SHEET_SCHEMAS = {
  Users: USERS_HEADERS,
  Distributors: DISTRIBUTORS_HEADERS,
  Vehicles: VEHICLES_HEADERS,
  Deliveries: DELIVERIES_HEADERS,
  Payments: PAYMENTS_HEADERS,
  DeletedDeliveries: DELETED_DELIVERIES_HEADERS,
  DeletedPayments: DELETED_PAYMENTS_HEADERS,
} as const;

export type SheetName = keyof typeof SHEET_SCHEMAS;

declare global {
  var __kcbDoc: GoogleSpreadsheet | undefined;
  var __kcbSheetsReady: Promise<void> | undefined;
}

function getAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_PRIVATE_KEY;
  const sheetId = process.env.GOOGLE_SHEET_ID;
  if (!email || !key || !sheetId) {
    throw new Error(
      "Missing GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, or GOOGLE_SHEET_ID environment variables. See README for setup steps."
    );
  }
  return new JWT({
    email,
    // Vercel/`.env` values often store the key with literal "\n" sequences instead of real newlines.
    key: key.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
}

function getDoc(): GoogleSpreadsheet {
  if (!globalThis.__kcbDoc) {
    const sheetId = process.env.GOOGLE_SHEET_ID;
    if (!sheetId) {
      throw new Error("Missing GOOGLE_SHEET_ID environment variable.");
    }
    globalThis.__kcbDoc = new GoogleSpreadsheet(sheetId, getAuth());
  }
  return globalThis.__kcbDoc;
}

async function ensureSheet(
  doc: GoogleSpreadsheet,
  title: SheetName
): Promise<GoogleSpreadsheetWorksheet> {
  const headers = SHEET_SCHEMAS[title];
  let sheet = doc.sheetsByTitle[title];
  if (!sheet) {
    sheet = await doc.addSheet({ title, headerValues: [...headers] });
    return sheet;
  }
  await sheet.loadHeaderRow().catch(() => undefined);
  if (!sheet.headerValues || sheet.headerValues.length === 0) {
    await sheet.setHeaderRow([...headers]);
    return sheet;
  }
  // A sheet created by an older version of the app may be missing columns
  // that got added later (e.g. "role"/"active" on Users). Append any
  // missing headers without disturbing existing columns or data.
  const missing = headers.filter((h) => !sheet!.headerValues.includes(h));
  if (missing.length > 0) {
    await sheet.setHeaderRow([...sheet.headerValues, ...missing]);
  }
  return sheet;
}

// Marker so protection is only ever added once per tab.
const PROTECTION_DESCRIPTION =
  "Locked by the KCB Minerals app — data is managed through the app. " +
  "The sheet owner can still edit (e.g. to restore a soft-deleted row).";

/** Locks every app tab inside Google Sheets so that only the app's service
 *  account can edit it directly. Anyone else the sheet is shared with gets
 *  view-only behaviour on these tabs; the sheet OWNER always keeps full
 *  edit access (Google never locks out the owner). Best-effort: the app
 *  still works if protection can't be applied. */
async function protectSheets(doc: GoogleSpreadsheet): Promise<void> {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  if (!email) return;
  for (const title of Object.keys(SHEET_SCHEMAS) as SheetName[]) {
    const sheet = doc.sheetsByTitle[title];
    if (!sheet) continue;
    const alreadyProtected = (sheet.protectedRanges ?? []).some(
      (p) => p.description === PROTECTION_DESCRIPTION
    );
    if (alreadyProtected) continue;
    try {
      await sheet.addProtectedRange({
        range: { sheetId: sheet.sheetId },
        description: PROTECTION_DESCRIPTION,
        warningOnly: false,
        editors: { users: [email] },
      });
    } catch (err) {
      console.warn(`[kcb] Could not protect sheet "${title}":`, err);
    }
  }
}

/** One-off sweep: rows already flagged deleted in the main tabs are moved
 *  to their archive tab. Each row is copied and VERIFIED in the archive
 *  before it is removed from the main tab — the copy-first rule that keeps
 *  the "data is never lost" guarantee. */
async function sweepFlaggedRowsToArchive(doc: GoogleSpreadsheet): Promise<void> {
  const pairs: [string, string][] = [
    ["Deliveries", "DeletedDeliveries"],
    ["Payments", "DeletedPayments"],
  ];
  for (const [mainName, archiveName] of pairs) {
    try {
      const main = doc.sheetsByTitle[mainName];
      const archive = doc.sheetsByTitle[archiveName];
      if (!main || !archive) continue;
      // One row per pass with a fresh fetch each time: deleting a row
      // shifts the ones below it, so stale row handles must not be reused.
      for (;;) {
        const rows = await main.getRows();
        const target = rows.find((r) => {
          const v = String(r.get("deleted") ?? "").trim().toLowerCase();
          return v !== "" && v !== "0" && v !== "false" && v !== "no";
        });
        if (!target) break;
        const values: Record<string, string | number | boolean> = {};
        for (const h of main.headerValues ?? [])
          values[h] = (target.get(h) as string | number | boolean) ?? "";
        values["deleted_at"] = nowIstTimestamp();
        await archive.addRow(values);
        const copied = await archive.getRows();
        const id = Number(target.get("id"));
        if (!copied.some((r) => Number(r.get("id")) === id)) {
          console.warn(`[kcb] Archive copy not verified for ${mainName} id ${id}; leaving row in place.`);
          break;
        }
        await target.delete();
      }
    } catch (err) {
      console.warn(`[kcb] Could not sweep deleted rows from ${mainName}:`, err);
    }
  }
}

async function migrate(): Promise<void> {
  const doc = getDoc();
  await doc.loadInfo();

  for (const title of Object.keys(SHEET_SCHEMAS) as SheetName[]) {
    await ensureSheet(doc, title);
  }

  await protectSheets(doc);
  await sweepFlaggedRowsToArchive(doc);

  const usersSheet = doc.sheetsByTitle["Users"];
  const userRows = await usersSheet.getRows();
  if (userRows.length === 0) {
    const defaultPassword = "kcb1234";
    const hash = bcrypt.hashSync(defaultPassword, 10);
    await usersSheet.addRow({
      id: 1,
      username: "admin",
      password_hash: hash,
      name: "Admin",
      role: "admin",
      active: 1,
      created_at: nowIstTimestamp(),
    });
    console.log(
      `[kcb] Created default login -> username: admin, password: ${defaultPassword} (please change it after first login)`
    );
  }
}

export function ensureMigrated(): Promise<void> {
  if (!globalThis.__kcbSheetsReady) {
    globalThis.__kcbSheetsReady = migrate();
  }
  return globalThis.__kcbSheetsReady;
}

export async function getWorksheet(title: SheetName): Promise<GoogleSpreadsheetWorksheet> {
  await ensureMigrated();
  const doc = getDoc();
  const sheet = doc.sheetsByTitle[title];
  if (!sheet) {
    throw new Error(`Worksheet "${title}" not found after migration.`);
  }
  return sheet;
}

/** Computes the next auto-increment style id for a sheet's rows (max existing id + 1). */
export function nextId(rows: { get(key: string): unknown }[]): number {
  let max = 0;
  for (const row of rows) {
    const id = Number(row.get("id"));
    if (Number.isFinite(id) && id > max) max = id;
  }
  return max + 1;
}

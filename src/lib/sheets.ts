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
  "distributor_name",
  "vehicle_number",
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
  "distributor_name",
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

/** One-time migration to a names-only entry sheet: fills distributor_name /
 *  vehicle_number from the legacy id columns, then removes the id columns.
 *  Ordered so nothing is orphaned — a row's name is written (and confirmed
 *  present) before its id is dropped; distributor_id is only removed once
 *  every row has a resolved name. Per-tab try/catch means a hiccup just
 *  leaves that tab for the next run; it never breaks the app. */
async function replaceIdColumnsWithNames(doc: GoogleSpreadsheet): Promise<void> {
  const distName = new Map<number, string>();
  const vehName = new Map<number, string>();
  try {
    for (const r of await doc.sheetsByTitle["Distributors"].getRows()) {
      distName.set(Number(r.get("id")), String(r.get("name") ?? "").trim());
    }
    for (const r of await doc.sheetsByTitle["Vehicles"].getRows()) {
      vehName.set(Number(r.get("id")), String(r.get("name") ?? "").trim());
    }
  } catch {
    return; // registries unreadable — try again next run
  }

  const tabs: { name: string; hasVehicle: boolean }[] = [
    { name: "Deliveries", hasVehicle: true },
    { name: "Payments", hasVehicle: false },
    { name: "DeletedDeliveries", hasVehicle: true },
    { name: "DeletedPayments", hasVehicle: false },
  ];

  for (const { name, hasVehicle } of tabs) {
    try {
      const sheet = doc.sheetsByTitle[name];
      if (!sheet) continue;
      await sheet.loadHeaderRow().catch(() => undefined);
      const headers = sheet.headerValues ?? [];
      const cDistId = headers.indexOf("distributor_id");
      const cVehId = headers.indexOf("vehicle_id");
      const cDistName = headers.indexOf("distributor_name");
      const cVehNum = headers.indexOf("vehicle_number");
      if (cDistId === -1 && cVehId === -1) continue; // already migrated

      const rows = await sheet.getRows();
      let allDistNamed = true;
      if (rows.length > 0) {
        const maxRow = Math.max(...rows.map((r) => r.rowNumber));
        // One batched cell load/save for the whole tab instead of a save
        // per row — fast enough to finish well inside a request.
        await sheet.loadCells({
          startRowIndex: 1,
          endRowIndex: maxRow,
          startColumnIndex: 0,
          endColumnIndex: headers.length,
        });
        for (const row of rows) {
          const r0 = row.rowNumber - 1; // 0-based grid row
          if (cDistId !== -1 && cDistName !== -1) {
            const cell = sheet.getCell(r0, cDistName);
            if (!String(cell.value ?? "").trim()) {
              const resolved = distName.get(Number(row.get("distributor_id"))) ?? "";
              if (resolved) cell.value = resolved;
              else allDistNamed = false; // keep distributor_id as a fallback
            }
          }
          if (hasVehicle && cVehId !== -1 && cVehNum !== -1) {
            const cell = sheet.getCell(r0, cVehNum);
            if (!String(cell.value ?? "").trim()) {
              const vid = Number(row.get("vehicle_id"));
              cell.value = vid ? (vehName.get(vid) ?? "") : "";
            }
          }
        }
        await sheet.saveUpdatedCells();
      }

      // Delete legacy id columns (rightmost first so indices stay valid).
      // distributor_id is kept as a fallback if any row couldn't be named.
      await sheet.loadHeaderRow();
      const current = sheet.headerValues ?? [];
      const drop: number[] = [];
      if (cVehId !== -1) {
        const i = current.indexOf("vehicle_id");
        if (i >= 0) drop.push(i);
      }
      if (cDistId !== -1 && allDistNamed) {
        const i = current.indexOf("distributor_id");
        if (i >= 0) drop.push(i);
      }
      for (const idx of drop.sort((a, b) => b - a)) {
        await sheet.deleteColumns(idx, 1);
      }
    } catch (err) {
      console.warn(`[kcb] Could not replace id columns in ${name}:`, err);
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
  await replaceIdColumnsWithNames(doc);
  // NOTE: no automatic moving of rows here. Entries only ever move to the
  // Deleted tabs when someone explicitly deletes them in the app — never
  // on startup — so restoring an old sheet version can't silently sweep
  // live entries into the archive.

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
  let sheet = getDoc().sheetsByTitle[title];
  if (!sheet) {
    // The tab is missing even though this instance already migrated — most
    // likely the sheet was rolled back in Google Sheets' Version history,
    // which drops tabs the app created. Re-run migration once to rebuild
    // any missing tabs/columns, so the app self-heals without a redeploy.
    globalThis.__kcbSheetsReady = undefined;
    await ensureMigrated();
    sheet = getDoc().sheetsByTitle[title];
  }
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

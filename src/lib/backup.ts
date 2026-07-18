import "server-only";
import { getWorksheet, SHEET_SCHEMAS, type SheetName } from "@/lib/sheets";
import { nowIstTimestamp } from "@/lib/format";

export type Backup = {
  app: string;
  note: string;
  created_at: string;
  tables: Record<string, Record<string, string>[]>;
};

/** Reads every app tab from the Google Sheet into one JSON snapshot.
 *  Login password hashes are deliberately excluded so a leaked backup can
 *  never help someone attack the logins — worst case after a restore,
 *  passwords are simply reset. */
export async function buildBackup(): Promise<Backup> {
  const tables: Backup["tables"] = {};
  for (const title of Object.keys(SHEET_SCHEMAS) as SheetName[]) {
    const sheet = await getWorksheet(title);
    const rows = await sheet.getRows();
    const headers = (sheet.headerValues ?? []).filter(
      (h) => h && h !== "password_hash"
    );
    tables[title] = rows.map((row) =>
      Object.fromEntries(headers.map((h) => [h, String(row.get(h) ?? "")]))
    );
  }
  return {
    app: "KCB Minerals",
    note: "Full snapshot of all app data from the Google Sheet (password hashes excluded).",
    created_at: nowIstTimestamp(),
    tables,
  };
}

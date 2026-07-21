import "server-only";
import { getWorksheet, nextId, type SheetName } from "@/lib/sheets";
import { nowIstTimestamp, dateSortKey, timeSortKey } from "@/lib/format";
import type {
  Distributor,
  DistributorWithVehicle,
  Vehicle,
  DeliveryWithNames,
  PaymentWithNames,
  DistributorSummary,
  DistributorCategory,
} from "@/lib/types";
import { DISTRIBUTOR_CATEGORIES } from "@/lib/types";

// Note: deliberately no delete() here — removing a row is only allowed
// through the copy-first archive helpers below (see RemovableRow).
type SheetRow = {
  get(key: string): unknown;
  set(key: string, value: unknown): void;
  assign(obj: Record<string, unknown>): void;
  save(): Promise<void>;
};

function str(row: SheetRow, key: string): string | null {
  const val = row.get(key);
  if (val === undefined || val === null) return null;
  // Trim: stray whitespace from hand-edited cells must never affect
  // comparisons, filtering, or sorting.
  const s = String(val).trim();
  return s === "" ? null : s;
}

function num(row: SheetRow, key: string): number {
  const val = Number(row.get(key));
  return Number.isFinite(val) ? val : 0;
}

function numOrNull(row: SheetRow, key: string): number | null {
  const val = row.get(key);
  if (val === undefined || val === null || val === "") return null;
  const n = Number(val);
  return Number.isFinite(n) ? n : null;
}

/** A row counts as deleted when its "deleted" cell holds ANY mark — 1,
 *  TRUE (sheet checkbox), "yes", etc. Only an empty cell (or an explicit
 *  0/false/no) keeps the row live, so however the flag got written, a
 *  deleted entry can never sneak back into reports. */
function isDeletedRow(row: SheetRow): boolean {
  const raw = row.get("deleted");
  if (raw === undefined || raw === null) return false;
  const s = String(raw).trim().toLowerCase();
  return s !== "" && s !== "0" && s !== "false" && s !== "no";
}

// ---------- Distributors ----------

function parseVehicleIds(row: SheetRow): number[] {
  // Newer rows store a comma-separated list in "vehicle_ids"; rows created
  // before multi-vehicle support only have the single legacy "vehicle_id".
  const csv = str(row, "vehicle_ids");
  if (csv) {
    const ids = csv
      .split(",")
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isFinite(n) && n > 0);
    if (ids.length > 0) return [...new Set(ids)];
  }
  const legacy = numOrNull(row, "vehicle_id");
  return legacy ? [legacy] : [];
}

function rowToDistributor(row: SheetRow): Distributor {
  const category = str(row, "category");
  return {
    id: num(row, "id"),
    name: str(row, "name") ?? "",
    phone: str(row, "phone"),
    address: str(row, "address"),
    price_per_jar: num(row, "price_per_jar"),
    category: (DISTRIBUTOR_CATEGORIES as readonly string[]).includes(category ?? "")
      ? (category as DistributorCategory)
      : "KCB1",
    vehicle_ids: parseVehicleIds(row),
    opening_balance: num(row, "opening_balance"),
    active: num(row, "active"),
    created_at: str(row, "created_at") ?? "",
  };
}

export async function listDistributors(includeInactive = false): Promise<Distributor[]> {
  const sheet = await getWorksheet("Distributors");
  const rows = await sheet.getRows();
  const distributors = rows
    .map(rowToDistributor)
    .filter((d) => includeInactive || d.active === 1);
  distributors.sort((a, b) => a.name.localeCompare(b.name));
  return distributors;
}

export async function listDistributorsWithVehicle(
  includeInactive = false
): Promise<DistributorWithVehicle[]> {
  const [distributors, vehicles] = await Promise.all([
    listDistributors(includeInactive),
    listVehicles(true),
  ]);
  const vehicleMap = new Map(vehicles.map((v) => [v.id, v]));
  return distributors.map((d) => ({
    ...d,
    vehicle_labels: d.vehicle_ids
      .map((id) => vehicleMap.get(id))
      .filter((v): v is Vehicle => Boolean(v))
      .map((v) => `${v.name}${v.plate_number ? ` (${v.plate_number})` : ""}`),
  }));
}

export async function getDistributor(id: number): Promise<Distributor | undefined> {
  const sheet = await getWorksheet("Distributors");
  const rows = await sheet.getRows();
  const row = rows.find((r) => num(r, "id") === id);
  return row ? rowToDistributor(row) : undefined;
}

export async function createDistributor(data: {
  name: string;
  phone?: string | null;
  address?: string | null;
  pricePerJar: number;
  category: DistributorCategory;
  vehicleIds?: number[];
  openingBalance?: number;
}): Promise<number> {
  const sheet = await getWorksheet("Distributors");
  const rows = await sheet.getRows();
  const id = nextId(rows);
  const vehicleIds = data.vehicleIds ?? [];
  await sheet.addRow({
    id,
    name: data.name,
    phone: data.phone ?? "",
    address: data.address ?? "",
    price_per_jar: data.pricePerJar,
    category: data.category,
    // Legacy single-vehicle column kept in sync (first vehicle) so the
    // sheet stays readable by hand.
    vehicle_id: vehicleIds[0] ?? "",
    vehicle_ids: vehicleIds.join(","),
    opening_balance: data.openingBalance ?? 0,
    active: 1,
    created_at: nowIstTimestamp(),
  });
  return id;
}

export async function updateDistributor(
  id: number,
  data: {
    name: string;
    phone?: string | null;
    address?: string | null;
    pricePerJar: number;
    category: DistributorCategory;
    vehicleIds?: number[];
    openingBalance?: number;
  }
): Promise<void> {
  const sheet = await getWorksheet("Distributors");
  const rows = await sheet.getRows();
  const row = rows.find((r) => num(r, "id") === id);
  if (!row) return;
  const oldName = str(row, "name") ?? "";
  const vehicleIds = data.vehicleIds ?? [];
  row.assign({
    name: data.name,
    phone: data.phone ?? "",
    address: data.address ?? "",
    price_per_jar: data.pricePerJar,
    category: data.category,
    vehicle_id: vehicleIds[0] ?? "",
    vehicle_ids: vehicleIds.join(","),
    opening_balance: data.openingBalance ?? 0,
  });
  await row.save();
  // The Deliveries/Payments tabs store the distributor NAME as the link, so
  // a rename must update every past entry to keep them connected.
  await cascadeRename("distributor_name", oldName, data.name);
}

/** Updates the stored name/number in every entry row when a distributor or
 *  vehicle is renamed, so entries stay linked to it (the entry tabs key on
 *  the name/number, not an id). */
async function cascadeRename(
  field: "distributor_name" | "vehicle_number",
  oldName: string,
  newName: string
): Promise<void> {
  if (!oldName.trim() || oldName.trim().toLowerCase() === newName.trim().toLowerCase()) {
    return;
  }
  const sheets: SheetName[] =
    field === "distributor_name"
      ? ["Deliveries", "Payments", "DeletedDeliveries", "DeletedPayments"]
      : ["Deliveries", "DeletedDeliveries"];
  const oldKey = oldName.trim().toLowerCase();
  for (const name of sheets) {
    try {
      const sheet = await getWorksheet(name);
      if (!(sheet.headerValues ?? []).includes(field)) continue;
      const entryRows = await sheet.getRows();
      for (const r of entryRows) {
        const raw = String(r.get(field) ?? "").trim().toLowerCase();
        const key = field === "vehicle_number" ? raw.replace(/\s*\(.*\)\s*$/, "").trim() : raw;
        if (key === oldKey) {
          r.set(field, newName);
          await r.save();
        }
      }
    } catch (err) {
      console.warn(`[kcb] Rename cascade failed for ${name}:`, err);
    }
  }
}

export async function setDistributorActive(id: number, active: boolean): Promise<void> {
  const sheet = await getWorksheet("Distributors");
  const rows = await sheet.getRows();
  const row = rows.find((r) => num(r, "id") === id);
  if (!row) return;
  row.set("active", active ? 1 : 0);
  await row.save();
}

export async function listDistributorsSummary(
  includeInactive = false
): Promise<DistributorSummary[]> {
  const [distributors, deliveries, payments] = await Promise.all([
    listDistributorsWithVehicle(includeInactive),
    listDeliveries(),
    listPayments(),
  ]);

  return distributors.map((dist) => {
    const distDeliveries = deliveries.filter((d) => d.distributor_id === dist.id);
    const distPayments = payments.filter((p) => p.distributor_id === dist.id);
    const jarsLoaded = distDeliveries.reduce((sum, d) => sum + d.jars_loaded, 0);
    const jarsReturned = distDeliveries.reduce((sum, d) => sum + d.jars_returned, 0);
    const totalBilled = distDeliveries.reduce((sum, d) => sum + d.bill_amount, 0);
    const totalPaid =
      distDeliveries.reduce((sum, d) => sum + d.paid_amount, 0) +
      distPayments.reduce((sum, p) => sum + p.amount, 0);
    return {
      ...dist,
      jars_loaded: jarsLoaded,
      jars_returned: jarsReturned,
      jar_balance: jarsLoaded - jarsReturned,
      total_billed: totalBilled,
      total_paid: totalPaid,
      // The previous balance entered when the distributor was added counts
      // toward what they still owe.
      total_due: dist.opening_balance + totalBilled - totalPaid,
    };
  });
}

export async function getDistributorSummary(
  id: number
): Promise<DistributorSummary | undefined> {
  const summaries = await listDistributorsSummary(true);
  return summaries.find((d) => d.id === id);
}

// ---------- Vehicles ----------

function rowToVehicle(row: SheetRow): Vehicle {
  return {
    id: num(row, "id"),
    name: str(row, "name") ?? "",
    plate_number: str(row, "plate_number"),
    active: num(row, "active"),
    created_at: str(row, "created_at") ?? "",
  };
}

export async function listVehicles(includeInactive = false): Promise<Vehicle[]> {
  const sheet = await getWorksheet("Vehicles");
  const rows = await sheet.getRows();
  const vehicles = rows.map(rowToVehicle).filter((v) => includeInactive || v.active === 1);
  vehicles.sort((a, b) => a.name.localeCompare(b.name));
  return vehicles;
}

export async function getVehicle(id: number): Promise<Vehicle | undefined> {
  const sheet = await getWorksheet("Vehicles");
  const rows = await sheet.getRows();
  const row = rows.find((r) => num(r, "id") === id);
  return row ? rowToVehicle(row) : undefined;
}

export async function createVehicle(data: {
  name: string;
  plateNumber?: string | null;
}): Promise<number> {
  const sheet = await getWorksheet("Vehicles");
  const rows = await sheet.getRows();
  const id = nextId(rows);
  await sheet.addRow({
    id,
    name: data.name,
    plate_number: data.plateNumber ?? "",
    active: 1,
    created_at: nowIstTimestamp(),
  });
  return id;
}

export async function updateVehicle(
  id: number,
  data: { name: string; plateNumber?: string | null }
): Promise<void> {
  const sheet = await getWorksheet("Vehicles");
  const rows = await sheet.getRows();
  const row = rows.find((r) => num(r, "id") === id);
  if (!row) return;
  const oldName = str(row, "name") ?? "";
  row.assign({ name: data.name, plate_number: data.plateNumber ?? "" });
  await row.save();
  await cascadeRename("vehicle_number", oldName, data.name);
}

export async function setVehicleActive(id: number, active: boolean): Promise<void> {
  const sheet = await getWorksheet("Vehicles");
  const rows = await sheet.getRows();
  const row = rows.find((r) => num(r, "id") === id);
  if (!row) return;
  row.set("active", active ? 1 : 0);
  await row.save();
}

// ---------- Deliveries ----------

// The Deliveries/Payments tabs store the distributor NAME and vehicle NUMBER
// (not ids). To keep every report and dues total working unchanged, each row
// is resolved back to its distributor/vehicle record — and thus its internal
// id — at read time. Older rows that still carry an id are resolved by id as
// a fallback, so this works during and after the one-time migration.
type DistCtx = { byId: Map<number, Distributor>; byName: Map<string, Distributor> };
type VehCtx = { byId: Map<number, Vehicle>; byName: Map<string, Vehicle> };

function makeDistCtx(distributors: Distributor[]): DistCtx {
  return {
    byId: new Map(distributors.map((d) => [d.id, d])),
    byName: new Map(distributors.map((d) => [d.name.trim().toLowerCase(), d])),
  };
}
function makeVehCtx(vehicles: Vehicle[]): VehCtx {
  return {
    byId: new Map(vehicles.map((v) => [v.id, v])),
    byName: new Map(vehicles.map((v) => [v.name.trim().toLowerCase(), v])),
  };
}

/** Drops a "(plate)" suffix so a stored "KA01AB1234 (plate)" still matches. */
function vehicleNumberKey(raw: string): string {
  return raw.replace(/\s*\(.*\)\s*$/, "").trim().toLowerCase();
}

function resolveDistributor(row: SheetRow, ctx: DistCtx): Distributor | undefined {
  const name = str(row, "distributor_name");
  if (name) {
    const d = ctx.byName.get(name.trim().toLowerCase());
    if (d) return d;
  }
  const id = num(row, "distributor_id");
  return id ? ctx.byId.get(id) : undefined;
}

function resolveVehicle(row: SheetRow, ctx: VehCtx): Vehicle | undefined {
  const number = str(row, "vehicle_number");
  if (number) {
    const v = ctx.byName.get(vehicleNumberKey(number));
    if (v) return v;
  }
  const id = numOrNull(row, "vehicle_id");
  return id ? ctx.byId.get(id) : undefined;
}

function rowToDeliveryWithNames(
  row: SheetRow,
  dctx: DistCtx,
  vctx: VehCtx
): DeliveryWithNames {
  const dist = resolveDistributor(row, dctx);
  const veh = resolveVehicle(row, vctx);
  return {
    id: num(row, "id"),
    date: str(row, "date") ?? "",
    distributor_id: dist?.id ?? num(row, "distributor_id"),
    vehicle_id: veh?.id ?? numOrNull(row, "vehicle_id"),
    jars_loaded: num(row, "jars_loaded"),
    jars_returned: num(row, "jars_returned"),
    price_per_jar: num(row, "price_per_jar"),
    bill_amount: num(row, "bill_amount"),
    paid_amount: num(row, "paid_amount"),
    notes: str(row, "notes"),
    created_at: str(row, "created_at") ?? "",
    distributor_name: dist?.name ?? str(row, "distributor_name") ?? "Unknown",
    vehicle_name: veh?.name ?? str(row, "vehicle_number"),
  };
}

export async function listDeliveries(filters?: {
  from?: string;
  to?: string;
  distributorId?: number;
  limit?: number;
}): Promise<DeliveryWithNames[]> {
  const sheet = await getWorksheet("Deliveries");
  const [rows, distributors, vehicles] = await Promise.all([
    sheet.getRows(),
    listDistributors(true),
    listVehicles(true),
  ]);
  const dctx = makeDistCtx(distributors);
  const vctx = makeVehCtx(vehicles);

  let deliveries = rows
    .filter((row) => !isDeletedRow(row))
    .map((row) => rowToDeliveryWithNames(row, dctx, vctx));

  if (filters?.from) deliveries = deliveries.filter((d) => d.date >= filters.from!);
  if (filters?.to) deliveries = deliveries.filter((d) => d.date <= filters.to!);
  if (filters?.distributorId)
    deliveries = deliveries.filter((d) => d.distributor_id === filters.distributorId);

  // Newest first by the entry's own date and (editable) time — so a
  // backdated entry recorded late still lands in its true position.
  // Numeric keys tolerate any date/time cell format, not just clean ISO.
  deliveries.sort((a, b) => {
    const d = dateSortKey(b.date) - dateSortKey(a.date);
    if (d !== 0) return d;
    const t = timeSortKey(b.created_at) - timeSortKey(a.created_at);
    if (t !== 0) return t;
    return b.id - a.id;
  });

  if (filters?.limit) deliveries = deliveries.slice(0, filters.limit);
  return deliveries;
}

export async function getDelivery(id: number): Promise<DeliveryWithNames | undefined> {
  const sheet = await getWorksheet("Deliveries");
  const [rows, distributors, vehicles] = await Promise.all([
    sheet.getRows(),
    listDistributors(true),
    listVehicles(true),
  ]);
  const row = rows.find((r) => num(r, "id") === id && !isDeletedRow(r));
  if (!row) return undefined;
  return rowToDeliveryWithNames(row, makeDistCtx(distributors), makeVehCtx(vehicles));
}

/** The vehicle number stored in the Deliveries tab — the vehicle's name is
 *  its number in this business. Kept plain (no plate suffix) so it reads
 *  back cleanly when resolving the row to a vehicle. */
function vehicleLabel(v: Vehicle | undefined): string {
  return v?.name ?? "";
}

export async function createDelivery(data: {
  date: string;
  distributorId: number;
  vehicleId?: number | null;
  jarsLoaded: number;
  jarsReturned?: number;
  pricePerJar: number;
  paidAmount: number;
  notes?: string | null;
  createdAt?: string | null;
}): Promise<number> {
  const sheet = await getWorksheet("Deliveries");
  const [rows, dist, veh] = await Promise.all([
    sheet.getRows(),
    getDistributor(data.distributorId),
    data.vehicleId ? getVehicle(data.vehicleId) : Promise.resolve(undefined),
  ]);
  const id = nextId(rows);
  const billAmount = data.jarsLoaded * data.pricePerJar;
  await sheet.addRow({
    id,
    date: data.date,
    distributor_name: dist?.name ?? "",
    vehicle_number: vehicleLabel(veh),
    jars_loaded: data.jarsLoaded,
    jars_returned: data.jarsReturned ?? 0,
    price_per_jar: data.pricePerJar,
    bill_amount: billAmount,
    paid_amount: data.paidAmount,
    notes: data.notes ?? "",
    created_at: data.createdAt ?? nowIstTimestamp(),
  });
  await sortSheetByDate("Deliveries");
  return id;
}

export async function updateDelivery(
  id: number,
  data: {
    date: string;
    distributorId: number;
    vehicleId?: number | null;
    jarsLoaded: number;
    jarsReturned?: number;
    pricePerJar: number;
    paidAmount: number;
    notes?: string | null;
    createdAt?: string | null;
  }
): Promise<void> {
  const sheet = await getWorksheet("Deliveries");
  const [rows, dist, veh] = await Promise.all([
    sheet.getRows(),
    getDistributor(data.distributorId),
    data.vehicleId ? getVehicle(data.vehicleId) : Promise.resolve(undefined),
  ]);
  const row = rows.find((r) => num(r, "id") === id);
  if (!row) return;
  const billAmount = data.jarsLoaded * data.pricePerJar;
  row.assign({
    date: data.date,
    distributor_name: dist?.name ?? "",
    vehicle_number: vehicleLabel(veh),
    jars_loaded: data.jarsLoaded,
    jars_returned: data.jarsReturned ?? 0,
    price_per_jar: data.pricePerJar,
    bill_amount: billAmount,
    paid_amount: data.paidAmount,
    notes: data.notes ?? "",
    ...(data.createdAt ? { created_at: data.createdAt } : {}),
  });
  await row.save();
  await sortSheetByDate("Deliveries");
}

// Rows may only ever be removed from a tab AFTER a verified copy exists in
// another tab (archive on delete, main on restore) — the copy-first rule
// that keeps "data is never lost" true even though tabs stay clean.
type RemovableRow = SheetRow & { delete(): Promise<void> };

/** Deleting an entry MOVES it to the archive tab: copy to the archive,
 *  verify the copy landed, and only then remove it from the main tab. */
async function moveRowToArchive(
  mainName: "Deliveries" | "Payments",
  id: number
): Promise<void> {
  const archiveName = mainName === "Deliveries" ? "DeletedDeliveries" : "DeletedPayments";
  const sheet = await getWorksheet(mainName);
  const rows = await sheet.getRows();
  const row = rows.find((r) => num(r, "id") === id);
  if (!row) return;
  const archive = await getWorksheet(archiveName);
  const values: Record<string, string | number | boolean> = {};
  for (const h of sheet.headerValues ?? [])
    values[h] = (row.get(h) as string | number | boolean) ?? "";
  values["deleted"] = 1;
  values["deleted_at"] = nowIstTimestamp();
  await archive.addRow(values);
  const copied = await archive.getRows();
  if (!copied.some((r) => num(r, "id") === id)) {
    throw new Error(`Archive copy could not be verified for ${mainName} id ${id}; entry NOT deleted.`);
  }
  await (row as RemovableRow).delete();
}

export async function deleteDelivery(id: number): Promise<void> {
  await moveRowToArchive("Deliveries", id);
}

/** Restoring moves the entry back from the archive tab to the main tab,
 *  with the same copy-first verification, then re-sorts the main tab. */
async function restoreFromArchive(
  mainName: "Deliveries" | "Payments",
  id: number
): Promise<void> {
  const archiveName = mainName === "Deliveries" ? "DeletedDeliveries" : "DeletedPayments";
  const archive = await getWorksheet(archiveName);
  const rows = await archive.getRows();
  const row = rows.find((r) => num(r, "id") === id);
  if (!row) return;
  const sheet = await getWorksheet(mainName);
  const values: Record<string, string | number | boolean> = {};
  for (const h of sheet.headerValues ?? [])
    values[h] = (row.get(h) as string | number | boolean) ?? "";
  values["deleted"] = "";
  await sheet.addRow(values);
  const restored = await sheet.getRows();
  if (!restored.some((r) => num(r, "id") === id)) {
    throw new Error(`Restore copy could not be verified for ${mainName} id ${id}; archive row kept.`);
  }
  await (row as RemovableRow).delete();
  await sortSheetByDate(mainName);
}

export async function restoreDelivery(id: number): Promise<void> {
  await restoreFromArchive("Deliveries", id);
}

export async function restorePayment(id: number): Promise<void> {
  await restoreFromArchive("Payments", id);
}

export type DeletedDelivery = DeliveryWithNames & { deleted_at: string };
export type DeletedPayment = PaymentWithNames & { deleted_at: string };

/** Archived (deleted) deliveries, newest first — for the Deleted page. */
export async function listDeletedDeliveries(): Promise<DeletedDelivery[]> {
  const sheet = await getWorksheet("DeletedDeliveries");
  const [rows, distributors, vehicles] = await Promise.all([
    sheet.getRows(),
    listDistributors(true),
    listVehicles(true),
  ]);
  const dctx = makeDistCtx(distributors);
  const vctx = makeVehCtx(vehicles);
  const deliveries = rows.map((row) => ({
    ...rowToDeliveryWithNames(row, dctx, vctx),
    deleted_at: str(row, "deleted_at") ?? "",
  }));
  deliveries.sort((a, b) => {
    const d = dateSortKey(b.date) - dateSortKey(a.date);
    if (d !== 0) return d;
    return timeSortKey(b.created_at) - timeSortKey(a.created_at) || b.id - a.id;
  });
  return deliveries;
}

/** Archived (deleted) payments, newest first — for the Deleted page. */
export async function listDeletedPayments(): Promise<DeletedPayment[]> {
  const sheet = await getWorksheet("DeletedPayments");
  const [rows, distributors] = await Promise.all([sheet.getRows(), listDistributors(true)]);
  const dctx = makeDistCtx(distributors);
  const payments = rows.map((row) => ({
    ...rowToPaymentWithNames(row, dctx),
    deleted_at: str(row, "deleted_at") ?? "",
  }));
  payments.sort((a, b) => {
    const d = dateSortKey(b.date) - dateSortKey(a.date);
    if (d !== 0) return d;
    return timeSortKey(b.created_at) - timeSortKey(a.created_at) || b.id - a.id;
  });
  return payments;
}

/** Physically re-sorts the sheet's rows oldest-first by date then time, so
 *  the Google Sheet itself always reads in chronological order. Best-effort:
 *  entry saving must never fail because a cosmetic sort did. */
async function sortSheetByDate(sheetName: "Deliveries" | "Payments"): Promise<void> {
  try {
    const sheet = await getWorksheet(sheetName);
    const headers = sheet.headerValues ?? [];
    const dateIdx = headers.indexOf("date");
    const createdIdx = headers.indexOf("created_at");
    if (dateIdx === -1) return;
    await sheet.sortRange(
      { startRowIndex: 1, endRowIndex: sheet.rowCount, startColumnIndex: 0, endColumnIndex: sheet.columnCount },
      [
        { dimensionIndex: dateIdx, sortOrder: "ASCENDING" },
        ...(createdIdx !== -1
          ? [{ dimensionIndex: createdIdx, sortOrder: "ASCENDING" as const }]
          : []),
      ]
    );
  } catch (err) {
    console.warn(`[kcb] Could not sort sheet "${sheetName}":`, err);
  }
}

// ---------- Payments ----------

function rowToPaymentWithNames(row: SheetRow, dctx: DistCtx): PaymentWithNames {
  const dist = resolveDistributor(row, dctx);
  return {
    id: num(row, "id"),
    date: str(row, "date") ?? "",
    distributor_id: dist?.id ?? num(row, "distributor_id"),
    amount: num(row, "amount"),
    method: str(row, "method"),
    notes: str(row, "notes"),
    created_at: str(row, "created_at") ?? "",
    distributor_name: dist?.name ?? str(row, "distributor_name") ?? "Unknown",
  };
}

export async function listPayments(filters?: {
  from?: string;
  to?: string;
  distributorId?: number;
  limit?: number;
}): Promise<PaymentWithNames[]> {
  const sheet = await getWorksheet("Payments");
  const [rows, distributors] = await Promise.all([sheet.getRows(), listDistributors(true)]);
  const dctx = makeDistCtx(distributors);

  let payments = rows
    .filter((row) => !isDeletedRow(row))
    .map((row) => rowToPaymentWithNames(row, dctx));

  if (filters?.from) payments = payments.filter((p) => p.date >= filters.from!);
  if (filters?.to) payments = payments.filter((p) => p.date <= filters.to!);
  if (filters?.distributorId)
    payments = payments.filter((p) => p.distributor_id === filters.distributorId);

  // Same ordering rule as deliveries: date, then the entry's own time.
  payments.sort((a, b) => {
    const d = dateSortKey(b.date) - dateSortKey(a.date);
    if (d !== 0) return d;
    const t = timeSortKey(b.created_at) - timeSortKey(a.created_at);
    if (t !== 0) return t;
    return b.id - a.id;
  });

  if (filters?.limit) payments = payments.slice(0, filters.limit);
  return payments;
}

export async function createPayment(data: {
  date: string;
  distributorId: number;
  amount: number;
  method?: string | null;
  notes?: string | null;
  createdAt?: string | null;
}): Promise<number> {
  const sheet = await getWorksheet("Payments");
  const [rows, dist] = await Promise.all([
    sheet.getRows(),
    getDistributor(data.distributorId),
  ]);
  const id = nextId(rows);
  await sheet.addRow({
    id,
    date: data.date,
    distributor_name: dist?.name ?? "",
    amount: data.amount,
    method: data.method ?? "",
    notes: data.notes ?? "",
    created_at: data.createdAt ?? nowIstTimestamp(),
  });
  await sortSheetByDate("Payments");
  return id;
}

export async function deletePayment(id: number): Promise<void> {
  await moveRowToArchive("Payments", id);
}

// ---------- Reports & Dashboard ----------

export async function getDashboardStats(todayIso: string) {
  const [deliveries, payments, distributors] = await Promise.all([
    listDeliveries(),
    listPayments(),
    listDistributors(true),
  ]);

  const todayDeliveries = deliveries.filter((d) => d.date === todayIso);
  const todayPayments = payments.filter((p) => p.date === todayIso);

  const todayJarsLoaded = todayDeliveries.reduce((sum, d) => sum + d.jars_loaded, 0);
  const todayJarsReturned = todayDeliveries.reduce((sum, d) => sum + d.jars_returned, 0);
  const todayCollected =
    todayDeliveries.reduce((sum, d) => sum + d.paid_amount, 0) +
    todayPayments.reduce((sum, p) => sum + p.amount, 0);

  const totalBilled = deliveries.reduce((sum, d) => sum + d.bill_amount, 0);
  const totalPaid =
    deliveries.reduce((sum, d) => sum + d.paid_amount, 0) +
    payments.reduce((sum, p) => sum + p.amount, 0);
  const totalJarsLoaded = deliveries.reduce((sum, d) => sum + d.jars_loaded, 0);
  const totalJarsReturned = deliveries.reduce((sum, d) => sum + d.jars_returned, 0);
  const totalOpeningBalance = distributors.reduce((sum, d) => sum + d.opening_balance, 0);

  return {
    todayJarsLoaded,
    todayJarsReturned,
    todayCollected,
    totalOutstandingDue: totalOpeningBalance + totalBilled - totalPaid,
    totalJarsOut: totalJarsLoaded - totalJarsReturned,
  };
}

export type ReportRow = {
  distributor_id: number;
  distributor_name: string;
  jars_loaded: number;
  jars_returned: number;
  billed: number;
  collected: number;
};

export type Report = {
  from: string;
  to: string;
  totals: {
    jarsLoaded: number;
    jarsReturned: number;
    billed: number;
    collected: number;
  };
  byDistributor: ReportRow[];
};

export async function getReport(
  from: string,
  to: string,
  filters?: { distributorId?: number; category?: DistributorCategory }
): Promise<Report> {
  const [allDeliveries, allPayments, distributors] = await Promise.all([
    listDeliveries({ from, to }),
    listPayments({ from, to }),
    listDistributors(true),
  ]);

  const distributorMap = new Map(distributors.map((d) => [d.id, d]));
  const matchesFilters = (distributorId: number) => {
    if (filters?.distributorId && distributorId !== filters.distributorId) return false;
    if (filters?.category) {
      const dist = distributorMap.get(distributorId);
      if (dist?.category !== filters.category) return false;
    }
    return true;
  };
  const deliveries = allDeliveries.filter((d) => matchesFilters(d.distributor_id));
  const payments = allPayments.filter((p) => matchesFilters(p.distributor_id));

  const byDistributorMap = new Map<number, ReportRow>();

  for (const d of deliveries) {
    const existing = byDistributorMap.get(d.distributor_id);
    if (existing) {
      existing.jars_loaded += d.jars_loaded;
      existing.jars_returned += d.jars_returned;
      existing.billed += d.bill_amount;
      existing.collected += d.paid_amount;
    } else {
      byDistributorMap.set(d.distributor_id, {
        distributor_id: d.distributor_id,
        distributor_name: d.distributor_name,
        jars_loaded: d.jars_loaded,
        jars_returned: d.jars_returned,
        billed: d.bill_amount,
        collected: d.paid_amount,
      });
    }
  }

  for (const p of payments) {
    const existing = byDistributorMap.get(p.distributor_id);
    if (existing) {
      existing.collected += p.amount;
    } else {
      byDistributorMap.set(p.distributor_id, {
        distributor_id: p.distributor_id,
        distributor_name: p.distributor_name,
        jars_loaded: 0,
        jars_returned: 0,
        billed: 0,
        collected: p.amount,
      });
    }
  }

  const byDistributor = Array.from(byDistributorMap.values()).sort((a, b) =>
    a.distributor_name.localeCompare(b.distributor_name)
  );

  const totals = byDistributor.reduce(
    (acc, r) => ({
      jarsLoaded: acc.jarsLoaded + r.jars_loaded,
      jarsReturned: acc.jarsReturned + r.jars_returned,
      billed: acc.billed + r.billed,
      collected: acc.collected + r.collected,
    }),
    { jarsLoaded: 0, jarsReturned: 0, billed: 0, collected: 0 }
  );

  return { from, to, totals, byDistributor };
}

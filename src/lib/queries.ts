import "server-only";
import { getWorksheet, nextId } from "@/lib/sheets";
import { nowIstTimestamp } from "@/lib/format";
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

// Note: deliberately no delete() here — rows are never removed from the
// sheet, only flagged via the "deleted" column (soft delete).
type SheetRow = {
  get(key: string): unknown;
  set(key: string, value: unknown): void;
  assign(obj: Record<string, unknown>): void;
  save(): Promise<void>;
};

function str(row: SheetRow, key: string): string | null {
  const val = row.get(key);
  if (val === undefined || val === null || val === "") return null;
  return String(val);
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

// ---------- Distributors ----------

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
    vehicle_id: numOrNull(row, "vehicle_id"),
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
  return distributors.map((d) => {
    const vehicle = d.vehicle_id ? vehicleMap.get(d.vehicle_id) : undefined;
    return {
      ...d,
      vehicle_name: vehicle?.name ?? null,
      vehicle_plate_number: vehicle?.plate_number ?? null,
    };
  });
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
  vehicleId?: number | null;
}): Promise<number> {
  const sheet = await getWorksheet("Distributors");
  const rows = await sheet.getRows();
  const id = nextId(rows);
  await sheet.addRow({
    id,
    name: data.name,
    phone: data.phone ?? "",
    address: data.address ?? "",
    price_per_jar: data.pricePerJar,
    category: data.category,
    vehicle_id: data.vehicleId ?? "",
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
    vehicleId?: number | null;
  }
): Promise<void> {
  const sheet = await getWorksheet("Distributors");
  const rows = await sheet.getRows();
  const row = rows.find((r) => num(r, "id") === id);
  if (!row) return;
  row.assign({
    name: data.name,
    phone: data.phone ?? "",
    address: data.address ?? "",
    price_per_jar: data.pricePerJar,
    category: data.category,
    vehicle_id: data.vehicleId ?? "",
  });
  await row.save();
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
      total_due: totalBilled - totalPaid,
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
  row.assign({ name: data.name, plate_number: data.plateNumber ?? "" });
  await row.save();
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

async function rowToDeliveryWithNames(
  row: SheetRow,
  distributorMap: Map<number, Distributor>,
  vehicleMap: Map<number, Vehicle>
): Promise<DeliveryWithNames> {
  const distributorId = num(row, "distributor_id");
  const vehicleId = numOrNull(row, "vehicle_id");
  return {
    id: num(row, "id"),
    date: str(row, "date") ?? "",
    distributor_id: distributorId,
    vehicle_id: vehicleId,
    jars_loaded: num(row, "jars_loaded"),
    jars_returned: num(row, "jars_returned"),
    price_per_jar: num(row, "price_per_jar"),
    bill_amount: num(row, "bill_amount"),
    paid_amount: num(row, "paid_amount"),
    notes: str(row, "notes"),
    created_at: str(row, "created_at") ?? "",
    distributor_name: distributorMap.get(distributorId)?.name ?? "Unknown",
    vehicle_name: vehicleId ? (vehicleMap.get(vehicleId)?.name ?? null) : null,
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
  const distributorMap = new Map(distributors.map((d) => [d.id, d]));
  const vehicleMap = new Map(vehicles.map((v) => [v.id, v]));

  let deliveries = await Promise.all(
    rows
      .filter((row) => num(row, "deleted") !== 1)
      .map((row) => rowToDeliveryWithNames(row, distributorMap, vehicleMap))
  );

  if (filters?.from) deliveries = deliveries.filter((d) => d.date >= filters.from!);
  if (filters?.to) deliveries = deliveries.filter((d) => d.date <= filters.to!);
  if (filters?.distributorId)
    deliveries = deliveries.filter((d) => d.distributor_id === filters.distributorId);

  deliveries.sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
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
  const row = rows.find((r) => num(r, "id") === id && num(r, "deleted") !== 1);
  if (!row) return undefined;
  const distributorMap = new Map(distributors.map((d) => [d.id, d]));
  const vehicleMap = new Map(vehicles.map((v) => [v.id, v]));
  return rowToDeliveryWithNames(row, distributorMap, vehicleMap);
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
  const rows = await sheet.getRows();
  const id = nextId(rows);
  const billAmount = data.jarsLoaded * data.pricePerJar;
  await sheet.addRow({
    id,
    date: data.date,
    distributor_id: data.distributorId,
    vehicle_id: data.vehicleId ?? "",
    jars_loaded: data.jarsLoaded,
    jars_returned: data.jarsReturned ?? 0,
    price_per_jar: data.pricePerJar,
    bill_amount: billAmount,
    paid_amount: data.paidAmount,
    notes: data.notes ?? "",
    created_at: data.createdAt ?? nowIstTimestamp(),
  });
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
  const rows = await sheet.getRows();
  const row = rows.find((r) => num(r, "id") === id);
  if (!row) return;
  const billAmount = data.jarsLoaded * data.pricePerJar;
  row.assign({
    date: data.date,
    distributor_id: data.distributorId,
    vehicle_id: data.vehicleId ?? "",
    jars_loaded: data.jarsLoaded,
    jars_returned: data.jarsReturned ?? 0,
    price_per_jar: data.pricePerJar,
    bill_amount: billAmount,
    paid_amount: data.paidAmount,
    notes: data.notes ?? "",
    ...(data.createdAt ? { created_at: data.createdAt } : {}),
  });
  await row.save();
}

export async function deleteDelivery(id: number): Promise<void> {
  // Soft delete: the row is only flagged, never removed from the sheet,
  // so no action in the app can permanently destroy a record.
  const sheet = await getWorksheet("Deliveries");
  const rows = await sheet.getRows();
  const row = rows.find((r) => num(r, "id") === id);
  if (!row) return;
  row.set("deleted", 1);
  await row.save();
}

// ---------- Payments ----------

function rowToPaymentWithNames(
  row: SheetRow,
  distributorMap: Map<number, Distributor>
): PaymentWithNames {
  const distributorId = num(row, "distributor_id");
  return {
    id: num(row, "id"),
    date: str(row, "date") ?? "",
    distributor_id: distributorId,
    amount: num(row, "amount"),
    method: str(row, "method"),
    notes: str(row, "notes"),
    created_at: str(row, "created_at") ?? "",
    distributor_name: distributorMap.get(distributorId)?.name ?? "Unknown",
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
  const distributorMap = new Map(distributors.map((d) => [d.id, d]));

  let payments = rows
    .filter((row) => num(row, "deleted") !== 1)
    .map((row) => rowToPaymentWithNames(row, distributorMap));

  if (filters?.from) payments = payments.filter((p) => p.date >= filters.from!);
  if (filters?.to) payments = payments.filter((p) => p.date <= filters.to!);
  if (filters?.distributorId)
    payments = payments.filter((p) => p.distributor_id === filters.distributorId);

  payments.sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
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
  const rows = await sheet.getRows();
  const id = nextId(rows);
  await sheet.addRow({
    id,
    date: data.date,
    distributor_id: data.distributorId,
    amount: data.amount,
    method: data.method ?? "",
    notes: data.notes ?? "",
    created_at: data.createdAt ?? nowIstTimestamp(),
  });
  return id;
}

export async function deletePayment(id: number): Promise<void> {
  // Soft delete: the row is only flagged, never removed from the sheet,
  // so no action in the app can permanently destroy a record.
  const sheet = await getWorksheet("Payments");
  const rows = await sheet.getRows();
  const row = rows.find((r) => num(r, "id") === id);
  if (!row) return;
  row.set("deleted", 1);
  await row.save();
}

// ---------- Reports & Dashboard ----------

export async function getDashboardStats(todayIso: string) {
  const [deliveries, payments] = await Promise.all([listDeliveries(), listPayments()]);

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

  return {
    todayJarsLoaded,
    todayJarsReturned,
    todayCollected,
    totalOutstandingDue: totalBilled - totalPaid,
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

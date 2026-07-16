import "server-only";
import { dbAll, dbGet, dbRun } from "@/lib/db";
import type {
  Distributor,
  Vehicle,
  DeliveryWithNames,
  PaymentWithNames,
  DistributorSummary,
} from "@/lib/types";

// ---------- Distributors ----------

export async function listDistributors(includeInactive = false): Promise<Distributor[]> {
  if (includeInactive) {
    return dbAll<Distributor>("SELECT * FROM distributors ORDER BY name COLLATE NOCASE");
  }
  return dbAll<Distributor>(
    "SELECT * FROM distributors WHERE active = 1 ORDER BY name COLLATE NOCASE"
  );
}

export async function getDistributor(id: number): Promise<Distributor | undefined> {
  return dbGet<Distributor>("SELECT * FROM distributors WHERE id = ?", [id]);
}

export async function createDistributor(data: {
  name: string;
  phone?: string | null;
  address?: string | null;
  pricePerJar: number;
}): Promise<number> {
  const result = await dbRun(
    "INSERT INTO distributors (name, phone, address, price_per_jar) VALUES (?, ?, ?, ?)",
    [data.name, data.phone ?? null, data.address ?? null, data.pricePerJar]
  );
  return result.lastInsertRowid;
}

export async function updateDistributor(
  id: number,
  data: {
    name: string;
    phone?: string | null;
    address?: string | null;
    pricePerJar: number;
  }
): Promise<void> {
  await dbRun(
    "UPDATE distributors SET name = ?, phone = ?, address = ?, price_per_jar = ? WHERE id = ?",
    [data.name, data.phone ?? null, data.address ?? null, data.pricePerJar, id]
  );
}

export async function setDistributorActive(id: number, active: boolean): Promise<void> {
  await dbRun("UPDATE distributors SET active = ? WHERE id = ?", [active ? 1 : 0, id]);
}

export async function listDistributorsSummary(
  includeInactive = false
): Promise<DistributorSummary[]> {
  const distributors = await listDistributors(includeInactive);
  const deliveryAgg = await dbAll<{
    distributor_id: number;
    jars_loaded: number;
    jars_returned: number;
    total_billed: number;
    total_paid_deliveries: number;
  }>(
    `SELECT distributor_id,
            COALESCE(SUM(jars_loaded), 0) as jars_loaded,
            COALESCE(SUM(jars_returned), 0) as jars_returned,
            COALESCE(SUM(bill_amount), 0) as total_billed,
            COALESCE(SUM(paid_amount), 0) as total_paid_deliveries
     FROM deliveries GROUP BY distributor_id`
  );
  const paymentAgg = await dbAll<{ distributor_id: number; total_extra_paid: number }>(
    `SELECT distributor_id, COALESCE(SUM(amount), 0) as total_extra_paid
     FROM payments GROUP BY distributor_id`
  );

  const deliveryMap = new Map(deliveryAgg.map((d) => [d.distributor_id, d]));
  const paymentMap = new Map(paymentAgg.map((p) => [p.distributor_id, p.total_extra_paid]));

  return distributors.map((dist) => {
    const d = deliveryMap.get(dist.id);
    const extraPaid = paymentMap.get(dist.id) ?? 0;
    const jarsLoaded = d?.jars_loaded ?? 0;
    const jarsReturned = d?.jars_returned ?? 0;
    const totalBilled = d?.total_billed ?? 0;
    const totalPaid = (d?.total_paid_deliveries ?? 0) + extraPaid;
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
  const dist = await getDistributor(id);
  if (!dist) return undefined;
  const d = await dbGet<{
    jars_loaded: number;
    jars_returned: number;
    total_billed: number;
    total_paid_deliveries: number;
  }>(
    `SELECT COALESCE(SUM(jars_loaded), 0) as jars_loaded,
            COALESCE(SUM(jars_returned), 0) as jars_returned,
            COALESCE(SUM(bill_amount), 0) as total_billed,
            COALESCE(SUM(paid_amount), 0) as total_paid_deliveries
     FROM deliveries WHERE distributor_id = ?`,
    [id]
  );
  const p = await dbGet<{ total: number }>(
    "SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE distributor_id = ?",
    [id]
  );
  const totalPaid = (d?.total_paid_deliveries ?? 0) + (p?.total ?? 0);
  return {
    ...dist,
    jars_loaded: d?.jars_loaded ?? 0,
    jars_returned: d?.jars_returned ?? 0,
    jar_balance: (d?.jars_loaded ?? 0) - (d?.jars_returned ?? 0),
    total_billed: d?.total_billed ?? 0,
    total_paid: totalPaid,
    total_due: (d?.total_billed ?? 0) - totalPaid,
  };
}

// ---------- Vehicles ----------

export async function listVehicles(includeInactive = false): Promise<Vehicle[]> {
  if (includeInactive) {
    return dbAll<Vehicle>("SELECT * FROM vehicles ORDER BY name COLLATE NOCASE");
  }
  return dbAll<Vehicle>(
    "SELECT * FROM vehicles WHERE active = 1 ORDER BY name COLLATE NOCASE"
  );
}

export async function getVehicle(id: number): Promise<Vehicle | undefined> {
  return dbGet<Vehicle>("SELECT * FROM vehicles WHERE id = ?", [id]);
}

export async function createVehicle(data: {
  name: string;
  plateNumber?: string | null;
}): Promise<number> {
  const result = await dbRun("INSERT INTO vehicles (name, plate_number) VALUES (?, ?)", [
    data.name,
    data.plateNumber ?? null,
  ]);
  return result.lastInsertRowid;
}

export async function updateVehicle(
  id: number,
  data: { name: string; plateNumber?: string | null }
): Promise<void> {
  await dbRun("UPDATE vehicles SET name = ?, plate_number = ? WHERE id = ?", [
    data.name,
    data.plateNumber ?? null,
    id,
  ]);
}

export async function setVehicleActive(id: number, active: boolean): Promise<void> {
  await dbRun("UPDATE vehicles SET active = ? WHERE id = ?", [active ? 1 : 0, id]);
}

// ---------- Deliveries ----------

const DELIVERY_SELECT = `
  SELECT deliveries.*,
         distributors.name as distributor_name,
         vehicles.name as vehicle_name
  FROM deliveries
  JOIN distributors ON distributors.id = deliveries.distributor_id
  LEFT JOIN vehicles ON vehicles.id = deliveries.vehicle_id
`;

export async function listDeliveries(filters?: {
  from?: string;
  to?: string;
  distributorId?: number;
  limit?: number;
}): Promise<DeliveryWithNames[]> {
  const clauses: string[] = [];
  const params: (string | number)[] = [];
  if (filters?.from) {
    clauses.push("deliveries.date >= ?");
    params.push(filters.from);
  }
  if (filters?.to) {
    clauses.push("deliveries.date <= ?");
    params.push(filters.to);
  }
  if (filters?.distributorId) {
    clauses.push("deliveries.distributor_id = ?");
    params.push(filters.distributorId);
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const limit = filters?.limit ? `LIMIT ${Number(filters.limit)}` : "";
  return dbAll<DeliveryWithNames>(
    `${DELIVERY_SELECT} ${where} ORDER BY deliveries.date DESC, deliveries.id DESC ${limit}`,
    params
  );
}

export async function getDelivery(id: number): Promise<DeliveryWithNames | undefined> {
  return dbGet<DeliveryWithNames>(`${DELIVERY_SELECT} WHERE deliveries.id = ?`, [id]);
}

export async function createDelivery(data: {
  date: string;
  distributorId: number;
  vehicleId?: number | null;
  jarsLoaded: number;
  jarsReturned: number;
  pricePerJar: number;
  paidAmount: number;
  notes?: string | null;
}): Promise<number> {
  const billAmount = data.jarsLoaded * data.pricePerJar;
  const result = await dbRun(
    `INSERT INTO deliveries
      (date, distributor_id, vehicle_id, jars_loaded, jars_returned, price_per_jar, bill_amount, paid_amount, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.date,
      data.distributorId,
      data.vehicleId ?? null,
      data.jarsLoaded,
      data.jarsReturned,
      data.pricePerJar,
      billAmount,
      data.paidAmount,
      data.notes ?? null,
    ]
  );
  return result.lastInsertRowid;
}

export async function updateDelivery(
  id: number,
  data: {
    date: string;
    distributorId: number;
    vehicleId?: number | null;
    jarsLoaded: number;
    jarsReturned: number;
    pricePerJar: number;
    paidAmount: number;
    notes?: string | null;
  }
): Promise<void> {
  const billAmount = data.jarsLoaded * data.pricePerJar;
  await dbRun(
    `UPDATE deliveries SET
      date = ?, distributor_id = ?, vehicle_id = ?, jars_loaded = ?, jars_returned = ?,
      price_per_jar = ?, bill_amount = ?, paid_amount = ?, notes = ?
     WHERE id = ?`,
    [
      data.date,
      data.distributorId,
      data.vehicleId ?? null,
      data.jarsLoaded,
      data.jarsReturned,
      data.pricePerJar,
      billAmount,
      data.paidAmount,
      data.notes ?? null,
      id,
    ]
  );
}

export async function deleteDelivery(id: number): Promise<void> {
  await dbRun("DELETE FROM deliveries WHERE id = ?", [id]);
}

// ---------- Payments ----------

const PAYMENT_SELECT = `
  SELECT payments.*, distributors.name as distributor_name
  FROM payments
  JOIN distributors ON distributors.id = payments.distributor_id
`;

export async function listPayments(filters?: {
  from?: string;
  to?: string;
  distributorId?: number;
  limit?: number;
}): Promise<PaymentWithNames[]> {
  const clauses: string[] = [];
  const params: (string | number)[] = [];
  if (filters?.from) {
    clauses.push("payments.date >= ?");
    params.push(filters.from);
  }
  if (filters?.to) {
    clauses.push("payments.date <= ?");
    params.push(filters.to);
  }
  if (filters?.distributorId) {
    clauses.push("payments.distributor_id = ?");
    params.push(filters.distributorId);
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const limit = filters?.limit ? `LIMIT ${Number(filters.limit)}` : "";
  return dbAll<PaymentWithNames>(
    `${PAYMENT_SELECT} ${where} ORDER BY payments.date DESC, payments.id DESC ${limit}`,
    params
  );
}

export async function createPayment(data: {
  date: string;
  distributorId: number;
  amount: number;
  method?: string | null;
  notes?: string | null;
}): Promise<number> {
  const result = await dbRun(
    "INSERT INTO payments (date, distributor_id, amount, method, notes) VALUES (?, ?, ?, ?, ?)",
    [data.date, data.distributorId, data.amount, data.method ?? null, data.notes ?? null]
  );
  return result.lastInsertRowid;
}

export async function deletePayment(id: number): Promise<void> {
  await dbRun("DELETE FROM payments WHERE id = ?", [id]);
}

// ---------- Reports & Dashboard ----------

export async function getDashboardStats(todayIso: string) {
  const today = await dbGet<{
    jars_loaded: number;
    jars_returned: number;
    billed: number;
    collected: number;
  }>(
    `SELECT COALESCE(SUM(jars_loaded), 0) as jars_loaded,
            COALESCE(SUM(jars_returned), 0) as jars_returned,
            COALESCE(SUM(bill_amount), 0) as billed,
            COALESCE(SUM(paid_amount), 0) as collected
     FROM deliveries WHERE date = ?`,
    [todayIso]
  );
  const todayExtraPayments = await dbGet<{ total: number }>(
    "SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE date = ?",
    [todayIso]
  );

  const overall = await dbGet<{
    billed: number;
    paid: number;
    jars_loaded: number;
    jars_returned: number;
  }>(
    `SELECT COALESCE(SUM(bill_amount), 0) as billed, COALESCE(SUM(paid_amount), 0) as paid,
            COALESCE(SUM(jars_loaded), 0) as jars_loaded, COALESCE(SUM(jars_returned), 0) as jars_returned
     FROM deliveries`
  );
  const overallExtraPayments = await dbGet<{ total: number }>(
    "SELECT COALESCE(SUM(amount), 0) as total FROM payments"
  );

  return {
    todayJarsLoaded: today?.jars_loaded ?? 0,
    todayJarsReturned: today?.jars_returned ?? 0,
    todayCollected: (today?.collected ?? 0) + (todayExtraPayments?.total ?? 0),
    totalOutstandingDue:
      (overall?.billed ?? 0) - ((overall?.paid ?? 0) + (overallExtraPayments?.total ?? 0)),
    totalJarsOut: (overall?.jars_loaded ?? 0) - (overall?.jars_returned ?? 0),
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

export async function getReport(from: string, to: string): Promise<Report> {
  const deliveryRows = await dbAll<{
    distributor_id: number;
    distributor_name: string;
    jars_loaded: number;
    jars_returned: number;
    billed: number;
    collected_from_deliveries: number;
  }>(
    `SELECT distributor_id, distributors.name as distributor_name,
            COALESCE(SUM(jars_loaded), 0) as jars_loaded,
            COALESCE(SUM(jars_returned), 0) as jars_returned,
            COALESCE(SUM(bill_amount), 0) as billed,
            COALESCE(SUM(paid_amount), 0) as collected_from_deliveries
     FROM deliveries
     JOIN distributors ON distributors.id = deliveries.distributor_id
     WHERE date >= ? AND date <= ?
     GROUP BY distributor_id`,
    [from, to]
  );

  const paymentRows = await dbAll<{ distributor_id: number; total: number }>(
    `SELECT distributor_id, COALESCE(SUM(amount), 0) as total
     FROM payments WHERE date >= ? AND date <= ? GROUP BY distributor_id`,
    [from, to]
  );
  const paymentMap = new Map(paymentRows.map((p) => [p.distributor_id, p.total]));

  const byDistributor: ReportRow[] = deliveryRows.map((r) => ({
    distributor_id: r.distributor_id,
    distributor_name: r.distributor_name,
    jars_loaded: r.jars_loaded,
    jars_returned: r.jars_returned,
    billed: r.billed,
    collected: r.collected_from_deliveries + (paymentMap.get(r.distributor_id) ?? 0),
  }));

  // Include distributors who only made a standalone payment in this range
  for (const p of paymentRows) {
    if (!byDistributor.find((b) => b.distributor_id === p.distributor_id)) {
      const dist = await getDistributor(p.distributor_id);
      byDistributor.push({
        distributor_id: p.distributor_id,
        distributor_name: dist?.name ?? "Unknown",
        jars_loaded: 0,
        jars_returned: 0,
        billed: 0,
        collected: p.total,
      });
    }
  }

  byDistributor.sort((a, b) => a.distributor_name.localeCompare(b.distributor_name));

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

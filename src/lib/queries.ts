import "server-only";
import { db } from "@/lib/db";
import type {
  Distributor,
  Vehicle,
  DeliveryWithNames,
  PaymentWithNames,
  DistributorSummary,
} from "@/lib/types";

// ---------- Distributors ----------

export function listDistributors(includeInactive = false): Distributor[] {
  if (includeInactive) {
    return db
      .prepare("SELECT * FROM distributors ORDER BY name COLLATE NOCASE")
      .all() as Distributor[];
  }
  return db
    .prepare(
      "SELECT * FROM distributors WHERE active = 1 ORDER BY name COLLATE NOCASE"
    )
    .all() as Distributor[];
}

export function getDistributor(id: number): Distributor | undefined {
  return db.prepare("SELECT * FROM distributors WHERE id = ?").get(id) as
    | Distributor
    | undefined;
}

export function createDistributor(data: {
  name: string;
  phone?: string | null;
  address?: string | null;
  pricePerJar: number;
}): number {
  const result = db
    .prepare(
      "INSERT INTO distributors (name, phone, address, price_per_jar) VALUES (?, ?, ?, ?)"
    )
    .run(data.name, data.phone ?? null, data.address ?? null, data.pricePerJar);
  return Number(result.lastInsertRowid);
}

export function updateDistributor(
  id: number,
  data: {
    name: string;
    phone?: string | null;
    address?: string | null;
    pricePerJar: number;
  }
): void {
  db.prepare(
    "UPDATE distributors SET name = ?, phone = ?, address = ?, price_per_jar = ? WHERE id = ?"
  ).run(data.name, data.phone ?? null, data.address ?? null, data.pricePerJar, id);
}

export function setDistributorActive(id: number, active: boolean): void {
  db.prepare("UPDATE distributors SET active = ? WHERE id = ?").run(
    active ? 1 : 0,
    id
  );
}

export function listDistributorsSummary(
  includeInactive = false
): DistributorSummary[] {
  const distributors = listDistributors(includeInactive);
  const deliveryAgg = db
    .prepare(
      `SELECT distributor_id,
              COALESCE(SUM(jars_loaded), 0) as jars_loaded,
              COALESCE(SUM(jars_returned), 0) as jars_returned,
              COALESCE(SUM(bill_amount), 0) as total_billed,
              COALESCE(SUM(paid_amount), 0) as total_paid_deliveries
       FROM deliveries GROUP BY distributor_id`
    )
    .all() as {
    distributor_id: number;
    jars_loaded: number;
    jars_returned: number;
    total_billed: number;
    total_paid_deliveries: number;
  }[];
  const paymentAgg = db
    .prepare(
      `SELECT distributor_id, COALESCE(SUM(amount), 0) as total_extra_paid
       FROM payments GROUP BY distributor_id`
    )
    .all() as { distributor_id: number; total_extra_paid: number }[];

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

export function getDistributorSummary(
  id: number
): DistributorSummary | undefined {
  const dist = getDistributor(id);
  if (!dist) return undefined;
  const d = db
    .prepare(
      `SELECT COALESCE(SUM(jars_loaded), 0) as jars_loaded,
              COALESCE(SUM(jars_returned), 0) as jars_returned,
              COALESCE(SUM(bill_amount), 0) as total_billed,
              COALESCE(SUM(paid_amount), 0) as total_paid_deliveries
       FROM deliveries WHERE distributor_id = ?`
    )
    .get(id) as {
    jars_loaded: number;
    jars_returned: number;
    total_billed: number;
    total_paid_deliveries: number;
  };
  const p = db
    .prepare(
      "SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE distributor_id = ?"
    )
    .get(id) as { total: number };
  const totalPaid = d.total_paid_deliveries + p.total;
  return {
    ...dist,
    jars_loaded: d.jars_loaded,
    jars_returned: d.jars_returned,
    jar_balance: d.jars_loaded - d.jars_returned,
    total_billed: d.total_billed,
    total_paid: totalPaid,
    total_due: d.total_billed - totalPaid,
  };
}

// ---------- Vehicles ----------

export function listVehicles(includeInactive = false): Vehicle[] {
  if (includeInactive) {
    return db
      .prepare("SELECT * FROM vehicles ORDER BY name COLLATE NOCASE")
      .all() as Vehicle[];
  }
  return db
    .prepare("SELECT * FROM vehicles WHERE active = 1 ORDER BY name COLLATE NOCASE")
    .all() as Vehicle[];
}

export function getVehicle(id: number): Vehicle | undefined {
  return db.prepare("SELECT * FROM vehicles WHERE id = ?").get(id) as
    | Vehicle
    | undefined;
}

export function createVehicle(data: {
  name: string;
  plateNumber?: string | null;
}): number {
  const result = db
    .prepare("INSERT INTO vehicles (name, plate_number) VALUES (?, ?)")
    .run(data.name, data.plateNumber ?? null);
  return Number(result.lastInsertRowid);
}

export function updateVehicle(
  id: number,
  data: { name: string; plateNumber?: string | null }
): void {
  db.prepare("UPDATE vehicles SET name = ?, plate_number = ? WHERE id = ?").run(
    data.name,
    data.plateNumber ?? null,
    id
  );
}

export function setVehicleActive(id: number, active: boolean): void {
  db.prepare("UPDATE vehicles SET active = ? WHERE id = ?").run(
    active ? 1 : 0,
    id
  );
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

export function listDeliveries(filters?: {
  from?: string;
  to?: string;
  distributorId?: number;
  limit?: number;
}): DeliveryWithNames[] {
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
  return db
    .prepare(
      `${DELIVERY_SELECT} ${where} ORDER BY deliveries.date DESC, deliveries.id DESC ${limit}`
    )
    .all(...params) as DeliveryWithNames[];
}

export function getDelivery(id: number): DeliveryWithNames | undefined {
  return db
    .prepare(`${DELIVERY_SELECT} WHERE deliveries.id = ?`)
    .get(id) as DeliveryWithNames | undefined;
}

export function createDelivery(data: {
  date: string;
  distributorId: number;
  vehicleId?: number | null;
  jarsLoaded: number;
  jarsReturned: number;
  pricePerJar: number;
  paidAmount: number;
  notes?: string | null;
}): number {
  const billAmount = data.jarsLoaded * data.pricePerJar;
  const result = db
    .prepare(
      `INSERT INTO deliveries
        (date, distributor_id, vehicle_id, jars_loaded, jars_returned, price_per_jar, bill_amount, paid_amount, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      data.date,
      data.distributorId,
      data.vehicleId ?? null,
      data.jarsLoaded,
      data.jarsReturned,
      data.pricePerJar,
      billAmount,
      data.paidAmount,
      data.notes ?? null
    );
  return Number(result.lastInsertRowid);
}

export function updateDelivery(
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
): void {
  const billAmount = data.jarsLoaded * data.pricePerJar;
  db.prepare(
    `UPDATE deliveries SET
      date = ?, distributor_id = ?, vehicle_id = ?, jars_loaded = ?, jars_returned = ?,
      price_per_jar = ?, bill_amount = ?, paid_amount = ?, notes = ?
     WHERE id = ?`
  ).run(
    data.date,
    data.distributorId,
    data.vehicleId ?? null,
    data.jarsLoaded,
    data.jarsReturned,
    data.pricePerJar,
    billAmount,
    data.paidAmount,
    data.notes ?? null,
    id
  );
}

export function deleteDelivery(id: number): void {
  db.prepare("DELETE FROM deliveries WHERE id = ?").run(id);
}

// ---------- Payments ----------

const PAYMENT_SELECT = `
  SELECT payments.*, distributors.name as distributor_name
  FROM payments
  JOIN distributors ON distributors.id = payments.distributor_id
`;

export function listPayments(filters?: {
  from?: string;
  to?: string;
  distributorId?: number;
  limit?: number;
}): PaymentWithNames[] {
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
  return db
    .prepare(
      `${PAYMENT_SELECT} ${where} ORDER BY payments.date DESC, payments.id DESC ${limit}`
    )
    .all(...params) as PaymentWithNames[];
}

export function createPayment(data: {
  date: string;
  distributorId: number;
  amount: number;
  method?: string | null;
  notes?: string | null;
}): number {
  const result = db
    .prepare(
      "INSERT INTO payments (date, distributor_id, amount, method, notes) VALUES (?, ?, ?, ?, ?)"
    )
    .run(data.date, data.distributorId, data.amount, data.method ?? null, data.notes ?? null);
  return Number(result.lastInsertRowid);
}

export function deletePayment(id: number): void {
  db.prepare("DELETE FROM payments WHERE id = ?").run(id);
}

// ---------- Reports & Dashboard ----------

export function getDashboardStats(todayIso: string) {
  const today = db
    .prepare(
      `SELECT COALESCE(SUM(jars_loaded), 0) as jars_loaded,
              COALESCE(SUM(jars_returned), 0) as jars_returned,
              COALESCE(SUM(bill_amount), 0) as billed,
              COALESCE(SUM(paid_amount), 0) as collected
       FROM deliveries WHERE date = ?`
    )
    .get(todayIso) as {
    jars_loaded: number;
    jars_returned: number;
    billed: number;
    collected: number;
  };
  const todayExtraPayments = db
    .prepare("SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE date = ?")
    .get(todayIso) as { total: number };

  const overall = db
    .prepare(
      `SELECT COALESCE(SUM(bill_amount), 0) as billed, COALESCE(SUM(paid_amount), 0) as paid,
              COALESCE(SUM(jars_loaded), 0) as jars_loaded, COALESCE(SUM(jars_returned), 0) as jars_returned
       FROM deliveries`
    )
    .get() as {
    billed: number;
    paid: number;
    jars_loaded: number;
    jars_returned: number;
  };
  const overallExtraPayments = db
    .prepare("SELECT COALESCE(SUM(amount), 0) as total FROM payments")
    .get() as { total: number };

  return {
    todayJarsLoaded: today.jars_loaded,
    todayJarsReturned: today.jars_returned,
    todayCollected: today.collected + todayExtraPayments.total,
    totalOutstandingDue:
      overall.billed - (overall.paid + overallExtraPayments.total),
    totalJarsOut: overall.jars_loaded - overall.jars_returned,
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

export function getReport(from: string, to: string): Report {
  const deliveryRows = db
    .prepare(
      `SELECT distributor_id, distributors.name as distributor_name,
              COALESCE(SUM(jars_loaded), 0) as jars_loaded,
              COALESCE(SUM(jars_returned), 0) as jars_returned,
              COALESCE(SUM(bill_amount), 0) as billed,
              COALESCE(SUM(paid_amount), 0) as collected_from_deliveries
       FROM deliveries
       JOIN distributors ON distributors.id = deliveries.distributor_id
       WHERE date >= ? AND date <= ?
       GROUP BY distributor_id`
    )
    .all(from, to) as {
    distributor_id: number;
    distributor_name: string;
    jars_loaded: number;
    jars_returned: number;
    billed: number;
    collected_from_deliveries: number;
  }[];

  const paymentRows = db
    .prepare(
      `SELECT distributor_id, COALESCE(SUM(amount), 0) as total
       FROM payments WHERE date >= ? AND date <= ? GROUP BY distributor_id`
    )
    .all(from, to) as { distributor_id: number; total: number }[];
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
      const dist = getDistributor(p.distributor_id);
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

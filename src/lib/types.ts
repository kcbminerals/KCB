export const DISTRIBUTOR_CATEGORIES = ["KCB1", "KCB2", "Enrich"] as const;
export type DistributorCategory = (typeof DISTRIBUTOR_CATEGORIES)[number];

export const USER_ROLES = ["admin", "staff"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export type User = {
  id: number;
  username: string;
  name: string;
  role: UserRole;
  active: number;
  created_at: string;
};

export type Distributor = {
  id: number;
  name: string;
  phone: string | null;
  address: string | null;
  price_per_jar: number;
  category: DistributorCategory;
  /** A distributor can be served by more than one vehicle. */
  vehicle_ids: number[];
  /** Dues carried over from before this app (can be negative for advance/credit). */
  opening_balance: number;
  active: number;
  created_at: string;
};

export type DistributorWithVehicle = Distributor & {
  /** Display labels ("name (plate)") for each of the distributor's vehicles. */
  vehicle_labels: string[];
};

export type Vehicle = {
  id: number;
  name: string;
  plate_number: string | null;
  active: number;
  created_at: string;
};

export type Delivery = {
  id: number;
  date: string;
  distributor_id: number;
  vehicle_id: number | null;
  jars_loaded: number;
  jars_returned: number;
  price_per_jar: number;
  bill_amount: number;
  paid_amount: number;
  notes: string | null;
  created_at: string;
};

export type DeliveryWithNames = Delivery & {
  distributor_name: string;
  vehicle_name: string | null;
};

export type Payment = {
  id: number;
  date: string;
  distributor_id: number;
  amount: number;
  method: string | null;
  notes: string | null;
  created_at: string;
};

export type PaymentWithNames = Payment & {
  distributor_name: string;
};

export type DistributorSummary = DistributorWithVehicle & {
  jars_loaded: number;
  jars_returned: number;
  jar_balance: number;
  total_billed: number;
  total_paid: number;
  total_due: number;
};

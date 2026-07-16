export type Distributor = {
  id: number;
  name: string;
  phone: string | null;
  address: string | null;
  price_per_jar: number;
  active: number;
  created_at: string;
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

export type DistributorSummary = Distributor & {
  jars_loaded: number;
  jars_returned: number;
  jar_balance: number;
  total_billed: number;
  total_paid: number;
  total_due: number;
};

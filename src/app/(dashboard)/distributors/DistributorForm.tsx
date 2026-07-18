"use client";

import { useActionState, useState } from "react";
import type { DistributorFormState } from "./actions";
import type { Distributor, Vehicle } from "@/lib/types";
import { DISTRIBUTOR_CATEGORIES } from "@/lib/types";
import QuickAddVehicle from "./QuickAddVehicle";

export default function DistributorForm({
  action,
  distributor,
  vehicles,
  submitLabel = "Save distributor",
}: {
  action: (
    state: DistributorFormState,
    formData: FormData
  ) => Promise<DistributorFormState>;
  distributor?: Distributor;
  vehicles: Vehicle[];
  submitLabel?: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const [vehicleId, setVehicleId] = useState<number | "">(distributor?.vehicle_id ?? "");

  return (
    <form action={formAction} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="flex flex-col gap-1">
        <label htmlFor="name" className="text-sm font-medium text-slate-700">
          Distributor name
        </label>
        <input
          id="name"
          name="name"
          required
          defaultValue={distributor?.name}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="phone" className="text-sm font-medium text-slate-700">
          Phone
        </label>
        <input
          id="phone"
          name="phone"
          defaultValue={distributor?.phone ?? ""}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
        />
      </div>
      <div className="flex flex-col gap-1 sm:col-span-2">
        <label htmlFor="address" className="text-sm font-medium text-slate-700">
          Address
        </label>
        <input
          id="address"
          name="address"
          defaultValue={distributor?.address ?? ""}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="pricePerJar" className="text-sm font-medium text-slate-700">
          Price per jar
        </label>
        <input
          id="pricePerJar"
          name="pricePerJar"
          type="number"
          step="0.01"
          min="0"
          required
          defaultValue={distributor?.price_per_jar ?? ""}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="category" className="text-sm font-medium text-slate-700">
          Category
        </label>
        <select
          id="category"
          name="category"
          required
          defaultValue={distributor?.category ?? DISTRIBUTOR_CATEGORIES[0]}
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
        >
          {DISTRIBUTOR_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="vehicleId" className="text-sm font-medium text-slate-700">
          Vehicle number
        </label>
        <select
          id="vehicleId"
          name="vehicleId"
          value={vehicleId}
          onChange={(e) => setVehicleId(e.target.value ? Number(e.target.value) : "")}
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
        >
          <option value="">— none —</option>
          {vehicles.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
              {v.plate_number ? ` (${v.plate_number})` : ""}
            </option>
          ))}
        </select>
        <QuickAddVehicle onCreated={(id) => setVehicleId(id)} />
      </div>
      {state?.error && (
        <p className="sm:col-span-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}
      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-sky-500 disabled:opacity-60"
        >
          {pending ? "Saving..." : submitLabel}
        </button>
      </div>
    </form>
  );
}

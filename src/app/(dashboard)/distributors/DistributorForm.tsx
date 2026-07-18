"use client";

import { useActionState, useState } from "react";
import type { DistributorFormState } from "./actions";
import type { Distributor, Vehicle } from "@/lib/types";
import { DISTRIBUTOR_CATEGORIES } from "@/lib/types";

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
  const [vehicleIds, setVehicleIds] = useState<number[]>(distributor?.vehicle_ids ?? []);

  const toggleVehicle = (id: number) => {
    setVehicleIds((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]
    );
  };

  return (
    <form action={formAction} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <input type="hidden" name="vehicleIds" value={vehicleIds.join(",")} />
      <div className="flex flex-col gap-1">
        <label htmlFor="name" className="text-sm font-medium text-slate-700">
          Distributor name
        </label>
        <input
          id="name"
          name="name"
          required
          defaultValue={distributor?.name}
          className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
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
          className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
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
          className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
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
          className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="openingBalance" className="text-sm font-medium text-slate-700">
          Previous balance (₹)
        </label>
        <input
          id="openingBalance"
          name="openingBalance"
          type="number"
          step="0.01"
          defaultValue={distributor?.opening_balance ?? 0}
          className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
        />
        <p className="text-xs text-slate-400">
          Old dues from before this app — added to their outstanding due.
        </p>
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
          className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
        >
          {DISTRIBUTOR_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium text-slate-700">
          Vehicles (tick all that serve this distributor)
          {vehicleIds.length > 0 && (
            <span className="ml-1.5 rounded-full bg-sky-100 px-2 py-0.5 text-xs font-semibold text-sky-700">
              {vehicleIds.length} selected
            </span>
          )}
        </span>
        {vehicles.length > 0 && (
          <div className="flex max-h-40 flex-col gap-1.5 overflow-y-auto rounded-lg border border-slate-300 px-3 py-2.5">
            {vehicles.map((v) => (
              <label
                key={v.id}
                className="flex cursor-pointer items-center gap-2 text-sm text-slate-700"
              >
                <input
                  type="checkbox"
                  checked={vehicleIds.includes(v.id)}
                  onChange={() => toggleVehicle(v.id)}
                  className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                />
                {v.name}
                {v.plate_number ? ` (${v.plate_number})` : ""}
              </label>
            ))}
          </div>
        )}
        <input
          id="newVehicleNames"
          name="newVehicleNames"
          placeholder={
            vehicles.length > 0
              ? "Or type a new vehicle number to add it"
              : "Type the vehicle number, e.g. KA-01-AB-1234"
          }
          className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
        />
        <p className="text-xs text-slate-400">
          New vehicle numbers are created and linked when you save — separate
          several with commas.
        </p>
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
          className="w-full rounded-xl bg-gradient-to-b from-sky-500 to-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-sky-500/25 transition hover:from-sky-400 hover:to-sky-500 sm:w-auto sm:px-6 disabled:opacity-60"
        >
          {pending ? "Saving..." : submitLabel}
        </button>
      </div>
    </form>
  );
}

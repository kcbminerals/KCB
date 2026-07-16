"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import type { DeliveryFormState } from "./actions";
import type { Distributor, Vehicle, Delivery } from "@/lib/types";
import { todayIso } from "@/lib/format";

export default function DeliveryForm({
  action,
  distributors,
  vehicles,
  delivery,
  submitLabel = "Save delivery",
}: {
  action: (
    state: DeliveryFormState,
    formData: FormData
  ) => Promise<DeliveryFormState>;
  distributors: Distributor[];
  vehicles: Vehicle[];
  delivery?: Delivery;
  submitLabel?: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);

  const priceByDistributor = useMemo(
    () => new Map(distributors.map((d) => [d.id, d.price_per_jar])),
    [distributors]
  );

  const [distributorId, setDistributorId] = useState(
    delivery?.distributor_id ?? distributors[0]?.id ?? 0
  );
  const [pricePerJar, setPricePerJar] = useState(
    delivery?.price_per_jar ?? priceByDistributor.get(distributorId) ?? 0
  );
  const [jarsLoaded, setJarsLoaded] = useState(delivery?.jars_loaded ?? 0);
  const [paidAmount, setPaidAmount] = useState(delivery?.paid_amount ?? 0);

  const billAmount = jarsLoaded * pricePerJar;

  // After a successful new-delivery submission, clear the per-entry fields
  // (jars/amount) so the form is ready for the next entry, while keeping
  // date/distributor/vehicle/price for fast repeat entries.
  const lastSavedAt = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (!delivery && state?.savedAt && state.savedAt !== lastSavedAt.current) {
      lastSavedAt.current = state.savedAt;
      setJarsLoaded(0);
      setPaidAmount(0);
    }
  }, [delivery, state]);

  return (
    <form action={formAction} className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <div className="flex flex-col gap-1">
        <label htmlFor="date" className="text-sm font-medium text-slate-700">
          Date
        </label>
        <input
          id="date"
          name="date"
          type="date"
          required
          defaultValue={delivery?.date ?? todayIso()}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label
          htmlFor="distributorId"
          className="text-sm font-medium text-slate-700"
        >
          Distributor
        </label>
        <select
          id="distributorId"
          name="distributorId"
          required
          value={distributorId}
          onChange={(e) => {
            const id = Number(e.target.value);
            setDistributorId(id);
            setPricePerJar(priceByDistributor.get(id) ?? 0);
          }}
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
        >
          {distributors.length === 0 && <option value="">No distributors</option>}
          {distributors.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="vehicleId" className="text-sm font-medium text-slate-700">
          Vehicle
        </label>
        <select
          id="vehicleId"
          name="vehicleId"
          defaultValue={delivery?.vehicle_id ?? ""}
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
        >
          <option value="">— none —</option>
          {vehicles.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="jarsLoaded" className="text-sm font-medium text-slate-700">
          Jars loaded
        </label>
        <input
          id="jarsLoaded"
          name="jarsLoaded"
          type="number"
          min="0"
          required
          value={jarsLoaded}
          onChange={(e) => setJarsLoaded(Number(e.target.value) || 0)}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label
          htmlFor="jarsReturned"
          className="text-sm font-medium text-slate-700"
        >
          Empty jars returned
        </label>
        <input
          id="jarsReturned"
          name="jarsReturned"
          type="number"
          min="0"
          required
          defaultValue={delivery?.jars_returned ?? 0}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label
          htmlFor="pricePerJar"
          className="text-sm font-medium text-slate-700"
        >
          Price per jar
        </label>
        <input
          id="pricePerJar"
          name="pricePerJar"
          type="number"
          step="0.01"
          min="0"
          required
          value={pricePerJar}
          onChange={(e) => setPricePerJar(Number(e.target.value) || 0)}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="paidAmount" className="text-sm font-medium text-slate-700">
          Amount received
        </label>
        <div className="flex gap-2">
          <input
            id="paidAmount"
            name="paidAmount"
            type="number"
            step="0.01"
            min="0"
            required
            value={paidAmount}
            onChange={(e) => setPaidAmount(Number(e.target.value) || 0)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
          <button
            type="button"
            onClick={() => setPaidAmount(billAmount)}
            className="whitespace-nowrap rounded-md border border-slate-300 px-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            Full
          </button>
        </div>
      </div>

      <div className="flex flex-col justify-end gap-1">
        <p className="text-sm text-slate-500">
          Bill: <span className="font-semibold text-slate-900">{billAmount.toFixed(2)}</span>
          {" · "}
          Due:{" "}
          <span className="font-semibold text-slate-900">
            {(billAmount - paidAmount).toFixed(2)}
          </span>
        </p>
      </div>

      <div className="flex flex-col gap-1 sm:col-span-3">
        <label htmlFor="notes" className="text-sm font-medium text-slate-700">
          Notes
        </label>
        <input
          id="notes"
          name="notes"
          defaultValue={delivery?.notes ?? ""}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
        />
      </div>

      {state?.error && (
        <p className="sm:col-span-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <div className="sm:col-span-3">
        <button
          type="submit"
          disabled={pending || distributors.length === 0}
          className="rounded-md bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-60"
        >
          {pending ? "Saving..." : submitLabel}
        </button>
      </div>
    </form>
  );
}

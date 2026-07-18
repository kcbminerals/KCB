"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import type { DeliveryFormState } from "./actions";
import type { Distributor, Vehicle, Delivery } from "@/lib/types";
import { todayIso, nowTimeValue, timeInputValue } from "@/lib/format";
import DistributorCombobox from "@/components/DistributorCombobox";
import WhatsAppButton from "@/components/WhatsAppButton";

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

  const distributorById = useMemo(
    () => new Map(distributors.map((d) => [d.id, d])),
    [distributors]
  );

  const initialDistributorId = delivery?.distributor_id ?? distributors[0]?.id;
  const [pricePerJar, setPricePerJar] = useState(
    delivery?.price_per_jar ??
      (initialDistributorId ? distributorById.get(initialDistributorId)?.price_per_jar : 0) ??
      0
  );
  const [vehicleId, setVehicleId] = useState<number | "">(
    delivery?.vehicle_id ??
      (initialDistributorId
        ? distributorById.get(initialDistributorId)?.vehicle_ids[0]
        : null) ??
      ""
  );
  const [jarsLoaded, setJarsLoaded] = useState(delivery?.jars_loaded ?? 0);
  const [paidAmount, setPaidAmount] = useState(delivery?.paid_amount ?? 0);

  // The pre-filled time is the person's wall clock, which the server can't
  // know at render time — hence suppressHydrationWarning on the input.
  const [time, setTime] = useState(() =>
    delivery ? timeInputValue(delivery.created_at) : nowTimeValue()
  );

  const billAmount = jarsLoaded * pricePerJar;

  // After a successful new-delivery submission, confirm the save and clear
  // the per-entry fields (jars/amount) so the form is ready for the next
  // entry, while keeping date/distributor/vehicle/price for repeat entries.
  const [showSaved, setShowSaved] = useState(false);
  const lastSavedAt = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (!delivery && state?.savedAt && state.savedAt !== lastSavedAt.current) {
      lastSavedAt.current = state.savedAt;
      setJarsLoaded(0);
      setPaidAmount(0);
      setTime(nowTimeValue());
      setShowSaved(true);
      const timer = setTimeout(() => setShowSaved(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [delivery, state]);

  return (
    <form action={formAction} className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <div className="grid grid-cols-2 gap-2">
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
            className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="time" className="text-sm font-medium text-slate-700">
            Time
          </label>
          <input
            id="time"
            name="time"
            type="time"
            required
            suppressHydrationWarning
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label
          htmlFor="distributorId"
          className="text-sm font-medium text-slate-700"
        >
          Distributor
        </label>
        <DistributorCombobox
          name="distributorId"
          distributors={distributors}
          defaultId={initialDistributorId}
          onSelect={(id) => {
            const dist = distributorById.get(id);
            setPricePerJar(dist?.price_per_jar ?? 0);
            // Pre-fill the distributor's usual (first) vehicle; if they use
            // several, the driver can switch in the vehicle dropdown.
            setVehicleId(dist?.vehicle_ids[0] ?? "");
          }}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="vehicleId" className="text-sm font-medium text-slate-700">
          Vehicle
        </label>
        <select
          id="vehicleId"
          name="vehicleId"
          value={vehicleId}
          onChange={(e) => setVehicleId(e.target.value ? Number(e.target.value) : "")}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
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
          className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
        />
      </div>

      {/* Returns aren't tracked at entry anymore, but keep any value an
          older record already has when it's re-saved from the edit page. */}
      <input type="hidden" name="jarsReturned" value={delivery?.jars_returned ?? 0} />

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
          className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
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
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
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
          className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
        />
      </div>

      {state?.error && (
        <p className="sm:col-span-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}

      {showSaved && !state?.error && (
        <p
          role="status"
          className="sm:col-span-3 rounded-md bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700"
        >
          ✓ Delivery saved successfully. Ready for the next entry.
        </p>
      )}

      {/* Stays visible (unlike the banner) until the next save, so there's
          time to actually send the message. */}
      {!delivery && !state?.error && state?.whatsapp && (
        <div className="sm:col-span-3">
          <WhatsAppButton message={state.whatsapp} />
        </div>
      )}

      <div className="sm:col-span-3">
        <button
          type="submit"
          disabled={pending || distributors.length === 0}
          className="w-full rounded-xl bg-gradient-to-b from-sky-500 to-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-sky-500/25 transition hover:from-sky-400 hover:to-sky-500 sm:w-auto sm:px-6 disabled:opacity-60"
        >
          {pending ? "Saving..." : submitLabel}
        </button>
      </div>
    </form>
  );
}

"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createPaymentAction } from "./actions";
import type { Distributor } from "@/lib/types";
import { todayIso, nowTimeValue } from "@/lib/format";
import DistributorCombobox from "@/components/DistributorCombobox";
import WhatsAppButton from "@/components/WhatsAppButton";

export default function PaymentForm({
  distributors,
}: {
  distributors: Distributor[];
}) {
  const [state, formAction, pending] = useActionState(
    createPaymentAction,
    undefined
  );

  // The pre-filled time is the person's wall clock, which the server can't
  // know at render time — hence suppressHydrationWarning on the input.
  const [time, setTime] = useState(() => nowTimeValue());

  // Confirm the save and refresh the time for the next entry.
  const [showSaved, setShowSaved] = useState(false);
  const lastSavedAt = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (state?.savedAt && state.savedAt !== lastSavedAt.current) {
      lastSavedAt.current = state.savedAt;
      setTime(nowTimeValue());
      setShowSaved(true);
      const timer = setTimeout(() => setShowSaved(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [state]);

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
            defaultValue={todayIso()}
            className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10"
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
            className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10"
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
          defaultId={distributors[0]?.id}
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="amount" className="text-sm font-medium text-slate-700">
          Amount received
        </label>
        <input
          id="amount"
          name="amount"
          type="number"
          step="0.01"
          min="0.01"
          required
          className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="method" className="text-sm font-medium text-slate-700">
          Payment method
        </label>
        <select
          id="method"
          name="method"
          defaultValue="Cash"
          className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10"
        >
          <option>Cash</option>
          <option>UPI</option>
          <option>Bank transfer</option>
          <option>Cheque</option>
          <option>Other</option>
        </select>
      </div>
      <div className="flex flex-col gap-1 sm:col-span-2">
        <label htmlFor="notes" className="text-sm font-medium text-slate-700">
          Notes
        </label>
        <input
          id="notes"
          name="notes"
          placeholder="optional"
          className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10"
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
          ✓ Payment saved successfully. Ready for the next entry.
        </p>
      )}

      {/* Stays visible (unlike the banner) until the next save, so there's
          time to actually send the message. */}
      {!state?.error && state?.whatsapp && (
        <div className="sm:col-span-3">
          <WhatsAppButton message={state.whatsapp} />
        </div>
      )}
      <div className="sm:col-span-3">
        <button
          type="submit"
          disabled={pending || distributors.length === 0}
          className="w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-emerald-600/20 transition hover:bg-emerald-700 sm:w-auto sm:px-6 disabled:opacity-60"
        >
          {pending ? "Saving..." : "Record payment"}
        </button>
      </div>
    </form>
  );
}

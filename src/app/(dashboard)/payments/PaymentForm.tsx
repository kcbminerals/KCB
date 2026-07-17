"use client";

import { useActionState, useState } from "react";
import { createPaymentAction } from "./actions";
import type { Distributor } from "@/lib/types";
import { todayIso, nowTimeValue } from "@/lib/format";
import DistributorCombobox from "@/components/DistributorCombobox";

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
            className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
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
            className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
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
          className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
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
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
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
          className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          {pending ? "Saving..." : "Record payment"}
        </button>
      </div>
    </form>
  );
}

"use client";

import { useActionState } from "react";
import { createVehicleAction } from "./actions";

export default function VehicleForm() {
  const [state, formAction, pending] = useActionState(
    createVehicleAction,
    undefined
  );

  return (
    <form
      action={formAction}
      className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:items-end"
    >
      <div className="flex flex-col gap-1">
        <label htmlFor="name" className="text-sm font-medium text-slate-700">
          Vehicle name
        </label>
        <input
          id="name"
          name="name"
          required
          placeholder="e.g. Tempo 1"
          className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label
          htmlFor="plateNumber"
          className="text-sm font-medium text-slate-700"
        >
          Plate number
        </label>
        <input
          id="plateNumber"
          name="plateNumber"
          placeholder="optional"
          className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
        />
      </div>
      <div>
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-xl bg-gradient-to-b from-sky-500 to-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-sky-500/25 transition hover:from-sky-400 hover:to-sky-500 sm:w-auto sm:px-6 disabled:opacity-60"
        >
          {pending ? "Adding..." : "Add vehicle"}
        </button>
      </div>
      {state?.error && (
        <p className="sm:col-span-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}
    </form>
  );
}

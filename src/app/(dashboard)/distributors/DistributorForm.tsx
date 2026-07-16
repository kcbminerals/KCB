"use client";

import { useActionState } from "react";
import type { DistributorFormState } from "./actions";
import type { Distributor } from "@/lib/types";

export default function DistributorForm({
  action,
  distributor,
  submitLabel = "Save distributor",
}: {
  action: (
    state: DistributorFormState,
    formData: FormData
  ) => Promise<DistributorFormState>;
  distributor?: Distributor;
  submitLabel?: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);

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
      {state?.error && (
        <p className="sm:col-span-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}
      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-60"
        >
          {pending ? "Saving..." : submitLabel}
        </button>
      </div>
    </form>
  );
}

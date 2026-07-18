"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createVehicleAction } from "../vehicles/actions";

export default function QuickAddVehicle({
  onCreated,
}: {
  onCreated: (id: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(createVehicleAction, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  const lastHandledId = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (state?.createdId && state.createdId !== lastHandledId.current) {
      lastHandledId.current = state.createdId;
      onCreated(state.createdId);
      formRef.current?.reset();
      setOpen(false);
    }
  }, [state, onCreated]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-left text-xs font-medium text-sky-600 hover:underline"
      >
        + Add a new vehicle
      </button>
    );
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      className="flex flex-col gap-2 rounded-md border border-slate-200 bg-slate-50 p-3"
    >
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <input
          name="name"
          placeholder="Vehicle name"
          required
          className="rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
        />
        <input
          name="plateNumber"
          placeholder="Plate number (optional)"
          className="rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
        />
      </div>
      {state?.error && <p className="text-xs text-red-700">{state.error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-gradient-to-b from-sky-500 to-sky-600 px-3 py-1.5 text-xs font-semibold text-white shadow-md shadow-sky-500/25 transition hover:from-sky-400 hover:to-sky-500 disabled:opacity-60"
        >
          {pending ? "Adding..." : "Add vehicle"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg border border-slate-300 px-3 py-1.5 transition-colors text-xs font-medium text-slate-600 hover:bg-slate-100"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

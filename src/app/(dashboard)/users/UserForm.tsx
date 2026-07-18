"use client";

import { useActionState } from "react";
import { createUserAction } from "./actions";

export default function UserForm() {
  const [state, formAction, pending] = useActionState(createUserAction, undefined);

  return (
    <form
      action={formAction}
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:items-end"
    >
      <div className="flex flex-col gap-1">
        <label htmlFor="username" className="text-sm font-medium text-slate-700">
          Username
        </label>
        <input
          id="username"
          name="username"
          required
          autoComplete="off"
          className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="name" className="text-sm font-medium text-slate-700">
          Full name
        </label>
        <input
          id="name"
          name="name"
          required
          className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="password" className="text-sm font-medium text-slate-700">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          minLength={6}
          required
          autoComplete="new-password"
          className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="role" className="text-sm font-medium text-slate-700">
          Role
        </label>
        <select
          id="role"
          name="role"
          defaultValue="staff"
          className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
        >
          <option value="staff">Staff — entries only</option>
          <option value="admin">Admin — full access</option>
        </select>
      </div>
      {state?.error && (
        <p className="sm:col-span-2 lg:col-span-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}
      <div className="sm:col-span-2 lg:col-span-4">
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-xl bg-gradient-to-b from-sky-500 to-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-sky-500/25 transition hover:from-sky-400 hover:to-sky-500 sm:w-auto sm:px-6 disabled:opacity-60"
        >
          {pending ? "Adding..." : "Add user"}
        </button>
      </div>
    </form>
  );
}

"use client";

import { useActionState } from "react";
import { loginAction } from "./actions";

export default function LoginForm({ redirectTo }: { redirectTo: string }) {
  const [state, formAction, pending] = useActionState(loginAction, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="redirectTo" value={redirectTo} />
      <div className="flex flex-col gap-1">
        <label htmlFor="username" className="text-sm font-medium text-slate-700">
          Username
        </label>
        <input
          id="username"
          name="username"
          autoComplete="username"
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
          autoComplete="current-password"
          required
          className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
        />
      </div>
      {state?.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-gradient-to-b from-sky-500 to-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-sky-500/25 transition hover:from-sky-400 hover:to-sky-500 sm:w-auto sm:px-6 disabled:opacity-60"
      >
        {pending ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}

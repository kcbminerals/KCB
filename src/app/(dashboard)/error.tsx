"use client";

export default function DashboardError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="card max-w-md p-8">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-50">
          <span className="text-2xl">⚠️</span>
        </div>
        <h1 className="text-lg font-semibold text-slate-900">
          Couldn&apos;t load this page
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          The connection to Google Sheets was busy for a moment. Your data is
          safe — nothing was lost. Please try again.
        </p>
        <button onClick={reset} className="btn-primary mt-6 w-full">
          Try again
        </button>
      </div>
    </div>
  );
}

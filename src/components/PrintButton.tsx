"use client";

export default function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="no-print rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium hover:bg-slate-50"
    >
      Print / Save as PDF
    </button>
  );
}

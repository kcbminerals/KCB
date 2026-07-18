export default function StatCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "warning" | "good";
}) {
  const toneClasses =
    tone === "warning"
      ? "text-amber-700"
      : tone === "good"
        ? "text-emerald-700"
        : "text-slate-900";
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
        {label}
      </p>
      <p className={`mt-1.5 text-2xl font-bold tracking-tight ${toneClasses}`}>
        {value}
      </p>
    </div>
  );
}

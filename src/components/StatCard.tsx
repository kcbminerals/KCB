const TONE = {
  default: "text-slate-900",
  good: "text-emerald-600",
  warning: "text-amber-600",
} as const;

const DOT = {
  default: "bg-blue-500",
  good: "bg-emerald-500",
  warning: "bg-amber-500",
} as const;

export default function StatCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "warning" | "good";
}) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-2">
        <span className={`h-1.5 w-1.5 rounded-full ${DOT[tone]}`} />
        <p className="text-[11px] font-semibold uppercase tracking-[0.09em] text-slate-400">
          {label}
        </p>
      </div>
      <p className={`mt-2.5 text-3xl font-semibold tracking-tight tabular-nums ${TONE[tone]}`}>
        {value}
      </p>
    </div>
  );
}

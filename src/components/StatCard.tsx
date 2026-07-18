const GRADIENTS = {
  default: "from-sky-500 to-sky-700 shadow-sky-500/25",
  good: "from-emerald-500 to-emerald-700 shadow-emerald-500/25",
  warning: "from-amber-500 to-orange-600 shadow-amber-500/25",
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
    <div
      className={`rounded-2xl bg-gradient-to-br ${GRADIENTS[tone]} p-4 text-white shadow-lg`}
    >
      <p className="text-xs font-semibold uppercase tracking-wider text-white/75">
        {label}
      </p>
      <p className="mt-1.5 text-2xl font-extrabold tracking-tight">{value}</p>
    </div>
  );
}

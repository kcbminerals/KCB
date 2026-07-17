import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { getDashboardStats, listDeliveries } from "@/lib/queries";
import { formatMoney, formatDate, formatTime, todayIso } from "@/lib/format";

function StatCard({
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
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${toneClasses}`}>{value}</p>
    </div>
  );
}

export default async function DashboardPage() {
  await requireAdmin();
  const today = todayIso();
  const stats = await getDashboardStats(today);
  const recentDeliveries = await listDeliveries({ limit: 8 });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500">Today, {formatDate(today)}</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Jars loaded today" value={String(stats.todayJarsLoaded)} />
        <StatCard
          label="Jars returned today"
          value={String(stats.todayJarsReturned)}
        />
        <StatCard
          label="Collected today"
          value={formatMoney(stats.todayCollected)}
          tone="good"
        />
        <StatCard
          label="Total outstanding dues"
          value={formatMoney(stats.totalOutstandingDue)}
          tone={stats.totalOutstandingDue > 0 ? "warning" : "good"}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard label="Jars currently with distributors" value={String(stats.totalJarsOut)} />
        <div className="flex flex-col justify-center gap-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-medium text-slate-700">Quick actions</p>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/deliveries"
              className="rounded-md bg-sky-600 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-700"
            >
              + New delivery / jars loaded
            </Link>
            <Link
              href="/payments"
              className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              + Record payment
            </Link>
            <Link
              href="/reports/daily"
              className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              View today&apos;s sales
            </Link>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h2 className="font-semibold text-slate-900">Recent deliveries</h2>
          <Link href="/deliveries" className="text-sm text-sky-600 hover:underline">
            View all
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-slate-500">
                <th className="px-4 py-2 font-medium">Date</th>
                <th className="px-4 py-2 font-medium">Distributor</th>
                <th className="px-4 py-2 font-medium">Vehicle</th>
                <th className="px-4 py-2 font-medium text-right">Jars loaded</th>
                <th className="px-4 py-2 font-medium text-right">Bill</th>
                <th className="px-4 py-2 font-medium text-right">Paid</th>
                <th className="px-4 py-2 font-medium text-right">Due</th>
              </tr>
            </thead>
            <tbody>
              {recentDeliveries.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-slate-400">
                    No deliveries recorded yet.
                  </td>
                </tr>
              )}
              {recentDeliveries.map((d) => (
                <tr key={d.id} className="border-b border-slate-50 last:border-0">
                  <td className="px-4 py-2 whitespace-nowrap">
                    {formatDate(d.date)}
                    <div className="text-xs text-slate-400">{formatTime(d.created_at)}</div>
                  </td>
                  <td className="px-4 py-2">{d.distributor_name}</td>
                  <td className="px-4 py-2">{d.vehicle_name ?? "—"}</td>
                  <td className="px-4 py-2 text-right">{d.jars_loaded}</td>
                  <td className="px-4 py-2 text-right">{formatMoney(d.bill_amount)}</td>
                  <td className="px-4 py-2 text-right">{formatMoney(d.paid_amount)}</td>
                  <td className="px-4 py-2 text-right">
                    {formatMoney(d.bill_amount - d.paid_amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

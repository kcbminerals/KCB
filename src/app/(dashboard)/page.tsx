import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { getDashboardStats, listDeliveries } from "@/lib/queries";
import { formatMoney, formatDate, formatTime, todayIso } from "@/lib/format";
import StatCard from "@/components/StatCard";

export default async function DashboardPage() {
  await requireAdmin();
  const today = todayIso();
  const stats = await getDashboardStats(today);
  const recentDeliveries = await listDeliveries({ limit: 8 });
  // Direct link to the exact spreadsheet the app reads/writes, so there's
  // never a doubt about which file in Drive is the live one.
  const sheetUrl = process.env.GOOGLE_SHEET_ID
    ? `https://docs.google.com/spreadsheets/d/${process.env.GOOGLE_SHEET_ID}/edit`
    : null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500">Today, {formatDate(today)}</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatCard label="Jars loaded today" value={String(stats.todayJarsLoaded)} />
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
              className="rounded-lg bg-gradient-to-b from-sky-500 to-sky-600 px-3 py-2 text-sm font-semibold text-white shadow-md shadow-sky-500/25 transition hover:from-sky-400 hover:to-sky-500"
            >
              + New delivery / jars loaded
            </Link>
            <Link
              href="/payments"
              className="rounded-lg bg-gradient-to-b from-emerald-500 to-emerald-600 px-3 py-2 text-sm font-semibold text-white shadow-md shadow-emerald-500/25 transition hover:from-emerald-400 hover:to-emerald-500"
            >
              + Record payment
            </Link>
            <Link
              href="/reports/daily"
              className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              View today&apos;s sales
            </Link>
            <a
              href="/api/backup/download"
              className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Download backup
            </a>
            {sheetUrl && (
              <a
                href={sheetUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Open Google Sheet ↗
              </a>
            )}
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
              <tr className="border-b border-slate-100 bg-slate-50/80 text-left text-xs uppercase tracking-wider text-slate-500">
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
                <tr key={d.id} className="border-b border-slate-50 transition-colors hover:bg-sky-50/50 last:border-0">
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

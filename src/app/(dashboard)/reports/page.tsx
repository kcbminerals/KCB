import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { listDistributorsSummary } from "@/lib/queries";
import { formatMoney } from "@/lib/format";
import { DISTRIBUTOR_CATEGORIES } from "@/lib/types";
import PrintButton from "@/components/PrintButton";
import ExportCsvButton from "@/components/ExportCsvButton";

export default async function ReportsPage() {
  await requireAdmin();
  const distributors = await listDistributorsSummary(true);

  const byCategory = DISTRIBUTOR_CATEGORIES.map((category) => {
    const inCategory = distributors.filter((d) => d.category === category);
    return {
      category,
      jarBalance: inCategory.reduce((sum, d) => sum + d.jar_balance, 0),
      totalBilled: inCategory.reduce((sum, d) => sum + d.total_billed, 0),
      totalPaid: inCategory.reduce((sum, d) => sum + d.total_paid, 0),
      totalDue: inCategory.reduce((sum, d) => sum + d.total_due, 0),
    };
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Reports</h1>
        <p className="text-sm text-slate-500">
          Daily, weekly and monthly summaries, plus all-time overviews by distributor and category.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Link
          href="/reports/daily"
          className="rounded-xl border border-slate-200 border-t-4 border-t-sky-500 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <h2 className="font-semibold text-slate-900">Daily sales</h2>
          <p className="mt-1 text-sm text-slate-500">
            Jars, billing and collections for today or any past day.
          </p>
        </Link>
        <Link
          href="/reports/weekly"
          className="rounded-xl border border-slate-200 border-t-4 border-t-emerald-500 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <h2 className="font-semibold text-slate-900">Weekly report</h2>
          <p className="mt-1 text-sm text-slate-500">
            Jars, billing and collections for the current or any past week.
          </p>
        </Link>
        <Link
          href="/reports/monthly"
          className="rounded-xl border border-slate-200 border-t-4 border-t-amber-500 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <h2 className="font-semibold text-slate-900">Monthly report</h2>
          <p className="mt-1 text-sm text-slate-500">
            Jars, billing and collections for the current or any past month.
          </p>
        </Link>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h2 className="font-semibold text-slate-900">All-time category overview</h2>
          <ExportCsvButton
            filename="all-time-category-overview.csv"
            headers={["Category", "Jars out", "Total billed", "Total paid", "Outstanding due"]}
            rows={byCategory.map((c) => [
              c.category,
              c.jarBalance,
              c.totalBilled,
              c.totalPaid,
              c.totalDue,
            ])}
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80 text-left text-xs uppercase tracking-wider text-slate-500">
                <th className="px-4 py-2 font-medium">Category</th>
                <th className="px-4 py-2 font-medium text-right">Jars out</th>
                <th className="px-4 py-2 font-medium text-right">Total billed</th>
                <th className="px-4 py-2 font-medium text-right">Total paid</th>
                <th className="px-4 py-2 font-medium text-right">Outstanding due</th>
                <th className="px-4 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {byCategory.map((c) => (
                <tr key={c.category} className="border-b border-slate-50 transition-colors hover:bg-sky-50/50 last:border-0">
                  <td className="px-4 py-2 font-medium text-slate-900">{c.category}</td>
                  <td className="px-4 py-2 text-right">{c.jarBalance}</td>
                  <td className="px-4 py-2 text-right">{formatMoney(c.totalBilled)}</td>
                  <td className="px-4 py-2 text-right">{formatMoney(c.totalPaid)}</td>
                  <td
                    className={`px-4 py-2 text-right font-medium ${
                      c.totalDue > 0 ? "text-amber-700" : "text-emerald-700"
                    }`}
                  >
                    {formatMoney(c.totalDue)}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <Link
                      href={`/reports/monthly?category=${c.category}`}
                      className="text-sky-600 hover:underline"
                    >
                      View month
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h2 className="font-semibold text-slate-900">
            All-time distributor overview
          </h2>
          <div className="flex items-center gap-2">
            <ExportCsvButton
              filename="all-time-distributor-overview.csv"
              headers={[
                "Distributor",
                "Category",
                "Jars out",
                "Total billed",
                "Total paid",
                "Outstanding due",
              ]}
              rows={distributors.map((d) => [
                d.name,
                d.category,
                d.jar_balance,
                d.total_billed,
                d.total_paid,
                d.total_due,
              ])}
            />
            <PrintButton />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80 text-left text-xs uppercase tracking-wider text-slate-500">
                <th className="px-4 py-2 font-medium">Distributor</th>
                <th className="px-4 py-2 font-medium">Category</th>
                <th className="px-4 py-2 font-medium text-right">Jars out</th>
                <th className="px-4 py-2 font-medium text-right">Total billed</th>
                <th className="px-4 py-2 font-medium text-right">Total paid</th>
                <th className="px-4 py-2 font-medium text-right">Outstanding due</th>
              </tr>
            </thead>
            <tbody>
              {distributors.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                    No distributors yet.
                  </td>
                </tr>
              )}
              {distributors.map((d) => (
                <tr key={d.id} className="border-b border-slate-50 transition-colors hover:bg-sky-50/50 last:border-0">
                  <td className="px-4 py-2 font-medium text-slate-900">
                    <Link href={`/distributors/${d.id}`} className="hover:underline">
                      {d.name}
                    </Link>
                  </td>
                  <td className="px-4 py-2">
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-600">
                      {d.category}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">{d.jar_balance}</td>
                  <td className="px-4 py-2 text-right">{formatMoney(d.total_billed)}</td>
                  <td className="px-4 py-2 text-right">{formatMoney(d.total_paid)}</td>
                  <td
                    className={`px-4 py-2 text-right font-medium ${
                      d.total_due > 0 ? "text-amber-700" : "text-emerald-700"
                    }`}
                  >
                    {formatMoney(d.total_due)}
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

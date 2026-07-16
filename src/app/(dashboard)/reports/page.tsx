import Link from "next/link";
import { verifySession } from "@/lib/auth";
import { listDistributorsSummary } from "@/lib/queries";
import { formatMoney } from "@/lib/format";
import PrintButton from "@/components/PrintButton";

export default async function ReportsPage() {
  await verifySession();
  const distributors = await listDistributorsSummary(true);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Reports</h1>
        <p className="text-sm text-slate-500">
          Weekly and monthly summaries, plus an all-time distributor overview.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Link
          href="/reports/weekly"
          className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:border-sky-300 hover:shadow-md"
        >
          <h2 className="font-semibold text-slate-900">Weekly report</h2>
          <p className="mt-1 text-sm text-slate-500">
            Jars, billing and collections for the current or any past week.
          </p>
        </Link>
        <Link
          href="/reports/monthly"
          className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:border-sky-300 hover:shadow-md"
        >
          <h2 className="font-semibold text-slate-900">Monthly report</h2>
          <p className="mt-1 text-sm text-slate-500">
            Jars, billing and collections for the current or any past month.
          </p>
        </Link>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h2 className="font-semibold text-slate-900">
            All-time distributor overview
          </h2>
          <PrintButton />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-slate-500">
                <th className="px-4 py-2 font-medium">Distributor</th>
                <th className="px-4 py-2 font-medium text-right">Jars out</th>
                <th className="px-4 py-2 font-medium text-right">Total billed</th>
                <th className="px-4 py-2 font-medium text-right">Total paid</th>
                <th className="px-4 py-2 font-medium text-right">Outstanding due</th>
              </tr>
            </thead>
            <tbody>
              {distributors.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                    No distributors yet.
                  </td>
                </tr>
              )}
              {distributors.map((d) => (
                <tr key={d.id} className="border-b border-slate-50 last:border-0">
                  <td className="px-4 py-2 font-medium text-slate-900">
                    <Link href={`/distributors/${d.id}`} className="hover:underline">
                      {d.name}
                    </Link>
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

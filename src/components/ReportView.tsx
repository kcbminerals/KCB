import type { Report } from "@/lib/queries";
import { formatMoney } from "@/lib/format";
import PrintButton from "./PrintButton";

export default function ReportView({
  title,
  subtitle,
  report,
  nav,
  filters,
}: {
  title: string;
  subtitle: string;
  report: Report;
  nav?: React.ReactNode;
  filters?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{title}</h1>
          <p className="text-sm text-slate-500">{subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          {nav}
          <PrintButton />
        </div>
      </div>

      {filters && <div>{filters}</div>}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Jars loaded</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">
            {report.totals.jarsLoaded}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Jars returned</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">
            {report.totals.jarsReturned}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Total billed</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">
            {formatMoney(report.totals.billed)}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Total collected</p>
          <p className="mt-1 text-2xl font-bold text-emerald-700">
            {formatMoney(report.totals.collected)}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-4 py-3">
          <h2 className="font-semibold text-slate-900">By distributor</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-slate-500">
                <th className="px-4 py-2 font-medium">Distributor</th>
                <th className="px-4 py-2 font-medium text-right">Jars loaded</th>
                <th className="px-4 py-2 font-medium text-right">Jars returned</th>
                <th className="px-4 py-2 font-medium text-right">Billed</th>
                <th className="px-4 py-2 font-medium text-right">Collected</th>
                <th className="px-4 py-2 font-medium text-right">Balance</th>
              </tr>
            </thead>
            <tbody>
              {report.byDistributor.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                    No activity in this period.
                  </td>
                </tr>
              )}
              {report.byDistributor.map((r) => (
                <tr key={r.distributor_id} className="border-b border-slate-50 last:border-0">
                  <td className="px-4 py-2 font-medium text-slate-900">
                    {r.distributor_name}
                  </td>
                  <td className="px-4 py-2 text-right">{r.jars_loaded}</td>
                  <td className="px-4 py-2 text-right">{r.jars_returned}</td>
                  <td className="px-4 py-2 text-right">{formatMoney(r.billed)}</td>
                  <td className="px-4 py-2 text-right">{formatMoney(r.collected)}</td>
                  <td className="px-4 py-2 text-right">
                    {formatMoney(r.billed - r.collected)}
                  </td>
                </tr>
              ))}
            </tbody>
            {report.byDistributor.length > 0 && (
              <tfoot>
                <tr className="border-t border-slate-200 font-semibold text-slate-900">
                  <td className="px-4 py-2">Total</td>
                  <td className="px-4 py-2 text-right">{report.totals.jarsLoaded}</td>
                  <td className="px-4 py-2 text-right">{report.totals.jarsReturned}</td>
                  <td className="px-4 py-2 text-right">{formatMoney(report.totals.billed)}</td>
                  <td className="px-4 py-2 text-right">
                    {formatMoney(report.totals.collected)}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {formatMoney(report.totals.billed - report.totals.collected)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}

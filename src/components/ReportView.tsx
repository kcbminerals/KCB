import type { Report } from "@/lib/queries";
import { formatMoney } from "@/lib/format";
import PrintButton from "./PrintButton";
import ExportCsvButton from "./ExportCsvButton";
import StatCard from "./StatCard";

export default function ReportView({
  title,
  subtitle,
  report,
  nav,
  filters,
  exportFilename,
}: {
  title: string;
  subtitle: string;
  report: Report;
  nav?: React.ReactNode;
  filters?: React.ReactNode;
  exportFilename: string;
}) {
  const csvHeaders = ["Distributor", "Jars loaded", "Billed", "Collected", "Balance"];
  const csvRows = report.byDistributor.map((r) => [
    r.distributor_name,
    r.jars_loaded,
    r.billed,
    r.collected,
    r.billed - r.collected,
  ]);
  csvRows.push([
    "Total",
    report.totals.jarsLoaded,
    report.totals.billed,
    report.totals.collected,
    report.totals.billed - report.totals.collected,
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{title}</h1>
          <p className="text-sm text-slate-500">{subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          {nav}
          <ExportCsvButton
            filename={`${exportFilename}.csv`}
            headers={csvHeaders}
            rows={csvRows}
          />
          <PrintButton />
        </div>
      </div>

      {filters && <div>{filters}</div>}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatCard label="Jars loaded" value={String(report.totals.jarsLoaded)} />
        <StatCard label="Total billed" value={formatMoney(report.totals.billed)} />
        <StatCard
          label="Total collected"
          value={formatMoney(report.totals.collected)}
          tone="good"
        />
      </div>

      <div className="card">
        <div className="border-b border-slate-200 px-4 py-3">
          <h2 className="font-semibold text-slate-900">By distributor</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60 text-left text-[11px] uppercase tracking-[0.08em] text-slate-400">
                <th className="px-4 py-2 font-medium">Distributor</th>
                <th className="px-4 py-2 font-medium text-right">Jars loaded</th>
                <th className="px-4 py-2 font-medium text-right">Billed</th>
                <th className="px-4 py-2 font-medium text-right">Collected</th>
                <th className="px-4 py-2 font-medium text-right">Balance</th>
              </tr>
            </thead>
            <tbody>
              {report.byDistributor.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                    No activity in this period.
                  </td>
                </tr>
              )}
              {report.byDistributor.map((r) => (
                <tr key={r.distributor_id} className="border-b border-slate-50 transition-colors hover:bg-slate-50 last:border-0">
                  <td className="px-4 py-2 font-medium text-slate-900">
                    {r.distributor_name}
                  </td>
                  <td className="px-4 py-2 text-right">{r.jars_loaded}</td>
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

import { requireAdmin } from "@/lib/auth";
import { listDeletedDeliveries, listDeletedPayments } from "@/lib/queries";
import { formatMoney, formatDate, formatDateTime, formatTime } from "@/lib/format";
import { restoreDeliveryAction, restorePaymentAction } from "./actions";

export default async function DeletedEntriesPage() {
  await requireAdmin();
  const [deliveries, payments] = await Promise.all([
    listDeletedDeliveries(),
    listDeletedPayments(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
          Deleted entries
        </h1>
        <p className="text-sm text-slate-500">
          Entries deleted in the app are kept here (and in the Google Sheet) —
          nothing is ever lost. Restore brings an entry back into all lists,
          reports and totals.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-4 py-3">
          <h2 className="font-semibold text-slate-900">
            Deleted deliveries ({deliveries.length})
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80 text-left text-xs uppercase tracking-wider text-slate-500">
                <th className="px-4 py-2 font-medium">Date</th>
                <th className="px-4 py-2 font-medium">Distributor</th>
                <th className="px-4 py-2 font-medium text-right">Jars</th>
                <th className="px-4 py-2 font-medium text-right">Bill</th>
                <th className="px-4 py-2 font-medium text-right">Paid</th>
                <th className="px-4 py-2 font-medium">Deleted on</th>
                <th className="px-4 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {deliveries.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-slate-400">
                    No deleted deliveries.
                  </td>
                </tr>
              )}
              {deliveries.map((d) => (
                <tr key={d.id} className="border-b border-slate-50 last:border-0">
                  <td className="px-4 py-2 whitespace-nowrap">
                    {formatDate(d.date)}
                    <div className="text-xs text-slate-400">{formatTime(d.created_at)}</div>
                  </td>
                  <td className="px-4 py-2">{d.distributor_name}</td>
                  <td className="px-4 py-2 text-right">{d.jars_loaded}</td>
                  <td className="px-4 py-2 text-right">{formatMoney(d.bill_amount)}</td>
                  <td className="px-4 py-2 text-right">{formatMoney(d.paid_amount)}</td>
                  <td className="px-4 py-2 text-xs text-slate-500 whitespace-nowrap">
                    {d.deleted_at ? formatDateTime(d.deleted_at) : "—"}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <form action={restoreDeliveryAction.bind(null, d.id)}>
                      <button
                        type="submit"
                        className="rounded-lg border border-emerald-300 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-50"
                      >
                        Restore
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-4 py-3">
          <h2 className="font-semibold text-slate-900">
            Deleted payments ({payments.length})
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80 text-left text-xs uppercase tracking-wider text-slate-500">
                <th className="px-4 py-2 font-medium">Date</th>
                <th className="px-4 py-2 font-medium">Distributor</th>
                <th className="px-4 py-2 font-medium">Method</th>
                <th className="px-4 py-2 font-medium text-right">Amount</th>
                <th className="px-4 py-2 font-medium">Deleted on</th>
                <th className="px-4 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {payments.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                    No deleted payments.
                  </td>
                </tr>
              )}
              {payments.map((p) => (
                <tr key={p.id} className="border-b border-slate-50 last:border-0">
                  <td className="px-4 py-2 whitespace-nowrap">
                    {formatDate(p.date)}
                    <div className="text-xs text-slate-400">{formatTime(p.created_at)}</div>
                  </td>
                  <td className="px-4 py-2">{p.distributor_name}</td>
                  <td className="px-4 py-2">{p.method ?? "—"}</td>
                  <td className="px-4 py-2 text-right">{formatMoney(p.amount)}</td>
                  <td className="px-4 py-2 text-xs text-slate-500 whitespace-nowrap">
                    {p.deleted_at ? formatDateTime(p.deleted_at) : "—"}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <form action={restorePaymentAction.bind(null, p.id)}>
                      <button
                        type="submit"
                        className="rounded-lg border border-emerald-300 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-50"
                      >
                        Restore
                      </button>
                    </form>
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

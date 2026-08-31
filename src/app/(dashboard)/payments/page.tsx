import Link from "next/link";
import { verifySession } from "@/lib/auth";
import { listReceipts, listDistributors } from "@/lib/queries";
import { formatMoney, formatDate, formatTime } from "@/lib/format";
import PaymentForm from "./PaymentForm";
import { deletePaymentAction } from "./actions";
import DeleteButton from "@/components/DeleteButton";

export default async function PaymentsPage() {
  await verifySession();
  const distributors = await listDistributors();
  const receipts = await listReceipts({ limit: 200 });
  const totalReceived = receipts.reduce((sum, r) => sum + r.amount, 0);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Payments</h1>
        <p className="text-sm text-slate-500">
          Record a payment received towards outstanding dues. The list below
          shows <strong>all</strong> money received — standalone payments and
          amounts collected on a delivery slip.
        </p>
      </div>

      <div className="card border-t-4 border-t-emerald-500 p-4">
        {distributors.length === 0 ? (
          <p className="text-sm text-slate-500">
            <Link href="/distributors/new" className="text-blue-600 hover:underline">
              Add a distributor
            </Link>{" "}
            first, then record payments against them.
          </p>
        ) : (
          <PaymentForm distributors={distributors} />
        )}
      </div>

      <div className="card">
        <div className="border-b border-slate-200 px-4 py-3">
          <h2 className="font-semibold text-slate-900">Money received</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60 text-left text-[11px] uppercase tracking-[0.08em] text-slate-400">
                <th className="px-4 py-2 font-medium">Date</th>
                <th className="px-4 py-2 font-medium">Distributor</th>
                <th className="px-4 py-2 font-medium">Source</th>
                <th className="px-4 py-2 font-medium">Method</th>
                <th className="px-4 py-2 font-medium">Notes</th>
                <th className="px-4 py-2 font-medium text-right">Amount</th>
                <th className="px-4 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {receipts.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-slate-400">
                    No money received yet.
                  </td>
                </tr>
              )}
              {receipts.map((r) => (
                <tr
                  key={`${r.source}-${r.id}`}
                  className="border-b border-slate-50 transition-colors hover:bg-slate-50 last:border-0"
                >
                  <td className="px-4 py-2 whitespace-nowrap">
                    {formatDate(r.date)}
                    <div className="text-xs text-slate-400">
                      {formatTime(r.created_at)}
                    </div>
                  </td>
                  <td className="px-4 py-2">{r.distributor_name}</td>
                  <td className="px-4 py-2">
                    {r.source === "delivery" ? (
                      <Link
                        href={`/deliveries/${r.id}/edit`}
                        className="rounded bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                      >
                        With delivery
                      </Link>
                    ) : (
                      <span className="rounded bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                        Payment
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2">{r.method ?? "—"}</td>
                  <td className="px-4 py-2">{r.notes ?? "—"}</td>
                  <td className="px-4 py-2 text-right font-medium tabular-nums">
                    {formatMoney(r.amount)}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {r.source === "payment" ? (
                      <DeleteButton
                        action={deletePaymentAction.bind(null, r.id)}
                        confirmMessage="Delete this payment?"
                      />
                    ) : (
                      // Delivery cash belongs to its delivery — edit it there
                      // so the bill and the amount stay in step.
                      <span className="text-xs text-slate-300">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            {receipts.length > 0 && (
              <tfoot>
                <tr className="border-t border-slate-200 font-semibold text-slate-900">
                  <td className="px-4 py-2" colSpan={5}>
                    Total received
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {formatMoney(totalReceived)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}

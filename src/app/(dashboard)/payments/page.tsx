import Link from "next/link";
import { verifySession } from "@/lib/auth";
import { listPayments, listDistributors } from "@/lib/queries";
import { formatMoney, formatDate, formatTime } from "@/lib/format";
import PaymentForm from "./PaymentForm";
import { deletePaymentAction } from "./actions";
import DeleteButton from "@/components/DeleteButton";

export default async function PaymentsPage() {
  await verifySession();
  const distributors = await listDistributors();
  const payments = await listPayments({ limit: 200 });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Payments</h1>
        <p className="text-sm text-slate-500">
          Record a payment received from a distributor towards their outstanding
          dues (not tied to a specific delivery).
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
          <h2 className="font-semibold text-slate-900">Recent payments</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60 text-left text-[11px] uppercase tracking-[0.08em] text-slate-400">
                <th className="px-4 py-2 font-medium">Date</th>
                <th className="px-4 py-2 font-medium">Distributor</th>
                <th className="px-4 py-2 font-medium">Method</th>
                <th className="px-4 py-2 font-medium">Notes</th>
                <th className="px-4 py-2 font-medium text-right">Amount</th>
                <th className="px-4 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {payments.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                    No payments recorded yet.
                  </td>
                </tr>
              )}
              {payments.map((p) => (
                <tr key={p.id} className="border-b border-slate-50 transition-colors hover:bg-slate-50 last:border-0">
                  <td className="px-4 py-2 whitespace-nowrap">
                    {formatDate(p.date)}
                    <div className="text-xs text-slate-400">
                      Recorded {formatTime(p.created_at)}
                    </div>
                  </td>
                  <td className="px-4 py-2">{p.distributor_name}</td>
                  <td className="px-4 py-2">{p.method ?? "—"}</td>
                  <td className="px-4 py-2">{p.notes ?? "—"}</td>
                  <td className="px-4 py-2 text-right font-medium">
                    {formatMoney(p.amount)}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <DeleteButton
                      action={deletePaymentAction.bind(null, p.id)}
                      confirmMessage="Delete this payment?"
                    />
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

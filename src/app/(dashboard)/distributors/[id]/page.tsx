import Link from "next/link";
import { notFound } from "next/navigation";
import { verifySession } from "@/lib/auth";
import {
  getDistributorSummary,
  listDeliveries,
  listPayments,
} from "@/lib/queries";
import { formatMoney, formatDate } from "@/lib/format";
import { setDistributorActiveAction } from "../actions";

export default async function DistributorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await verifySession();
  const { id } = await params;
  const distributorId = Number(id);
  const distributor = await getDistributorSummary(distributorId);
  if (!distributor) notFound();

  const deliveries = await listDeliveries({ distributorId });
  const payments = await listPayments({ distributorId });

  type Entry = {
    date: string;
    kind: "delivery" | "payment";
    description: string;
    billed: number;
    paid: number;
  };
  const entries: Entry[] = [
    ...deliveries.map((d) => ({
      date: d.date,
      kind: "delivery" as const,
      description: `${d.jars_loaded} jars loaded${
        d.jars_returned ? `, ${d.jars_returned} returned` : ""
      }${d.vehicle_name ? ` (${d.vehicle_name})` : ""}`,
      billed: d.bill_amount,
      paid: d.paid_amount,
    })),
    ...payments.map((p) => ({
      date: p.date,
      kind: "payment" as const,
      description: `Payment received${p.method ? ` via ${p.method}` : ""}${
        p.notes ? ` — ${p.notes}` : ""
      }`,
      billed: 0,
      paid: p.amount,
    })),
  ].sort((a, b) => (a.date < b.date ? 1 : -1));

  const toggleActive = setDistributorActiveAction.bind(
    null,
    distributorId,
    !distributor.active
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{distributor.name}</h1>
          <p className="text-sm text-slate-500">
            {distributor.phone ?? "No phone"} · {distributor.address ?? "No address"}
          </p>
        </div>
        <div className="flex gap-2 no-print">
          <Link
            href={`/distributors/${distributorId}/edit`}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium hover:bg-slate-50"
          >
            Edit
          </Link>
          <form action={toggleActive}>
            <button
              type="submit"
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium hover:bg-slate-50"
            >
              {distributor.active ? "Deactivate" : "Activate"}
            </button>
          </form>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Price per jar</p>
          <p className="mt-1 text-xl font-bold">{formatMoney(distributor.price_per_jar)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Jars with distributor</p>
          <p className="mt-1 text-xl font-bold">{distributor.jar_balance}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Total billed</p>
          <p className="mt-1 text-xl font-bold">{formatMoney(distributor.total_billed)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Outstanding due</p>
          <p
            className={`mt-1 text-xl font-bold ${
              distributor.total_due > 0 ? "text-amber-700" : "text-emerald-700"
            }`}
          >
            {formatMoney(distributor.total_due)}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-4 py-3">
          <h2 className="font-semibold text-slate-900">Full ledger</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-slate-500">
                <th className="px-4 py-2 font-medium">Date</th>
                <th className="px-4 py-2 font-medium">Details</th>
                <th className="px-4 py-2 font-medium text-right">Billed</th>
                <th className="px-4 py-2 font-medium text-right">Paid</th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-slate-400">
                    No activity yet.
                  </td>
                </tr>
              )}
              {entries.map((e, i) => (
                <tr key={i} className="border-b border-slate-50 last:border-0">
                  <td className="px-4 py-2 whitespace-nowrap">{formatDate(e.date)}</td>
                  <td className="px-4 py-2">
                    <span
                      className={`mr-2 rounded px-1.5 py-0.5 text-xs font-medium ${
                        e.kind === "delivery"
                          ? "bg-sky-50 text-sky-700"
                          : "bg-emerald-50 text-emerald-700"
                      }`}
                    >
                      {e.kind === "delivery" ? "Delivery" : "Payment"}
                    </span>
                    {e.description}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {e.billed ? formatMoney(e.billed) : "—"}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {e.paid ? formatMoney(e.paid) : "—"}
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

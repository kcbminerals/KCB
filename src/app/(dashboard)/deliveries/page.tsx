import Link from "next/link";
import { verifySession } from "@/lib/auth";
import { listDeliveries, listDistributors, listVehicles } from "@/lib/queries";
import { formatMoney, formatDate } from "@/lib/format";
import DeliveryForm from "./DeliveryForm";
import { createDeliveryAction, deleteDeliveryAction } from "./actions";
import DeleteButton from "@/components/DeleteButton";

export default async function DeliveriesPage({
  searchParams,
}: {
  searchParams: Promise<{ distributorId?: string }>;
}) {
  await verifySession();
  const { distributorId } = await searchParams;
  const distributors = await listDistributors();
  const vehicles = await listVehicles();
  const deliveries = await listDeliveries({
    distributorId: distributorId ? Number(distributorId) : undefined,
    limit: 200,
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Deliveries</h1>
        <p className="text-sm text-slate-500">
          Record jars loaded to a vehicle and the payment received.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        {distributors.length === 0 ? (
          <p className="text-sm text-slate-500">
            Add a distributor first from the{" "}
            <Link href="/distributors" className="text-sky-600 hover:underline">
              Distributors
            </Link>{" "}
            page.
          </p>
        ) : (
          <DeliveryForm
            action={createDeliveryAction}
            distributors={distributors}
            vehicles={vehicles}
          />
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-3">
          <h2 className="font-semibold text-slate-900">All deliveries</h2>
          <form className="flex items-center gap-2 text-sm">
            <label htmlFor="distributorId" className="text-slate-500">
              Filter:
            </label>
            <select
              id="distributorId"
              name="distributorId"
              defaultValue={distributorId ?? ""}
              className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm"
            >
              <option value="">All distributors</option>
              {distributors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="rounded-md border border-slate-300 px-2 py-1 text-slate-600 hover:bg-slate-50"
            >
              Apply
            </button>
          </form>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-slate-500">
                <th className="px-4 py-2 font-medium">Date</th>
                <th className="px-4 py-2 font-medium">Distributor</th>
                <th className="px-4 py-2 font-medium">Vehicle</th>
                <th className="px-4 py-2 font-medium text-right">Loaded</th>
                <th className="px-4 py-2 font-medium text-right">Returned</th>
                <th className="px-4 py-2 font-medium text-right">Bill</th>
                <th className="px-4 py-2 font-medium text-right">Paid</th>
                <th className="px-4 py-2 font-medium text-right">Due</th>
                <th className="px-4 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {deliveries.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-6 text-center text-slate-400">
                    No deliveries recorded yet.
                  </td>
                </tr>
              )}
              {deliveries.map((d) => (
                <tr key={d.id} className="border-b border-slate-50 last:border-0">
                  <td className="px-4 py-2 whitespace-nowrap">{formatDate(d.date)}</td>
                  <td className="px-4 py-2">{d.distributor_name}</td>
                  <td className="px-4 py-2">{d.vehicle_name ?? "—"}</td>
                  <td className="px-4 py-2 text-right">{d.jars_loaded}</td>
                  <td className="px-4 py-2 text-right">{d.jars_returned}</td>
                  <td className="px-4 py-2 text-right">{formatMoney(d.bill_amount)}</td>
                  <td className="px-4 py-2 text-right">{formatMoney(d.paid_amount)}</td>
                  <td className="px-4 py-2 text-right">
                    {formatMoney(d.bill_amount - d.paid_amount)}
                  </td>
                  <td className="px-4 py-2 text-right whitespace-nowrap">
                    <Link
                      href={`/deliveries/${d.id}/edit`}
                      className="mr-3 text-sky-600 hover:underline"
                    >
                      Edit
                    </Link>
                    <DeleteButton
                      action={deleteDeliveryAction.bind(null, d.id)}
                      confirmMessage="Delete this delivery entry?"
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

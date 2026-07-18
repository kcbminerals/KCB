import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { listDistributorsSummary, listVehicles } from "@/lib/queries";
import { formatMoney } from "@/lib/format";
import DistributorForm from "./DistributorForm";
import { createDistributorAction } from "./actions";

export default async function DistributorsPage() {
  await requireAdmin();
  const [distributors, vehicles] = await Promise.all([
    listDistributorsSummary(),
    listVehicles(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Distributors</h1>
          <p className="text-sm text-slate-500">
            Manage distributors and see their jar &amp; payment balances.
          </p>
        </div>
        <Link
          href="/vehicles"
          className="rounded-lg border border-slate-300 px-3 py-1.5 transition-colors text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          Manage vehicles
        </Link>
      </div>

      <details className="group rounded-xl border border-slate-200 bg-white shadow-sm">
        <summary className="cursor-pointer list-none px-4 py-3 font-semibold text-slate-900">
          + Add new distributor
        </summary>
        <div className="border-t border-slate-200 px-4 py-4">
          <DistributorForm action={createDistributorAction} vehicles={vehicles} />
        </div>
      </details>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80 text-left text-xs uppercase tracking-wider text-slate-500">
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Category</th>
                <th className="px-4 py-2 font-medium">Vehicle</th>
                <th className="px-4 py-2 font-medium">Phone</th>
                <th className="px-4 py-2 font-medium text-right">Price/jar</th>
                <th className="px-4 py-2 font-medium text-right">Jars out</th>
                <th className="px-4 py-2 font-medium text-right">Total billed</th>
                <th className="px-4 py-2 font-medium text-right">Outstanding due</th>
                <th className="px-4 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {distributors.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-6 text-center text-slate-400">
                    No distributors yet. Add one above.
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
                  <td className="px-4 py-2">
                    {d.vehicle_name
                      ? `${d.vehicle_name}${d.vehicle_plate_number ? ` (${d.vehicle_plate_number})` : ""}`
                      : "—"}
                  </td>
                  <td className="px-4 py-2">{d.phone ?? "—"}</td>
                  <td className="px-4 py-2 text-right">{formatMoney(d.price_per_jar)}</td>
                  <td className="px-4 py-2 text-right">{d.jar_balance}</td>
                  <td className="px-4 py-2 text-right">{formatMoney(d.total_billed)}</td>
                  <td
                    className={`px-4 py-2 text-right font-medium ${
                      d.total_due > 0 ? "text-amber-700" : "text-emerald-700"
                    }`}
                  >
                    {formatMoney(d.total_due)}
                  </td>
                  <td className="px-4 py-2 text-right whitespace-nowrap">
                    <Link
                      href={`/distributors/${d.id}`}
                      className="mr-3 text-sky-600 hover:underline"
                    >
                      Report
                    </Link>
                    <Link
                      href={`/distributors/${d.id}/edit`}
                      className="text-sky-600 hover:underline"
                    >
                      Edit
                    </Link>
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

import { verifySession } from "@/lib/auth";
import { listVehicles } from "@/lib/queries";
import VehicleForm from "./VehicleForm";
import { setVehicleActiveAction } from "./actions";

export default async function VehiclesPage() {
  await verifySession();
  const vehicles = listVehicles(true);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Vehicles</h1>
        <p className="text-sm text-slate-500">
          Vehicles used to deliver jars to distributors.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <VehicleForm />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-slate-500">
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Plate number</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {vehicles.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-slate-400">
                    No vehicles yet. Add one above.
                  </td>
                </tr>
              )}
              {vehicles.map((v) => {
                const toggle = setVehicleActiveAction.bind(null, v.id, !v.active);
                return (
                  <tr key={v.id} className="border-b border-slate-50 last:border-0">
                    <td className="px-4 py-2 font-medium text-slate-900">{v.name}</td>
                    <td className="px-4 py-2">{v.plate_number ?? "—"}</td>
                    <td className="px-4 py-2">
                      <span
                        className={`rounded px-1.5 py-0.5 text-xs font-medium ${
                          v.active
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {v.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right">
                      <form action={toggle}>
                        <button
                          type="submit"
                          className="text-sky-600 hover:underline"
                        >
                          {v.active ? "Deactivate" : "Activate"}
                        </button>
                      </form>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

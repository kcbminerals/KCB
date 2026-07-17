import { verifySession } from "@/lib/auth";
import { listVehicles } from "@/lib/queries";
import DistributorForm from "../DistributorForm";
import { createDistributorAction } from "../actions";

export default async function NewDistributorPage() {
  await verifySession();
  const vehicles = await listVehicles();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Add distributor</h1>
        <p className="text-sm text-slate-500">
          Register a new distributor so deliveries and payments can be recorded
          against them.
        </p>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <DistributorForm action={createDistributorAction} vehicles={vehicles} />
      </div>
    </div>
  );
}

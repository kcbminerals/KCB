import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { getDistributor, listVehicles } from "@/lib/queries";
import DistributorForm from "../../DistributorForm";
import { updateDistributorAction } from "../../actions";

export default async function EditDistributorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const [distributor, vehicles] = await Promise.all([
    getDistributor(Number(id)),
    listVehicles(true),
  ]);
  if (!distributor) notFound();

  const action = updateDistributorAction.bind(null, distributor.id);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Edit distributor</h1>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <DistributorForm
          action={action}
          distributor={distributor}
          vehicles={vehicles}
          submitLabel="Save changes"
        />
      </div>
    </div>
  );
}

import { notFound } from "next/navigation";
import { verifySession } from "@/lib/auth";
import { getDistributor } from "@/lib/queries";
import DistributorForm from "../../DistributorForm";
import { updateDistributorAction } from "../../actions";

export default async function EditDistributorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await verifySession();
  const { id } = await params;
  const distributor = getDistributor(Number(id));
  if (!distributor) notFound();

  const action = updateDistributorAction.bind(null, distributor.id);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Edit distributor</h1>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <DistributorForm
          action={action}
          distributor={distributor}
          submitLabel="Save changes"
        />
      </div>
    </div>
  );
}

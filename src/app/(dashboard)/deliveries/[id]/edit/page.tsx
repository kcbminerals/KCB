import { notFound } from "next/navigation";
import { verifySession } from "@/lib/auth";
import { getDelivery, listDistributors, listVehicles } from "@/lib/queries";
import DeliveryForm from "../../DeliveryForm";
import { updateDeliveryAction } from "../../actions";

export default async function EditDeliveryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await verifySession();
  const { id } = await params;
  const delivery = getDelivery(Number(id));
  if (!delivery) notFound();

  const distributors = listDistributors(true);
  const vehicles = listVehicles(true);
  const action = updateDeliveryAction.bind(null, delivery.id);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Edit delivery</h1>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <DeliveryForm
          action={action}
          distributors={distributors}
          vehicles={vehicles}
          delivery={delivery}
          submitLabel="Save changes"
        />
      </div>
    </div>
  );
}

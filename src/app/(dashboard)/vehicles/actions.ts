"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireAdmin, verifySession } from "@/lib/auth";
import { createVehicle, setVehicleActive } from "@/lib/queries";

const vehicleSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  plateNumber: z.string().trim().optional(),
});

export type VehicleFormState = { error?: string; createdId?: number } | undefined;

export async function createVehicleAction(
  _prevState: VehicleFormState,
  formData: FormData
): Promise<VehicleFormState> {
  // Staff can create vehicles inline while adding a distributor;
  // deactivating vehicles stays admin-only.
  await verifySession();
  const parsed = vehicleSchema.safeParse({
    name: formData.get("name"),
    plateNumber: formData.get("plateNumber"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const id = await createVehicle(parsed.data);
  revalidatePath("/vehicles");
  revalidatePath("/distributors");
  return { createdId: id };
}

export async function setVehicleActiveAction(id: number, active: boolean) {
  await requireAdmin();
  await setVehicleActive(id, active);
  revalidatePath("/vehicles");
  revalidatePath("/distributors");
}

"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import {
  createDistributor,
  updateDistributor,
  setDistributorActive,
} from "@/lib/queries";
import { DISTRIBUTOR_CATEGORIES } from "@/lib/types";

const distributorSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  phone: z.string().trim().optional(),
  address: z.string().trim().optional(),
  pricePerJar: z.coerce.number().min(0, "Price must be 0 or more"),
  category: z.enum(DISTRIBUTOR_CATEGORIES),
  vehicleId: z.coerce.number().int().positive().optional(),
});

export type DistributorFormState = { error?: string } | undefined;

function parseDistributor(formData: FormData) {
  const vehicleRaw = formData.get("vehicleId");
  return distributorSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone"),
    address: formData.get("address"),
    pricePerJar: formData.get("pricePerJar"),
    category: formData.get("category"),
    vehicleId: vehicleRaw ? vehicleRaw : undefined,
  });
}

export async function createDistributorAction(
  _prevState: DistributorFormState,
  formData: FormData
): Promise<DistributorFormState> {
  await requireAdmin();
  const parsed = parseDistributor(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  await createDistributor(parsed.data);
  revalidatePath("/distributors");
  redirect("/distributors");
}

export async function updateDistributorAction(
  id: number,
  _prevState: DistributorFormState,
  formData: FormData
): Promise<DistributorFormState> {
  await requireAdmin();
  const parsed = parseDistributor(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  await updateDistributor(id, parsed.data);
  revalidatePath("/distributors");
  revalidatePath(`/distributors/${id}`);
  redirect(`/distributors/${id}`);
}

export async function setDistributorActiveAction(
  id: number,
  active: boolean
) {
  await requireAdmin();
  await setDistributorActive(id, active);
  revalidatePath("/distributors");
  revalidatePath(`/distributors/${id}`);
}

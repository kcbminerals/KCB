"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { verifySession } from "@/lib/auth";
import {
  createDistributor,
  updateDistributor,
  setDistributorActive,
} from "@/lib/queries";

const distributorSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  phone: z.string().trim().optional(),
  address: z.string().trim().optional(),
  pricePerJar: z.coerce.number().min(0, "Price must be 0 or more"),
});

export type DistributorFormState = { error?: string } | undefined;

export async function createDistributorAction(
  _prevState: DistributorFormState,
  formData: FormData
): Promise<DistributorFormState> {
  await verifySession();
  const parsed = distributorSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone"),
    address: formData.get("address"),
    pricePerJar: formData.get("pricePerJar"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  createDistributor(parsed.data);
  revalidatePath("/distributors");
  redirect("/distributors");
}

export async function updateDistributorAction(
  id: number,
  _prevState: DistributorFormState,
  formData: FormData
): Promise<DistributorFormState> {
  await verifySession();
  const parsed = distributorSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone"),
    address: formData.get("address"),
    pricePerJar: formData.get("pricePerJar"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  updateDistributor(id, parsed.data);
  revalidatePath("/distributors");
  revalidatePath(`/distributors/${id}`);
  redirect(`/distributors/${id}`);
}

export async function setDistributorActiveAction(
  id: number,
  active: boolean
) {
  await verifySession();
  setDistributorActive(id, active);
  revalidatePath("/distributors");
  revalidatePath(`/distributors/${id}`);
}

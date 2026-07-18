"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin, verifySession } from "@/lib/auth";
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
  // Previous/old balance can be negative when the distributor has paid in advance.
  openingBalance: z.coerce.number(),
  category: z.enum(DISTRIBUTOR_CATEGORIES),
  vehicleIds: z.array(z.number().int().positive()),
});

export type DistributorFormState = { error?: string } | undefined;

function parseDistributor(formData: FormData) {
  const vehicleIdsRaw = String(formData.get("vehicleIds") ?? "");
  const vehicleIds = vehicleIdsRaw
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n) && n > 0);
  return distributorSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone"),
    address: formData.get("address"),
    pricePerJar: formData.get("pricePerJar"),
    openingBalance: formData.get("openingBalance") || 0,
    category: formData.get("category"),
    vehicleIds,
  });
}

export async function createDistributorAction(
  _prevState: DistributorFormState,
  formData: FormData
): Promise<DistributorFormState> {
  // Staff can add distributors too (they meet new customers on delivery
  // rounds); only editing/deactivating stays admin-only.
  const session = await verifySession();
  const parsed = parseDistributor(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  await createDistributor(parsed.data);
  revalidatePath("/distributors");
  revalidatePath("/deliveries");
  revalidatePath("/payments");
  redirect(session.role === "admin" ? "/distributors" : "/deliveries");
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

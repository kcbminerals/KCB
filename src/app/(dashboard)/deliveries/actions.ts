"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { verifySession } from "@/lib/auth";
import { createDelivery, updateDelivery, deleteDelivery } from "@/lib/queries";

const deliverySchema = z.object({
  date: z.string().min(1, "Date is required"),
  time: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "Enter a valid time")
    .optional(),
  distributorId: z.coerce.number().int().positive("Choose a distributor"),
  vehicleId: z.coerce.number().int().positive().optional(),
  jarsLoaded: z.coerce.number().int().min(0, "Must be 0 or more"),
  jarsReturned: z.coerce.number().int().min(0, "Must be 0 or more"),
  pricePerJar: z.coerce.number().min(0, "Must be 0 or more"),
  paidAmount: z.coerce.number().min(0, "Must be 0 or more"),
  notes: z.string().trim().optional(),
});

export type DeliveryFormState = { error?: string; savedAt?: number } | undefined;

function parseDelivery(formData: FormData) {
  const vehicleRaw = formData.get("vehicleId");
  const timeRaw = formData.get("time");
  return deliverySchema.safeParse({
    date: formData.get("date"),
    time: timeRaw ? timeRaw : undefined,
    distributorId: formData.get("distributorId"),
    vehicleId: vehicleRaw ? vehicleRaw : undefined,
    jarsLoaded: formData.get("jarsLoaded"),
    jarsReturned: formData.get("jarsReturned") ?? 0,
    pricePerJar: formData.get("pricePerJar"),
    paidAmount: formData.get("paidAmount"),
    notes: formData.get("notes"),
  });
}

/** Combines the entry's date with the user-chosen wall-clock time into the
 *  stored timestamp. Kept timezone-naive on purpose so it always displays
 *  back exactly as the person entered it. */
function entryTimestamp(date: string, time?: string): string | null {
  return time ? `${date}T${time}` : null;
}

export async function createDeliveryAction(
  _prevState: DeliveryFormState,
  formData: FormData
): Promise<DeliveryFormState> {
  await verifySession();
  const parsed = parseDelivery(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  await createDelivery({
    ...parsed.data,
    createdAt: entryTimestamp(parsed.data.date, parsed.data.time),
  });
  revalidatePath("/deliveries");
  revalidatePath("/");
  revalidatePath("/distributors");
  return { savedAt: Date.now() };
}

export async function updateDeliveryAction(
  id: number,
  _prevState: DeliveryFormState,
  formData: FormData
): Promise<DeliveryFormState> {
  await verifySession();
  const parsed = parseDelivery(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  await updateDelivery(id, {
    ...parsed.data,
    createdAt: entryTimestamp(parsed.data.date, parsed.data.time),
  });
  revalidatePath("/deliveries");
  revalidatePath("/");
  revalidatePath("/distributors");
  redirect("/deliveries");
}

export async function deleteDeliveryAction(id: number) {
  await verifySession();
  await deleteDelivery(id);
  revalidatePath("/deliveries");
  revalidatePath("/");
  revalidatePath("/distributors");
}

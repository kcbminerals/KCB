"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { verifySession } from "@/lib/auth";
import {
  createDelivery,
  updateDelivery,
  deleteDelivery,
  getDistributorSummary,
} from "@/lib/queries";
import { formatDate, formatMoney } from "@/lib/format";
import { normalizeIndianPhone, type WhatsAppMessage } from "@/lib/whatsapp";

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

export type DeliveryFormState =
  | { error?: string; savedAt?: number; whatsapp?: WhatsAppMessage }
  | undefined;

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

  // Prepare a ready-to-send WhatsApp message for the distributor. The
  // summary is re-read after the save so the balance includes this entry.
  let whatsapp: WhatsAppMessage | undefined;
  const summary = await getDistributorSummary(parsed.data.distributorId).catch(
    () => undefined
  );
  if (summary) {
    const { jarsLoaded, pricePerJar, paidAmount, date } = parsed.data;
    whatsapp = {
      phone: normalizeIndianPhone(summary.phone),
      text: [
        `KCB Minerals — delivery on ${formatDate(date)}`,
        `Jars delivered: ${jarsLoaded} @ ${formatMoney(pricePerJar)}`,
        `Bill: ${formatMoney(jarsLoaded * pricePerJar)}`,
        `Paid: ${formatMoney(paidAmount)}`,
        `Total balance due: ${formatMoney(summary.total_due)}`,
        `Thank you!`,
      ].join("\n"),
    };
  }
  return { savedAt: Date.now(), whatsapp };
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

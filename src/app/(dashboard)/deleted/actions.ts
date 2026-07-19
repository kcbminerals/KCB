"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { restoreDelivery, restorePayment } from "@/lib/queries";

export async function restoreDeliveryAction(id: number) {
  await requireAdmin();
  await restoreDelivery(id);
  // A restored entry must reappear in every list, report, and total.
  revalidatePath("/", "layout");
}

export async function restorePaymentAction(id: number) {
  await requireAdmin();
  await restorePayment(id);
  revalidatePath("/", "layout");
}

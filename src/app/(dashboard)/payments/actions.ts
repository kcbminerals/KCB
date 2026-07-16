"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { verifySession } from "@/lib/auth";
import { createPayment, deletePayment } from "@/lib/queries";

const paymentSchema = z.object({
  date: z.string().min(1, "Date is required"),
  distributorId: z.coerce.number().int().positive("Choose a distributor"),
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  method: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

export type PaymentFormState = { error?: string } | undefined;

export async function createPaymentAction(
  _prevState: PaymentFormState,
  formData: FormData
): Promise<PaymentFormState> {
  await verifySession();
  const parsed = paymentSchema.safeParse({
    date: formData.get("date"),
    distributorId: formData.get("distributorId"),
    amount: formData.get("amount"),
    method: formData.get("method"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  await createPayment(parsed.data);
  revalidatePath("/payments");
  revalidatePath("/");
  revalidatePath("/distributors");
  return undefined;
}

export async function deletePaymentAction(id: number) {
  await verifySession();
  await deletePayment(id);
  revalidatePath("/payments");
  revalidatePath("/");
  revalidatePath("/distributors");
}

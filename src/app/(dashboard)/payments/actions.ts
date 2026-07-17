"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { verifySession } from "@/lib/auth";
import { createPayment, deletePayment } from "@/lib/queries";

const paymentSchema = z.object({
  date: z.string().min(1, "Date is required"),
  time: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "Enter a valid time")
    .optional(),
  distributorId: z.coerce.number().int().positive("Choose a distributor"),
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  method: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

export type PaymentFormState = { error?: string; savedAt?: number } | undefined;

export async function createPaymentAction(
  _prevState: PaymentFormState,
  formData: FormData
): Promise<PaymentFormState> {
  await verifySession();
  const timeRaw = formData.get("time");
  const parsed = paymentSchema.safeParse({
    date: formData.get("date"),
    time: timeRaw ? timeRaw : undefined,
    distributorId: formData.get("distributorId"),
    amount: formData.get("amount"),
    method: formData.get("method"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  // Stored timezone-naive so the time always reads back exactly as entered.
  await createPayment({
    ...parsed.data,
    createdAt: parsed.data.time ? `${parsed.data.date}T${parsed.data.time}` : null,
  });
  revalidatePath("/payments");
  revalidatePath("/");
  revalidatePath("/distributors");
  return { savedAt: Date.now() };
}

export async function deletePaymentAction(id: number) {
  await verifySession();
  await deletePayment(id);
  revalidatePath("/payments");
  revalidatePath("/");
  revalidatePath("/distributors");
}

"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { verifySession } from "@/lib/auth";
import { createPayment, deletePayment, getDistributorSummary } from "@/lib/queries";
import { formatDate, formatMoney } from "@/lib/format";
import { normalizeIndianPhone, type WhatsAppMessage } from "@/lib/whatsapp";

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

export type PaymentFormState =
  | { error?: string; savedAt?: number; whatsapp?: WhatsAppMessage }
  | undefined;

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

  // Prepare a ready-to-send WhatsApp receipt for the distributor. The
  // summary is re-read after the save so the balance includes this payment.
  let whatsapp: WhatsAppMessage | undefined;
  const summary = await getDistributorSummary(parsed.data.distributorId).catch(
    () => undefined
  );
  if (summary) {
    whatsapp = {
      phone: normalizeIndianPhone(summary.phone),
      text: [
        `KCB Minerals — payment received on ${formatDate(parsed.data.date)}`,
        `Amount: ${formatMoney(parsed.data.amount)}${
          parsed.data.method ? ` (${parsed.data.method})` : ""
        }`,
        `Remaining balance due: ${formatMoney(summary.total_due)}`,
        `Thank you!`,
      ].join("\n"),
    };
  }
  return { savedAt: Date.now(), whatsapp };
}

export async function deletePaymentAction(id: number) {
  await verifySession();
  await deletePayment(id);
  revalidatePath("/payments");
  revalidatePath("/");
  revalidatePath("/distributors");
}

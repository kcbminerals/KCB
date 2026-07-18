/** Prepared WhatsApp message returned to the entry forms after a save. */
export type WhatsAppMessage = {
  /** Full international number (digits only, e.g. "9198765...") or null if
   *  the distributor has no usable phone number saved. */
  phone: string | null;
  text: string;
};

/** Converts a phone number as typed ("98765 43210", "098765-43210",
 *  "+91 98765 43210") into the international digits-only form wa.me needs.
 *  Indian 10-digit numbers get the 91 country code. */
export function normalizeIndianPhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let digits = raw.replace(/\D/g, "");
  digits = digits.replace(/^0+/, "");
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return digits;
  // Some other country code / format — trust it if it looks like a full
  // international number.
  if (digits.length > 10) return digits;
  return null;
}

export function waLink(message: WhatsAppMessage): string {
  const text = encodeURIComponent(message.text);
  // Without a number, wa.me opens WhatsApp's contact picker with the
  // message pre-filled, so the entry can still be sent manually.
  return message.phone
    ? `https://wa.me/${message.phone}?text=${text}`
    : `https://wa.me/?text=${text}`;
}

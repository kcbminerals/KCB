const CURRENCY_SYMBOL = "₹"; // Rupee sign
const IST = "Asia/Kolkata";
// Timestamps written by newer app versions are timezone-naive IST wall-clock
// strings ("2026-07-17T18:05"); older rows carry a UTC marker ("...Z"). Naive
// strings are shown as-is; marked ones get converted to IST for display.
const HAS_TZ_MARKER = /(Z|[+-]\d{2}:?\d{2})$/;

export function formatMoney(amount: number): string {
  const rounded = Math.round(amount * 100) / 100;
  return `${CURRENCY_SYMBOL}${rounded.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** Current IST timestamp as a naive "YYYY-MM-DDTHH:MM:SS" string, the format
 *  stored in the Google Sheet so times read naturally there. */
export function nowIstTimestamp(): string {
  // sv-SE formats as "YYYY-MM-DD HH:MM:SS"
  return new Date().toLocaleString("sv-SE", { timeZone: IST }).replace(" ", "T");
}

export function todayIso(): string {
  // en-CA formats as "YYYY-MM-DD"
  return new Date().toLocaleDateString("en-CA", { timeZone: IST });
}

export function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}-${m}-${y}`;
}

/** Formats a stored timestamp (e.g. a created_at value) as an IST date + time. */
export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const tz = HAS_TZ_MARKER.test(iso) ? { timeZone: IST } : {};
  const datePart = date
    .toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric", ...tz })
    .replace(/\//g, "-");
  const timePart = date.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    ...tz,
  });
  return `${datePart} ${timePart}`;
}

/** Normalizes a stored timestamp to a sortable IST wall-clock string, so
 *  naive-IST rows and older UTC-marked rows order correctly against each
 *  other — used to keep backdated (late) entries in true time order. */
export function sortableTimestamp(iso: string): string {
  if (!iso) return "";
  if (HAS_TZ_MARKER.test(iso)) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString("sv-SE", { timeZone: IST }).replace(" ", "T");
  }
  return iso;
}

/** Turns a stored date cell in any common form ("2026-07-19", "19/07/2026",
 *  stray spaces) into a comparable number like 20260719; 0 if unreadable. */
export function dateSortKey(raw: string): number {
  const s = (raw ?? "").trim();
  let m = s.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return Number(m[1]) * 10000 + Number(m[2]) * 100 + Number(m[3]);
  m = s.match(/(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (m) return Number(m[3]) * 10000 + Number(m[2]) * 100 + Number(m[1]);
  return 0;
}

/** Minutes-into-day from a stored timestamp in any common form: naive ISO
 *  (padded or not), UTC/offset-marked (converted to IST), or "h:mm am/pm".
 *  Tolerant on purpose — entry ordering must survive hand-edited cells. */
export function timeSortKey(raw: string): number {
  const s = (raw ?? "").trim();
  if (!s) return 0;
  const src = HAS_TZ_MARKER.test(s) ? sortableTimestamp(s) : s;
  let m = src.match(/T(\d{1,2}):(\d{2})/);
  if (!m) m = src.match(/(?:^|\s)(\d{1,2}):(\d{2})/);
  if (!m) return 0;
  let h = Number(m[1]);
  const min = Number(m[2]);
  const ampm = src.match(/\b(am|pm)\b/i)?.[1]?.toLowerCase();
  if (ampm === "pm" && h < 12) h += 12;
  if (ampm === "am" && h === 12) h = 0;
  return h * 60 + min;
}

/** Current IST time as an HH:MM string suitable for a <input type="time"> value. */
export function nowTimeValue(): string {
  return new Date().toLocaleString("sv-SE", { timeZone: IST }).slice(11, 16);
}

/** HH:MM extracted from a stored timestamp, for pre-filling a <input type="time">. */
export function timeInputValue(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  if (HAS_TZ_MARKER.test(iso)) {
    return d.toLocaleString("sv-SE", { timeZone: IST }).slice(11, 16);
  }
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** Formats just the time portion of a stored timestamp in IST, e.g. "2:15 PM". */
export function formatTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    ...(HAS_TZ_MARKER.test(iso) ? { timeZone: IST } : {}),
  });
}

export function shiftDay(iso: string, days: number): string {
  const date = new Date(`${iso}T00:00:00`);
  date.setDate(date.getDate() + days);
  return toIso(date);
}

/** Monday-start week containing the given ISO date. */
export function weekRange(iso: string): { from: string; to: string } {
  const date = new Date(`${iso}T00:00:00`);
  const day = date.getDay(); // 0 = Sunday
  const diffToMonday = day === 0 ? 6 : day - 1;
  const monday = new Date(date);
  monday.setDate(date.getDate() - diffToMonday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { from: toIso(monday), to: toIso(sunday) };
}

export function shiftWeek(iso: string, weeks: number): string {
  const date = new Date(`${iso}T00:00:00`);
  date.setDate(date.getDate() + weeks * 7);
  return toIso(date);
}

export function monthRange(yearMonth: string): { from: string; to: string } {
  const [year, month] = yearMonth.split("-").map(Number);
  const from = new Date(year, month - 1, 1);
  const to = new Date(year, month, 0);
  return { from: toIso(from), to: toIso(to) };
}

export function shiftMonth(yearMonth: string, months: number): string {
  const [year, month] = yearMonth.split("-").map(Number);
  const date = new Date(year, month - 1 + months, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function currentYearMonth(): string {
  return todayIso().slice(0, 7);
}

function toIso(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(date.getDate()).padStart(2, "0")}`;
}

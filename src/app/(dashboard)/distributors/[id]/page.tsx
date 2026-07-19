import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import {
  getDistributorSummary,
  listDeliveries,
  listPayments,
} from "@/lib/queries";
import {
  formatMoney,
  formatDate,
  formatDateTime,
  formatTime,
  dateSortKey,
  timeSortKey,
  todayIso,
  weekRange,
  monthRange,
  currentYearMonth,
} from "@/lib/format";
import { setDistributorActiveAction } from "../actions";
import PrintButton from "@/components/PrintButton";
import ExportCsvButton from "@/components/ExportCsvButton";
import StatCard from "@/components/StatCard";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export default async function DistributorDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const rawRange = await searchParams;
  const distributorId = Number(id);
  const distributor = await getDistributorSummary(distributorId);
  if (!distributor) notFound();

  const from = rawRange.from && DATE_RE.test(rawRange.from) ? rawRange.from : undefined;
  const to = rawRange.to && DATE_RE.test(rawRange.to) ? rawRange.to : undefined;
  const hasRange = Boolean(from || to);

  const deliveries = await listDeliveries({ distributorId, from, to });
  const payments = await listPayments({ distributorId, from, to });

  type Entry = {
    date: string;
    created_at: string;
    kind: "delivery" | "payment";
    description: string;
    billed: number;
    paid: number;
  };
  const entries: Entry[] = [
    ...deliveries.map((d) => ({
      date: d.date,
      created_at: d.created_at,
      kind: "delivery" as const,
      description: `${d.jars_loaded} jars loaded${
        d.jars_returned ? `, ${d.jars_returned} returned` : ""
      }${d.vehicle_name ? ` (${d.vehicle_name})` : ""}`,
      billed: d.bill_amount,
      paid: d.paid_amount,
    })),
    ...payments.map((p) => ({
      date: p.date,
      created_at: p.created_at,
      kind: "payment" as const,
      description: `Payment received${p.method ? ` via ${p.method}` : ""}${
        p.notes ? ` — ${p.notes}` : ""
      }`,
      billed: 0,
      paid: p.amount,
    })),
  ].sort((a, b) => {
    const d = dateSortKey(b.date) - dateSortKey(a.date);
    if (d !== 0) return d;
    return timeSortKey(b.created_at) - timeSortKey(a.created_at);
  });

  const period = {
    jarsLoaded: deliveries.reduce((sum, d) => sum + d.jars_loaded, 0),
    billed: entries.reduce((sum, e) => sum + e.billed, 0),
    collected: entries.reduce((sum, e) => sum + e.paid, 0),
  };
  const periodLabel = hasRange
    ? `${from ? formatDate(from) : "start"} to ${to ? formatDate(to) : "today"}`
    : "All time";

  const week = weekRange(todayIso());
  const month = monthRange(currentYearMonth());
  const basePath = `/distributors/${distributorId}`;

  // The carried-over previous balance belongs in the all-time view only —
  // a date-filtered period shows just that period's activity.
  const openingInLedger = !hasRange ? distributor.opening_balance : 0;

  const csvRows: (string | number)[][] = entries.map((e) => [
    formatDate(e.date),
    formatTime(e.created_at),
    e.kind === "delivery" ? "Delivery" : "Payment",
    e.description,
    e.billed,
    e.paid,
  ]);
  if (openingInLedger !== 0) {
    csvRows.push(["", "", "Previous balance", "Old dues from before this app", openingInLedger, 0]);
  }
  csvRows.push(["Total", "", "", "", period.billed + openingInLedger, period.collected]);

  const toggleActive = setDistributorActiveAction.bind(
    null,
    distributorId,
    !distributor.active
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">{distributor.name}</h1>
            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-600">
              {distributor.category}
            </span>
          </div>
          <p className="text-sm text-slate-500">
            {distributor.phone ?? "No phone"} · {distributor.address ?? "No address"}
          </p>
          <p className="text-sm text-slate-500">
            Vehicles:{" "}
            {distributor.vehicle_labels.length > 0
              ? distributor.vehicle_labels.join(", ")
              : "— none —"}
          </p>
          {distributor.opening_balance !== 0 && (
            <p className="text-sm text-slate-500">
              Previous balance (before this app):{" "}
              <span className="font-medium text-slate-700">
                {formatMoney(distributor.opening_balance)}
              </span>
            </p>
          )}
          <p className="text-xs text-slate-400">
            Added {formatDateTime(distributor.created_at)}
          </p>
        </div>
        <div className="flex gap-2 no-print">
          <ExportCsvButton
            filename={`${distributor.name.replace(/\s+/g, "-")}-report${
              hasRange ? `-${from ?? "start"}-to-${to ?? "today"}` : ""
            }.csv`}
            headers={["Date", "Time", "Type", "Details", "Billed", "Paid"]}
            rows={csvRows}
          />
          <PrintButton />
          <Link
            href={`/distributors/${distributorId}/edit`}
            className="rounded-lg border border-slate-300 px-3 py-1.5 transition-colors text-sm font-medium hover:bg-slate-50"
          >
            Edit
          </Link>
          <form action={toggleActive}>
            <button
              type="submit"
              className="rounded-lg border border-slate-300 px-3 py-1.5 transition-colors text-sm font-medium hover:bg-slate-50"
            >
              {distributor.active ? "Deactivate" : "Activate"}
            </button>
          </form>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Price per jar" value={formatMoney(distributor.price_per_jar)} />
        <StatCard label="Jars with distributor" value={String(distributor.jar_balance)} />
        <StatCard
          label="Total billed (all time)"
          value={formatMoney(distributor.total_billed)}
        />
        <StatCard
          label="Outstanding due"
          value={formatMoney(distributor.total_due)}
          tone={distributor.total_due > 0 ? "warning" : "good"}
        />
      </div>

      <div className="no-print rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-end gap-3">
          <form className="flex flex-wrap items-end gap-2">
            <div className="flex flex-col gap-1">
              <label htmlFor="from" className="text-xs font-medium text-slate-500">
                From
              </label>
              <input
                id="from"
                name="from"
                type="date"
                defaultValue={from ?? ""}
                className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="to" className="text-xs font-medium text-slate-500">
                To
              </label>
              <input
                id="to"
                name="to"
                type="date"
                defaultValue={to ?? ""}
                className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
              />
            </div>
            <button
              type="submit"
              className="rounded-lg bg-gradient-to-b from-sky-500 to-sky-600 px-3 py-1.5 text-sm font-semibold text-white shadow-md shadow-sky-500/25 transition hover:from-sky-400 hover:to-sky-500"
            >
              Apply
            </button>
          </form>
          <div className="flex flex-wrap gap-2 text-sm">
            <Link
              href={`${basePath}?from=${todayIso()}&to=${todayIso()}`}
              className="rounded-lg border border-slate-300 px-3 py-1.5 transition-colors font-medium text-slate-600 hover:bg-slate-50"
            >
              Today
            </Link>
            <Link
              href={`${basePath}?from=${week.from}&to=${week.to}`}
              className="rounded-lg border border-slate-300 px-3 py-1.5 transition-colors font-medium text-slate-600 hover:bg-slate-50"
            >
              This week
            </Link>
            <Link
              href={`${basePath}?from=${month.from}&to=${month.to}`}
              className="rounded-lg border border-slate-300 px-3 py-1.5 transition-colors font-medium text-slate-600 hover:bg-slate-50"
            >
              This month
            </Link>
            <Link
              href={basePath}
              className="rounded-lg border border-slate-300 px-3 py-1.5 transition-colors font-medium text-slate-600 hover:bg-slate-50"
            >
              All time
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label={`Jars loaded (${periodLabel})`} value={String(period.jarsLoaded)} />
        <StatCard label={`Billed (${periodLabel})`} value={formatMoney(period.billed)} />
        <StatCard
          label={`Collected (${periodLabel})`}
          value={formatMoney(period.collected)}
          tone="good"
        />
        <StatCard
          label={`Balance (${periodLabel})`}
          value={formatMoney(period.billed + openingInLedger - period.collected)}
          tone={period.billed + openingInLedger - period.collected > 0 ? "warning" : "good"}
        />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-4 py-3">
          <h2 className="font-semibold text-slate-900">Ledger — {periodLabel}</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80 text-left text-xs uppercase tracking-wider text-slate-500">
                <th className="px-4 py-2 font-medium">Date</th>
                <th className="px-4 py-2 font-medium">Details</th>
                <th className="px-4 py-2 font-medium text-right">Billed</th>
                <th className="px-4 py-2 font-medium text-right">Paid</th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-slate-400">
                    No activity in this period.
                  </td>
                </tr>
              )}
              {entries.map((e, i) => (
                <tr key={i} className="border-b border-slate-50 transition-colors hover:bg-sky-50/50 last:border-0">
                  <td className="px-4 py-2 whitespace-nowrap">
                    {formatDate(e.date)}
                    <div className="text-xs text-slate-400">{formatTime(e.created_at)}</div>
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className={`mr-2 rounded px-1.5 py-0.5 text-xs font-medium ${
                        e.kind === "delivery"
                          ? "bg-sky-50 text-sky-700"
                          : "bg-emerald-50 text-emerald-700"
                      }`}
                    >
                      {e.kind === "delivery" ? "Delivery" : "Payment"}
                    </span>
                    {e.description}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {e.billed ? formatMoney(e.billed) : "—"}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {e.paid ? formatMoney(e.paid) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
            {(entries.length > 0 || openingInLedger !== 0) && (
              <tfoot>
                {openingInLedger !== 0 && (
                  <tr className="border-t border-slate-200 text-slate-600">
                    <td className="px-4 py-2" colSpan={2}>
                      Previous balance (before this app)
                    </td>
                    <td className="px-4 py-2 text-right">{formatMoney(openingInLedger)}</td>
                    <td className="px-4 py-2 text-right">—</td>
                  </tr>
                )}
                <tr className="border-t border-slate-200 font-semibold text-slate-900">
                  <td className="px-4 py-2">Total</td>
                  <td className="px-4 py-2"></td>
                  <td className="px-4 py-2 text-right">
                    {formatMoney(period.billed + openingInLedger)}
                  </td>
                  <td className="px-4 py-2 text-right">{formatMoney(period.collected)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}

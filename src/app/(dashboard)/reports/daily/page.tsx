import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { getReport, listDistributors } from "@/lib/queries";
import { todayIso, shiftDay, formatDate } from "@/lib/format";
import ReportView from "@/components/ReportView";
import ReportFilters from "@/components/ReportFilters";
import type { DistributorCategory } from "@/lib/types";
import { DISTRIBUTOR_CATEGORIES } from "@/lib/types";

export default async function DailyReportPage({
  searchParams,
}: {
  searchParams: Promise<{ day?: string; distributorId?: string; category?: string }>;
}) {
  await requireAdmin();
  const { day, distributorId, category } = await searchParams;
  const anchor = day && /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : todayIso();
  const validCategory = (DISTRIBUTOR_CATEGORIES as readonly string[]).includes(category ?? "")
    ? (category as DistributorCategory)
    : undefined;
  const report = await getReport(anchor, anchor, {
    distributorId: distributorId ? Number(distributorId) : undefined,
    category: validCategory,
  });
  const distributors = await listDistributors(true);

  const prevDay = shiftDay(anchor, -1);
  const nextDay = shiftDay(anchor, 1);
  const filterQuery = `${distributorId ? `&distributorId=${distributorId}` : ""}${
    validCategory ? `&category=${validCategory}` : ""
  }`;
  const filterLabel = distributorId
    ? distributors.find((d) => d.id === Number(distributorId))?.name
    : validCategory;
  const exportFilename = `daily-sales-${anchor}${filterLabel ? `-${filterLabel}` : ""}`.replace(
    /\s+/g,
    "-"
  );

  return (
    <ReportView
      title="Daily sales"
      subtitle={formatDate(anchor)}
      report={report}
      exportFilename={exportFilename}
      filters={
        <ReportFilters
          basePath="/reports/daily"
          anchorParamName="day"
          anchorValue={anchor}
          distributors={distributors}
          distributorId={distributorId ? Number(distributorId) : undefined}
          category={validCategory}
        />
      }
      nav={
        <div className="no-print flex items-center gap-2 text-sm">
          <Link
            href={`/reports/daily?day=${prevDay}${filterQuery}`}
            className="rounded-md border border-slate-300 px-3 py-1.5 font-medium hover:bg-slate-50"
          >
            ← Previous
          </Link>
          <Link
            href={`/reports/daily${filterQuery ? `?${filterQuery.slice(1)}` : ""}`}
            className="rounded-md border border-slate-300 px-3 py-1.5 font-medium hover:bg-slate-50"
          >
            Today
          </Link>
          <Link
            href={`/reports/daily?day=${nextDay}${filterQuery}`}
            className="rounded-md border border-slate-300 px-3 py-1.5 font-medium hover:bg-slate-50"
          >
            Next →
          </Link>
        </div>
      }
    />
  );
}

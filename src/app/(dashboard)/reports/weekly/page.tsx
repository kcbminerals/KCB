import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { getReport, listDistributors } from "@/lib/queries";
import { todayIso, weekRange, shiftWeek, formatDate } from "@/lib/format";
import ReportView from "@/components/ReportView";
import ReportFilters from "@/components/ReportFilters";
import type { DistributorCategory } from "@/lib/types";
import { DISTRIBUTOR_CATEGORIES } from "@/lib/types";

export default async function WeeklyReportPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string; distributorId?: string; category?: string }>;
}) {
  await requireAdmin();
  const { week, distributorId, category } = await searchParams;
  const anchor = week && /^\d{4}-\d{2}-\d{2}$/.test(week) ? week : todayIso();
  const { from, to } = weekRange(anchor);
  const validCategory = (DISTRIBUTOR_CATEGORIES as readonly string[]).includes(category ?? "")
    ? (category as DistributorCategory)
    : undefined;
  const report = await getReport(from, to, {
    distributorId: distributorId ? Number(distributorId) : undefined,
    category: validCategory,
  });
  const distributors = await listDistributors(true);

  const prevWeek = shiftWeek(anchor, -1);
  const nextWeek = shiftWeek(anchor, 1);
  const filterQuery = `${distributorId ? `&distributorId=${distributorId}` : ""}${
    validCategory ? `&category=${validCategory}` : ""
  }`;
  const filterLabel = distributorId
    ? distributors.find((d) => d.id === Number(distributorId))?.name
    : validCategory;
  const exportFilename = `weekly-report-${from}-to-${to}${
    filterLabel ? `-${filterLabel}` : ""
  }`.replace(/\s+/g, "-");

  return (
    <ReportView
      title="Weekly report"
      subtitle={`${formatDate(from)} to ${formatDate(to)}`}
      report={report}
      exportFilename={exportFilename}
      filters={
        <ReportFilters
          basePath="/reports/weekly"
          anchorParamName="week"
          anchorValue={anchor}
          distributors={distributors}
          distributorId={distributorId ? Number(distributorId) : undefined}
          category={validCategory}
        />
      }
      nav={
        <div className="no-print flex items-center gap-2 text-sm">
          <Link
            href={`/reports/weekly?week=${prevWeek}${filterQuery}`}
            className="rounded-md border border-slate-300 px-3 py-1.5 font-medium hover:bg-slate-50"
          >
            ← Previous
          </Link>
          <Link
            href={`/reports/weekly${filterQuery ? `?${filterQuery.slice(1)}` : ""}`}
            className="rounded-md border border-slate-300 px-3 py-1.5 font-medium hover:bg-slate-50"
          >
            This week
          </Link>
          <Link
            href={`/reports/weekly?week=${nextWeek}${filterQuery}`}
            className="rounded-md border border-slate-300 px-3 py-1.5 font-medium hover:bg-slate-50"
          >
            Next →
          </Link>
        </div>
      }
    />
  );
}

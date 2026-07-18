import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { getReport, listDistributors } from "@/lib/queries";
import { currentYearMonth, monthRange, shiftMonth, formatDate } from "@/lib/format";
import ReportView from "@/components/ReportView";
import ReportFilters from "@/components/ReportFilters";
import type { DistributorCategory } from "@/lib/types";
import { DISTRIBUTOR_CATEGORIES } from "@/lib/types";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default async function MonthlyReportPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; distributorId?: string; category?: string }>;
}) {
  await requireAdmin();
  const { month, distributorId, category } = await searchParams;
  const anchor = month && /^\d{4}-\d{2}$/.test(month) ? month : currentYearMonth();
  const { from, to } = monthRange(anchor);
  const validCategory = (DISTRIBUTOR_CATEGORIES as readonly string[]).includes(category ?? "")
    ? (category as DistributorCategory)
    : undefined;
  const report = await getReport(from, to, {
    distributorId: distributorId ? Number(distributorId) : undefined,
    category: validCategory,
  });
  const distributors = await listDistributors(true);

  const [year, monthNum] = anchor.split("-").map(Number);
  const prevMonth = shiftMonth(anchor, -1);
  const nextMonth = shiftMonth(anchor, 1);
  const filterQuery = `${distributorId ? `&distributorId=${distributorId}` : ""}${
    validCategory ? `&category=${validCategory}` : ""
  }`;
  const filterLabel = distributorId
    ? distributors.find((d) => d.id === Number(distributorId))?.name
    : validCategory;
  const exportFilename = `monthly-report-${anchor}${
    filterLabel ? `-${filterLabel}` : ""
  }`.replace(/\s+/g, "-");

  return (
    <ReportView
      title="Monthly report"
      subtitle={`${MONTH_NAMES[monthNum - 1]} ${year} (${formatDate(from)} to ${formatDate(to)})`}
      report={report}
      exportFilename={exportFilename}
      filters={
        <ReportFilters
          basePath="/reports/monthly"
          anchorParamName="month"
          anchorValue={anchor}
          distributors={distributors}
          distributorId={distributorId ? Number(distributorId) : undefined}
          category={validCategory}
        />
      }
      nav={
        <div className="no-print flex items-center gap-2 text-sm">
          <Link
            href={`/reports/monthly?month=${prevMonth}${filterQuery}`}
            className="rounded-lg border border-slate-300 px-3 py-1.5 transition-colors font-medium hover:bg-slate-50"
          >
            ← Previous
          </Link>
          <Link
            href={`/reports/monthly${filterQuery ? `?${filterQuery.slice(1)}` : ""}`}
            className="rounded-lg border border-slate-300 px-3 py-1.5 transition-colors font-medium hover:bg-slate-50"
          >
            This month
          </Link>
          <Link
            href={`/reports/monthly?month=${nextMonth}${filterQuery}`}
            className="rounded-lg border border-slate-300 px-3 py-1.5 transition-colors font-medium hover:bg-slate-50"
          >
            Next →
          </Link>
        </div>
      }
    />
  );
}

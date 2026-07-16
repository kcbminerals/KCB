import Link from "next/link";
import { verifySession } from "@/lib/auth";
import { getReport } from "@/lib/queries";
import { currentYearMonth, monthRange, shiftMonth, formatDate } from "@/lib/format";
import ReportView from "@/components/ReportView";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default async function MonthlyReportPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  await verifySession();
  const { month } = await searchParams;
  const anchor = month && /^\d{4}-\d{2}$/.test(month) ? month : currentYearMonth();
  const { from, to } = monthRange(anchor);
  const report = await getReport(from, to);

  const [year, monthNum] = anchor.split("-").map(Number);
  const prevMonth = shiftMonth(anchor, -1);
  const nextMonth = shiftMonth(anchor, 1);

  return (
    <ReportView
      title="Monthly report"
      subtitle={`${MONTH_NAMES[monthNum - 1]} ${year} (${formatDate(from)} to ${formatDate(to)})`}
      report={report}
      nav={
        <div className="no-print flex items-center gap-2 text-sm">
          <Link
            href={`/reports/monthly?month=${prevMonth}`}
            className="rounded-md border border-slate-300 px-3 py-1.5 font-medium hover:bg-slate-50"
          >
            ← Previous
          </Link>
          <Link
            href="/reports/monthly"
            className="rounded-md border border-slate-300 px-3 py-1.5 font-medium hover:bg-slate-50"
          >
            This month
          </Link>
          <Link
            href={`/reports/monthly?month=${nextMonth}`}
            className="rounded-md border border-slate-300 px-3 py-1.5 font-medium hover:bg-slate-50"
          >
            Next →
          </Link>
        </div>
      }
    />
  );
}

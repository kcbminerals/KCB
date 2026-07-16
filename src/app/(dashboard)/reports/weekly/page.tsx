import Link from "next/link";
import { verifySession } from "@/lib/auth";
import { getReport } from "@/lib/queries";
import { todayIso, weekRange, shiftWeek, formatDate } from "@/lib/format";
import ReportView from "@/components/ReportView";

export default async function WeeklyReportPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  await verifySession();
  const { week } = await searchParams;
  const anchor = week && /^\d{4}-\d{2}-\d{2}$/.test(week) ? week : todayIso();
  const { from, to } = weekRange(anchor);
  const report = await getReport(from, to);

  const prevWeek = shiftWeek(anchor, -1);
  const nextWeek = shiftWeek(anchor, 1);

  return (
    <ReportView
      title="Weekly report"
      subtitle={`${formatDate(from)} to ${formatDate(to)}`}
      report={report}
      nav={
        <div className="no-print flex items-center gap-2 text-sm">
          <Link
            href={`/reports/weekly?week=${prevWeek}`}
            className="rounded-md border border-slate-300 px-3 py-1.5 font-medium hover:bg-slate-50"
          >
            ← Previous
          </Link>
          <Link
            href="/reports/weekly"
            className="rounded-md border border-slate-300 px-3 py-1.5 font-medium hover:bg-slate-50"
          >
            This week
          </Link>
          <Link
            href={`/reports/weekly?week=${nextWeek}`}
            className="rounded-md border border-slate-300 px-3 py-1.5 font-medium hover:bg-slate-50"
          >
            Next →
          </Link>
        </div>
      }
    />
  );
}

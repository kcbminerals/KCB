import type { Distributor, DistributorCategory } from "@/lib/types";
import { DISTRIBUTOR_CATEGORIES } from "@/lib/types";

export default function ReportFilters({
  basePath,
  anchorParamName,
  anchorValue,
  distributors,
  distributorId,
  category,
}: {
  basePath: string;
  anchorParamName: string;
  anchorValue: string;
  distributors: Distributor[];
  distributorId?: number;
  category?: DistributorCategory;
}) {
  return (
    <form
      action={basePath}
      method="get"
      className="no-print flex flex-wrap items-center gap-2 text-sm"
    >
      <input type="hidden" name={anchorParamName} value={anchorValue} />
      <select
        name="distributorId"
        defaultValue={distributorId ?? ""}
        className="rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm"
      >
        <option value="">All distributors</option>
        {distributors.map((d) => (
          <option key={d.id} value={d.id}>
            {d.name}
          </option>
        ))}
      </select>
      <select
        name="category"
        defaultValue={category ?? ""}
        className="rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm"
      >
        <option value="">All categories</option>
        {DISTRIBUTOR_CATEGORIES.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
      <button
        type="submit"
        className="rounded-lg border border-slate-200 px-3 py-1.5 transition-colors font-medium hover:bg-slate-50"
      >
        Search
      </button>
    </form>
  );
}

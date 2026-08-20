import { NextResponse, type NextRequest } from "next/server";
import { sortSheetByDate } from "@/lib/queries";
import { decrypt } from "@/lib/session";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Admin-triggered tidy-up that re-sorts the entry tabs chronologically.
 *
 *  Deliberately NOT run after each save: the Sheets client writes rows by
 *  their position, so re-ordering rows while someone else's save is in
 *  flight makes that save land on the wrong row and overwrite another
 *  entry. On demand, when nobody is mid-entry, it is safe. */
export async function GET(request: NextRequest) {
  const session = await decrypt(request.cookies.get("kcb_session")?.value);
  if (session?.role !== "admin") {
    return NextResponse.json({ error: "Admins only." }, { status: 401 });
  }
  try {
    await sortSheetByDate("Deliveries");
    await sortSheetByDate("Payments");
    return NextResponse.json({ ok: true, sorted: ["Deliveries", "Payments"] });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: (err as Error).message },
      { status: 500 }
    );
  }
}

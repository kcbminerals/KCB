import { NextResponse, type NextRequest } from "next/server";
import { cleanupLegacyIdColumns } from "@/lib/sheets";
import { decrypt } from "@/lib/session";

export const dynamic = "force-dynamic";
// Allow a longer run than a normal page — this touches many cells at once.
export const maxDuration = 60;

/** Admin-triggered, on-demand cleanup that fills the name/number columns from
 *  the legacy ids and removes the id columns. Kept OUT of app startup so a
 *  slow run can never take the app down. Safe to run repeatedly. */
export async function GET(request: NextRequest) {
  const session = await decrypt(request.cookies.get("kcb_session")?.value);
  if (session?.role !== "admin") {
    return NextResponse.json({ error: "Admins only." }, { status: 401 });
  }
  try {
    const result = await cleanupLegacyIdColumns();
    return NextResponse.json({ ok: true, result });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: (err as Error).message },
      { status: 500 }
    );
  }
}

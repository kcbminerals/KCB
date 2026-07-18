import { NextResponse, type NextRequest } from "next/server";
import { put, list, del } from "@vercel/blob";
import { buildBackup } from "@/lib/backup";
import { decrypt } from "@/lib/session";

export const dynamic = "force-dynamic";

// Each backup is a complete snapshot, so older ones are redundant copies;
// two months of daily snapshots is plenty of history.
const KEEP_LAST = 60;

/** Takes a full snapshot of the Google Sheet data and stores it in Vercel
 *  Blob storage — a second copy of the data outside Google entirely.
 *  Called automatically by the daily Vercel cron (Authorization: Bearer
 *  CRON_SECRET) and manually by a signed-in admin. */
export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  const cronOk =
    Boolean(process.env.CRON_SECRET) &&
    auth === `Bearer ${process.env.CRON_SECRET}`;
  let adminOk = false;
  if (!cronOk) {
    const session = await decrypt(request.cookies.get("kcb_session")?.value);
    adminOk = session?.role === "admin";
  }
  if (!cronOk && !adminOk) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      {
        stored: false,
        error:
          "Blob storage is not connected. In Vercel: Storage → Create → Blob → Connect to this project, then redeploy.",
      },
      { status: 500 }
    );
  }

  const backup = await buildBackup();
  const stamp = backup.created_at.replace(/:/g, "-");
  const blob = await put(
    `backups/kcb-backup-${stamp}.json`,
    JSON.stringify(backup, null, 2),
    { access: "public", contentType: "application/json" }
  );

  const { blobs } = await list({ prefix: "backups/" });
  const sorted = [...blobs].sort(
    (a, b) => +new Date(b.uploadedAt) - +new Date(a.uploadedAt)
  );
  const stale = sorted.slice(KEEP_LAST);
  if (stale.length > 0) {
    await del(stale.map((b) => b.url));
  }

  return NextResponse.json({
    stored: true,
    file: blob.pathname,
    backups_kept: Math.min(sorted.length, KEEP_LAST),
  });
}

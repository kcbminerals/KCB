import { requireAdmin } from "@/lib/auth";
import { buildBackup } from "@/lib/backup";

export const dynamic = "force-dynamic";

/** Lets a signed-in admin download the full data snapshot as a JSON file —
 *  an offline backup on their own phone/computer, independent of both
 *  Google and Vercel. */
export async function GET() {
  await requireAdmin();
  const backup = await buildBackup();
  const filename = `kcb-minerals-backup-${backup.created_at.slice(0, 10)}.json`;
  return new Response(JSON.stringify(backup, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

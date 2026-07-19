import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Identifies the currently deployed version so open tabs can detect a new
 *  deployment and reload themselves (see AutoRefresh). */
export async function GET() {
  return NextResponse.json({
    version:
      process.env.VERCEL_GIT_COMMIT_SHA ??
      process.env.VERCEL_DEPLOYMENT_ID ??
      "dev",
  });
}

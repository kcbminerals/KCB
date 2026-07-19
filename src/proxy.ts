import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { decrypt } from "@/lib/session";

const COOKIE_NAME = "kcb_session";
const PUBLIC_PATHS = ["/login"];
const STAFF_ALLOWED_PATHS = ["/deliveries", "/payments", "/account", "/distributors/new"];
const STAFF_HOME = "/deliveries";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Backup routes do their own auth (cron secret or admin session) — the
  // login redirect here would break the Vercel cron and file downloads.
  // The version endpoint is public so stale tabs can detect new deploys.
  if (pathname.startsWith("/api/backup") || pathname === "/api/version") {
    return NextResponse.next();
  }

  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  const cookie = request.cookies.get(COOKIE_NAME)?.value;
  const session = await decrypt(cookie);

  if (!isPublic && !session?.userId) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isPublic && session?.userId) {
    const home = session.role === "admin" ? "/" : STAFF_HOME;
    return NextResponse.redirect(new URL(home, request.url));
  }

  // Staff can fully manage deliveries/payments (add, edit, delete) and their
  // own account, but everything else — dashboard, reports, distributors,
  // vehicles, users — is admin-only.
  if (session?.userId && session.role !== "admin") {
    const allowed = STAFF_ALLOWED_PATHS.some(
      (p) => pathname === p || pathname.startsWith(`${p}/`)
    );
    if (!allowed) {
      return NextResponse.redirect(new URL(STAFF_HOME, request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|logo.png|icon.png|apple-icon.png).*)",
  ],
};

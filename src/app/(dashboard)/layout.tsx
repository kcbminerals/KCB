import Link from "next/link";
import Image from "next/image";
import { verifySession } from "@/lib/auth";
import NavLink from "@/components/NavLink";
import AutoRefresh from "@/components/AutoRefresh";
import { logoutAction } from "./actions";

// Never serve cached pages — every view reads live data from the Google
// Sheet. (Pages are already dynamic via the session cookie; this makes the
// guarantee explicit.)
export const dynamic = "force-dynamic";

const ADMIN_NAV_ITEMS = [
  { href: "/", label: "Dashboard" },
  { href: "/deliveries", label: "Deliveries" },
  { href: "/payments", label: "Payments" },
  { href: "/distributors", label: "Distributors" },
  { href: "/reports", label: "Reports" },
  { href: "/users", label: "Users" },
];

const STAFF_NAV_ITEMS = [
  { href: "/deliveries", label: "Deliveries" },
  { href: "/payments", label: "Payments" },
  { href: "/distributors/new", label: "Add distributor" },
];

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await verifySession();
  const navItems = session.role === "admin" ? ADMIN_NAV_ITEMS : STAFF_NAV_ITEMS;

  return (
    <div className="flex min-h-screen flex-col">
      <AutoRefresh />
      <header className="no-print sticky top-0 z-40 bg-gradient-to-r from-sky-700 via-sky-600 to-sky-500 shadow-lg shadow-sky-900/20">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center justify-between">
            <Link
              href={session.role === "admin" ? "/" : "/deliveries"}
              className="rounded-xl bg-white px-2.5 py-1.5 shadow-md"
            >
              <Image
                src="/logo.png"
                alt="KCB Minerals"
                width={188}
                height={103}
                className="h-8 w-auto"
                priority
              />
            </Link>
            <div className="flex items-center gap-1 sm:hidden">
              <Link
                href="/account"
                className="rounded-full px-3 py-1.5 text-sm font-medium text-sky-100 transition-colors hover:bg-white/15 hover:text-white"
              >
                Account
              </Link>
              <form action={logoutAction}>
                <button
                  type="submit"
                  className="rounded-full px-3 py-1.5 text-sm font-medium text-sky-100 transition-colors hover:bg-white/15 hover:text-white"
                >
                  Sign out
                </button>
              </form>
            </div>
          </div>
          <nav className="flex flex-wrap gap-1">
            {navItems.map((item) => (
              <NavLink key={item.href} href={item.href}>
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="hidden items-center gap-3 sm:flex">
            <Link
              href="/account"
              className="text-sm font-medium text-sky-50 hover:text-white hover:underline"
            >
              {session.name}
              <span className="ml-1.5 rounded-full bg-white/20 px-2 py-0.5 text-xs font-semibold text-white">
                {session.role === "admin" ? "Admin" : "Staff"}
              </span>
            </Link>
            <form action={logoutAction}>
              <button
                type="submit"
                className="rounded-full px-3 py-1.5 text-sm font-medium text-sky-100 transition-colors hover:bg-white/15 hover:text-white"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        {children}
      </main>
      <footer className="no-print border-t border-slate-200/80 bg-white/60 px-4 py-3 text-center text-xs text-slate-400">
        KCB Minerals
      </footer>
    </div>
  );
}

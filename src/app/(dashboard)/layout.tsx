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
  { href: "/deleted", label: "Deleted" },
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
      <header className="no-print sticky top-0 z-40 border-b border-slate-200/80 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center justify-between">
            <Link
              href={session.role === "admin" ? "/" : "/deliveries"}
              className="flex items-center"
            >
              <Image
                src="/logo.png"
                alt="KCB Minerals"
                width={188}
                height={103}
                className="h-9 w-auto"
                priority
              />
            </Link>
            <div className="flex items-center gap-1 sm:hidden">
              <Link
                href="/account"
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
              >
                Account
              </Link>
              <form action={logoutAction}>
                <button
                  type="submit"
                  className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
                >
                  Sign out
                </button>
              </form>
            </div>
          </div>
          <nav className="flex flex-wrap gap-0.5">
            {navItems.map((item) => (
              <NavLink key={item.href} href={item.href}>
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="hidden items-center gap-3 sm:flex">
            <Link
              href="/account"
              className="group flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              {session.name}
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 group-hover:bg-slate-200">
                {session.role === "admin" ? "Admin" : "Staff"}
              </span>
            </Link>
            <form action={logoutAction}>
              <button
                type="submit"
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        {children}
      </main>
      <footer className="no-print border-t border-slate-200/70 px-4 py-4 text-center text-xs text-slate-400">
        KCB Minerals · Water Delivery Management
      </footer>
    </div>
  );
}

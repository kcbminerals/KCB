import Link from "next/link";
import Image from "next/image";
import { verifySession } from "@/lib/auth";
import NavLink from "@/components/NavLink";
import { logoutAction } from "./actions";

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
      <header className="no-print sticky top-0 z-40 border-b border-slate-200/80 bg-white/85 shadow-sm shadow-slate-900/[0.03] backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center justify-between">
            <Link href={session.role === "admin" ? "/" : "/deliveries"} className="flex items-center gap-2">
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
                className="rounded-md px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
              >
                Account
              </Link>
              <form action={logoutAction}>
                <button
                  type="submit"
                  className="rounded-md px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
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
              className="text-sm text-slate-500 hover:text-slate-700 hover:underline"
            >
              {session.name}
              <span className="ml-1.5 rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-500">
                {session.role === "admin" ? "Admin" : "Staff"}
              </span>
            </Link>
            <form action={logoutAction}>
              <button
                type="submit"
                className="rounded-md px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
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

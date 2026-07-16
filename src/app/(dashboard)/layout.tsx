import Link from "next/link";
import { verifySession } from "@/lib/auth";
import NavLink from "@/components/NavLink";
import { logoutAction } from "./actions";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard" },
  { href: "/deliveries", label: "Deliveries" },
  { href: "/payments", label: "Payments" },
  { href: "/distributors", label: "Distributors" },
  { href: "/vehicles", label: "Vehicles" },
  { href: "/reports", label: "Reports" },
];

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await verifySession();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="no-print border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center justify-between">
            <span className="text-lg font-bold text-slate-900">
              KCB Water Factory
            </span>
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
            {NAV_ITEMS.map((item) => (
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
    </div>
  );
}

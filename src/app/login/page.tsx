import Image from "next/image";
import LoginForm from "./LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f6f8fb] px-4">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-40 -top-40 h-96 w-96 rounded-full bg-blue-200/30 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-emerald-200/25 blur-3xl"
      />
      <div className="relative w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <Image
            src="/logo.png"
            alt="KCB Minerals"
            width={188}
            height={103}
            className="mb-4 h-16 w-auto"
            priority
          />
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">
            Welcome back
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Sign in to your KCB Minerals account
          </p>
        </div>
        <div className="card p-7">
          <LoginForm redirectTo={next && next.startsWith("/") ? next : "/"} />
        </div>
        <p className="mt-6 text-center text-xs text-slate-400">
          KCB Minerals · Water Delivery Management
        </p>
      </div>
    </div>
  );
}

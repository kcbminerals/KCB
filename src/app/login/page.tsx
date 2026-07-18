import Image from "next/image";
import LoginForm from "./LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      <div
        aria-hidden
        className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-sky-200/50 blur-3xl"
      />
      <div
        aria-hidden
        className="absolute -bottom-28 -left-24 h-80 w-80 rounded-full bg-sky-300/30 blur-3xl"
      />
      <div className="relative w-full max-w-sm rounded-2xl border border-slate-200/70 bg-white/90 p-8 shadow-xl shadow-sky-900/5 backdrop-blur">
        <div className="mb-6 flex flex-col items-center text-center">
          <Image
            src="/logo.png"
            alt="KCB Minerals"
            width={188}
            height={103}
            className="mb-3 h-16 w-auto"
            priority
          />
          <p className="text-sm text-slate-500">Sign in to continue</p>
        </div>
        <LoginForm redirectTo={next && next.startsWith("/") ? next : "/"} />
      </div>
    </div>
  );
}

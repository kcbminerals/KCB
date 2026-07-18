import Image from "next/image";
import LoginForm from "./LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-sky-700 via-sky-500 to-sky-400 px-4">
      <div
        aria-hidden
        className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-white/10 blur-3xl"
      />
      <div
        aria-hidden
        className="absolute -bottom-32 -left-24 h-96 w-96 rounded-full bg-sky-900/20 blur-3xl"
      />
      <div className="relative w-full max-w-sm rounded-3xl bg-white p-8 shadow-2xl shadow-sky-900/30">
        <div className="mb-6 flex flex-col items-center text-center">
          <Image
            src="/logo.png"
            alt="KCB Minerals"
            width={188}
            height={103}
            className="mb-3 h-16 w-auto"
            priority
          />
          <p className="text-sm font-medium text-slate-500">
            Sign in to continue
          </p>
        </div>
        <LoginForm redirectTo={next && next.startsWith("/") ? next : "/"} />
      </div>
    </div>
  );
}

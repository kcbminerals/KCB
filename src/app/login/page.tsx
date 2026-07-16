import LoginForm from "./LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-bold text-slate-900">KCB Water Factory</h1>
          <p className="mt-1 text-sm text-slate-500">Sign in to continue</p>
        </div>
        <LoginForm redirectTo={next && next.startsWith("/") ? next : "/"} />
      </div>
    </div>
  );
}

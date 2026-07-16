import { verifySession } from "@/lib/auth";
import ChangePasswordForm from "./ChangePasswordForm";

export default async function AccountPage() {
  const session = await verifySession();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Account</h1>
        <p className="text-sm text-slate-500">Signed in as {session.name}</p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-4 font-semibold text-slate-900">Change password</h2>
        <ChangePasswordForm />
      </div>
    </div>
  );
}

import { requireAdmin } from "@/lib/auth";
import { listUsers } from "@/lib/users";
import { formatDateTime } from "@/lib/format";
import UserForm from "./UserForm";
import { setUserActiveAction } from "./actions";

export default async function UsersPage() {
  const session = await requireAdmin();
  const users = await listUsers();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Users</h1>
        <p className="text-sm text-slate-500">
          Admins have full access. Staff can only record deliveries and payments —
          no reports, distributors, vehicles, or editing past entries.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <UserForm />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-slate-500">
                <th className="px-4 py-2 font-medium">Username</th>
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Role</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Added</th>
                <th className="px-4 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const isSelf = u.id === session.userId;
                const toggle = setUserActiveAction.bind(null, u.id, !u.active);
                return (
                  <tr key={u.id} className="border-b border-slate-50 last:border-0">
                    <td className="px-4 py-2 font-medium text-slate-900">
                      {u.username}
                      {isSelf && <span className="ml-2 text-xs text-slate-400">(you)</span>}
                    </td>
                    <td className="px-4 py-2">{u.name}</td>
                    <td className="px-4 py-2">
                      <span
                        className={`rounded px-1.5 py-0.5 text-xs font-medium ${
                          u.role === "admin"
                            ? "bg-sky-50 text-sky-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {u.role === "admin" ? "Admin" : "Staff"}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={`rounded px-1.5 py-0.5 text-xs font-medium ${
                          u.active
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {u.active ? "Active" : "Deactivated"}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-slate-500">
                      {formatDateTime(u.created_at)}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {isSelf ? (
                        <span className="text-slate-300">—</span>
                      ) : (
                        <form action={toggle}>
                          <button type="submit" className="text-sky-600 hover:underline">
                            {u.active ? "Deactivate" : "Activate"}
                          </button>
                        </form>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

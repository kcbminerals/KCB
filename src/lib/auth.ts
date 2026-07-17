import "server-only";
import bcrypt from "bcryptjs";
import { cache } from "react";
import { redirect } from "next/navigation";
import { getWorksheet } from "@/lib/sheets";
import { createSession, deleteSession, getSession } from "@/lib/session";
import type { UserRole } from "@/lib/types";

type UserRow = {
  id: number;
  username: string;
  password_hash: string;
  name: string;
  role: UserRole;
  active: number;
};

async function findUserRow(predicate: (row: {
  get(key: string): unknown;
}) => boolean) {
  const sheet = await getWorksheet("Users");
  const rows = await sheet.getRows();
  return rows.find(predicate);
}

function toUser(row: { get(key: string): unknown }): UserRow {
  const role = row.get("role");
  const active = row.get("active");
  return {
    id: Number(row.get("id")),
    username: String(row.get("username")),
    password_hash: String(row.get("password_hash")),
    name: String(row.get("name")),
    // Rows created before the role/active columns existed default to a
    // full admin account that's active, so nobody already using the app
    // gets silently locked out or demoted.
    role: role === "staff" ? "staff" : "admin",
    active: active === "" || active === undefined || active === null ? 1 : Number(active),
  };
}

export async function findUserByUsername(username: string): Promise<UserRow | undefined> {
  const row = await findUserRow((r) => String(r.get("username")) === username);
  return row ? toUser(row) : undefined;
}

export async function attemptLogin(
  username: string,
  password: string
): Promise<{ ok: true; role: UserRole } | { ok: false; error: string }> {
  const user = await findUserByUsername(username.trim());
  if (!user) {
    return { ok: false, error: "Invalid username or password." };
  }
  if (!user.active) {
    return { ok: false, error: "This account has been deactivated." };
  }
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    return { ok: false, error: "Invalid username or password." };
  }
  await createSession({
    userId: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
  });
  return { ok: true, role: user.role };
}

export async function logout(): Promise<void> {
  await deleteSession();
}

/** Verifies the session exists; redirects to /login otherwise. Use in server components/actions that need an authenticated user. */
export const verifySession = cache(async () => {
  const session = await getSession();
  if (!session?.userId) {
    redirect("/login");
  }
  return session;
});

/** Verifies the session exists AND belongs to an admin; redirects staff away otherwise. */
export async function requireAdmin() {
  const session = await verifySession();
  if (session.role !== "admin") {
    redirect("/deliveries");
  }
  return session;
}

export async function changePassword(
  userId: number,
  currentPassword: string,
  newPassword: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const row = await findUserRow((r) => Number(r.get("id")) === userId);
  if (!row) {
    return { ok: false, error: "User not found." };
  }
  const user = toUser(row);
  const valid = await bcrypt.compare(currentPassword, user.password_hash);
  if (!valid) {
    return { ok: false, error: "Current password is incorrect." };
  }
  if (newPassword.length < 6) {
    return { ok: false, error: "New password must be at least 6 characters." };
  }
  const hash = await bcrypt.hash(newPassword, 10);
  row.set("password_hash", hash);
  await row.save();
  return { ok: true };
}

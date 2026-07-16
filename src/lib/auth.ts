import "server-only";
import bcrypt from "bcryptjs";
import { cache } from "react";
import { redirect } from "next/navigation";
import { dbGet, dbRun } from "@/lib/db";
import { createSession, deleteSession, getSession } from "@/lib/session";

type UserRow = {
  id: number;
  username: string;
  password_hash: string;
  name: string;
};

export async function findUserByUsername(username: string): Promise<UserRow | undefined> {
  return dbGet<UserRow>("SELECT * FROM users WHERE username = ?", [username]);
}

export async function attemptLogin(
  username: string,
  password: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await findUserByUsername(username.trim());
  if (!user) {
    return { ok: false, error: "Invalid username or password." };
  }
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    return { ok: false, error: "Invalid username or password." };
  }
  await createSession({ userId: user.id, username: user.username, name: user.name });
  return { ok: true };
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

export async function changePassword(
  userId: number,
  currentPassword: string,
  newPassword: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await dbGet<UserRow>("SELECT * FROM users WHERE id = ?", [userId]);
  if (!user) {
    return { ok: false, error: "User not found." };
  }
  const valid = await bcrypt.compare(currentPassword, user.password_hash);
  if (!valid) {
    return { ok: false, error: "Current password is incorrect." };
  }
  if (newPassword.length < 6) {
    return { ok: false, error: "New password must be at least 6 characters." };
  }
  const hash = await bcrypt.hash(newPassword, 10);
  await dbRun("UPDATE users SET password_hash = ? WHERE id = ?", [hash, userId]);
  return { ok: true };
}

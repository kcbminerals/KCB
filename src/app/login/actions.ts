"use server";

import { redirect } from "next/navigation";
import { attemptLogin } from "@/lib/auth";

export type LoginState = { error?: string } | undefined;

export async function loginAction(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const username = String(formData.get("username") ?? "");
  const password = String(formData.get("password") ?? "");
  const redirectTo = String(formData.get("redirectTo") ?? "/");

  if (!username || !password) {
    return { error: "Please enter a username and password." };
  }

  const result = await attemptLogin(username, password);
  if (!result.ok) {
    return { error: result.error };
  }

  redirect(redirectTo.startsWith("/") ? redirectTo : "/");
}

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
  const requestedRedirect = String(formData.get("redirectTo") ?? "/");

  if (!username || !password) {
    return { error: "Please enter a username and password." };
  }

  const result = await attemptLogin(username, password);
  if (!result.ok) {
    return { error: result.error };
  }

  // Staff land on their entry page by default rather than the admin
  // dashboard; an explicit "next" (e.g. a bookmarked link) is still honored
  // and proxy will bounce staff onward if it's a page they can't reach.
  const fallbackHome = result.role === "admin" ? "/" : "/deliveries";
  const redirectTo = requestedRedirect.startsWith("/") ? requestedRedirect : fallbackHome;
  redirect(redirectTo === "/" ? fallbackHome : redirectTo);
}

"use server";

import { verifySession, changePassword } from "@/lib/auth";

export type ChangePasswordState =
  | { error?: string; success?: boolean }
  | undefined;

export async function changePasswordAction(
  _prevState: ChangePasswordState,
  formData: FormData
): Promise<ChangePasswordState> {
  const session = await verifySession();
  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (newPassword !== confirmPassword) {
    return { error: "New password and confirmation do not match." };
  }

  const result = await changePassword(session.userId, currentPassword, newPassword);
  if (!result.ok) {
    return { error: result.error };
  }
  return { success: true };
}

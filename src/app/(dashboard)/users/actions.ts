"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createUser, setUserActive, usernameExists } from "@/lib/users";
import { USER_ROLES } from "@/lib/types";

const userSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, "Username must be at least 3 characters")
    .regex(/^[a-zA-Z0-9._-]+$/, "Only letters, numbers, dots, dashes and underscores"),
  name: z.string().trim().min(1, "Name is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(USER_ROLES),
});

export type UserFormState = { error?: string } | undefined;

export async function createUserAction(
  _prevState: UserFormState,
  formData: FormData
): Promise<UserFormState> {
  await requireAdmin();
  const parsed = userSchema.safeParse({
    username: formData.get("username"),
    name: formData.get("name"),
    password: formData.get("password"),
    role: formData.get("role"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  if (await usernameExists(parsed.data.username)) {
    return { error: "That username is already taken." };
  }
  await createUser(parsed.data);
  revalidatePath("/users");
  return undefined;
}

export async function setUserActiveAction(id: number, active: boolean) {
  const session = await requireAdmin();
  if (id === session.userId) {
    // Refuse to let an admin lock themselves out.
    return;
  }
  await setUserActive(id, active);
  revalidatePath("/users");
}

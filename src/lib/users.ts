import "server-only";
import bcrypt from "bcryptjs";
import { getWorksheet, nextId } from "@/lib/sheets";
import { nowIstTimestamp } from "@/lib/format";
import type { User, UserRole } from "@/lib/types";

type SheetRow = {
  get(key: string): unknown;
  set(key: string, value: unknown): void;
  save(): Promise<void>;
};

function rowToUser(row: SheetRow): User {
  const role = row.get("role");
  const active = row.get("active");
  return {
    id: Number(row.get("id")),
    username: String(row.get("username")),
    name: String(row.get("name")),
    role: role === "staff" ? "staff" : "admin",
    active: active === "" || active === undefined || active === null ? 1 : Number(active),
    created_at: String(row.get("created_at") ?? ""),
  };
}

export async function listUsers(): Promise<User[]> {
  const sheet = await getWorksheet("Users");
  const rows = await sheet.getRows();
  return rows.map(rowToUser).sort((a, b) => a.username.localeCompare(b.username));
}

export async function usernameExists(username: string): Promise<boolean> {
  const sheet = await getWorksheet("Users");
  const rows = await sheet.getRows();
  return rows.some((r) => String(r.get("username")).toLowerCase() === username.toLowerCase());
}

export async function createUser(data: {
  username: string;
  password: string;
  name: string;
  role: UserRole;
}): Promise<number> {
  const sheet = await getWorksheet("Users");
  const rows = await sheet.getRows();
  const id = nextId(rows);
  const hash = await bcrypt.hash(data.password, 10);
  await sheet.addRow({
    id,
    username: data.username,
    password_hash: hash,
    name: data.name,
    role: data.role,
    active: 1,
    created_at: nowIstTimestamp(),
  });
  return id;
}

export async function setUserActive(id: number, active: boolean): Promise<void> {
  const sheet = await getWorksheet("Users");
  const rows = await sheet.getRows();
  const row = rows.find((r) => Number(r.get("id")) === id);
  if (!row) return;
  row.set("active", active ? 1 : 0);
  await row.save();
}

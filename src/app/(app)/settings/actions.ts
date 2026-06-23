"use server";
import { db } from "@/lib/db";
import { encrypt } from "@/lib/crypto";
import { testConnection } from "@/lib/checkoutchamp";
import { nowBkk } from "@/lib/bkk";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

function accountCredsFromRow(row: { apiUrl: string; loginIdEncrypted: string; passwordEncrypted: string }) {
  return { apiUrl: row.apiUrl, loginId: row.loginIdEncrypted, password: row.passwordEncrypted };
}

export async function saveAccount(form: FormData) {
  const name = String(form.get("name") ?? "").trim();
  const apiUrl = String(form.get("apiUrl") ?? "").trim();
  const loginIdRaw = String(form.get("loginId") ?? "").trim();
  const passwordRaw = String(form.get("password") ?? "").trim();

  const existing = await db.account.findFirst();

  if (existing) {
    const data: { name: string; apiUrl: string; loginIdEncrypted?: string; passwordEncrypted?: string } = { name, apiUrl };
    if (loginIdRaw) data.loginIdEncrypted = encrypt(loginIdRaw);
    if (passwordRaw) data.passwordEncrypted = encrypt(passwordRaw);
    await db.account.update({ where: { id: existing.id }, data });
  } else {
    if (!loginIdRaw || !passwordRaw) throw new Error("Login ID and password are required for first save");
    await db.account.create({
      data: {
        name,
        apiUrl,
        loginIdEncrypted: encrypt(loginIdRaw),
        passwordEncrypted: encrypt(passwordRaw),
        createdAt: nowBkk(),
      },
    });
  }

  revalidatePath("/settings");
  redirect("/settings?saved=1");
}

export async function testCcConnection(): Promise<{ ok: boolean; message: string }> {
  const account = await db.account.findFirst();
  if (!account) return { ok: false, message: "No account saved yet" };
  return await testConnection(accountCredsFromRow(account));
}

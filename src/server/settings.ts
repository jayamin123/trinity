import { db } from "@/lib/db";
import { encrypt, decrypt } from "@/lib/crypto";
import { testConnection } from "@/lib/checkoutchamp";

// CheckoutChamp account settings. encrypt/decrypt need ENCRYPTION_KEY, which
// isn't set on flows2 — save/test throw there and the route returns 503 cleanly.

export async function getAccount() {
  const a = await db.account.findFirst();
  if (!a) return null;
  return { id: a.id, name: a.name, apiUrl: a.apiUrl, hasCreds: !!a.loginIdEncrypted };
}

export async function saveAccount(input: { name: string; apiUrl: string; loginId: string; password: string }) {
  const existing = await db.account.findFirst();
  const data = {
    name: input.name,
    apiUrl: input.apiUrl,
    loginIdEncrypted: encrypt(input.loginId),
    passwordEncrypted: encrypt(input.password),
  };
  if (existing) await db.account.update({ where: { id: existing.id }, data });
  else await db.account.create({ data });
  return { ok: true };
}

export async function testAccount() {
  const a = await db.account.findFirst();
  if (!a) throw new Error("no CheckoutChamp account configured");
  return testConnection({ apiUrl: a.apiUrl, loginId: decrypt(a.loginIdEncrypted), password: decrypt(a.passwordEncrypted) });
}

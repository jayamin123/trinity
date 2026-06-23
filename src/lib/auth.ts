import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { db } from "./db";

const COOKIE = "trinity_session";

function getSecret(): string {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error("JWT_SECRET is not set");
  return s;
}

export async function signIn(email: string, password: string) {
  const user = await db.adminUser.findUnique({ where: { email } });
  if (!user) return null;
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return null;

  const token = jwt.sign({ userId: user.id, email: user.email }, getSecret(), { expiresIn: "24h" });
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 86400,
    path: "/",
  });
  return user;
}

export async function signOut() {
  (await cookies()).delete(COOKIE);
}

export async function getCurrentUser() {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const payload = jwt.verify(token, getSecret()) as { userId: string; email: string };
    return await db.adminUser.findUnique({ where: { id: payload.userId } });
  } catch {
    return null;
  }
}

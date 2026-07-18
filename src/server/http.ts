import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

// Thin helpers so route handlers stay one-liners: guard → call service → json.

export function ok(data: unknown) {
  return NextResponse.json(data);
}

export function bad(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}

/** Returns a 401 response if not signed in, else null. Usage:
 *  const g = await guard(); if (g) return g; */
export async function guard(): Promise<NextResponse | null> {
  const user = await getCurrentUser();
  return user ? null : bad("unauthorized", 401);
}

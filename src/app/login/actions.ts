"use server";
import { signIn } from "@/lib/auth";
import { redirect } from "next/navigation";

export async function login(form: FormData) {
  const email = String(form.get("email") ?? "");
  const password = String(form.get("password") ?? "");

  const user = await signIn(email, password);
  if (!user) {
    redirect("/login?error=" + encodeURIComponent("Invalid email or password"));
  }
  redirect("/");
}

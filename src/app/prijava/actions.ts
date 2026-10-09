"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type LoginState = { error?: string; email?: string };

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "");

  if (!email || !password) return { error: "Upiši email i šifru.", email };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: "Pogrešan email ili šifra.", email };

  redirect(safeNext(next));
}

/** Samo interni put. Odbija "//host" i "/\\host" (browser ih tretira kao drugi sajt). */
function safeNext(next: string) {
  return /^\/(?![/\\])/.test(next) ? next : "/";
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/prijava");
}

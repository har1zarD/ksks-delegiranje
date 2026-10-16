"use server";

import { refresh } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { generateToken } from "@/lib/mcp/token";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type PasswordState = { error?: string; ok?: number };

export async function changePassword(prev: PasswordState, formData: FormData): Promise<PasswordState> {
  await getCurrentUser();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (password.length < 8) return { error: "Šifra mora imati najmanje 8 znakova." };
  if (password !== confirm) return { error: "Šifre se ne poklapaju." };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return { error: error.code === "same_password" ? "Nova šifra mora biti drugačija od stare." : "Šifra nije promijenjena. Pokušaj ponovo." };
  }
  return { ok: (prev.ok ?? 0) + 1 };
}

export type TokenState = { error?: string; token?: string };

export async function createToken(_prev: TokenState, formData: FormData): Promise<TokenState> {
  const user = await getCurrentUser();
  const name = String(formData.get("name") ?? "").trim().slice(0, 60) || "MCP";
  const { token, hash, prefix } = generateToken();

  // mcp_tokens nema insert politiku: token pravi server, korisnik samo čita i opoziva svoje
  const { error } = await createAdminClient()
    .from("mcp_tokens")
    .insert({ profile_id: user.id, name, token_hash: hash, prefix });
  if (error) return { error: "Token nije kreiran. Pokušaj ponovo." };

  // Lista tokena nije keširana (lična je i rijetko se otvara), pa je dovoljan refresh
  refresh();
  return { token };
}

export async function revokeToken(formData: FormData) {
  const user = await getCurrentUser();
  const supabase = await createClient();
  await supabase
    .from("mcp_tokens")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", String(formData.get("id") ?? ""))
    .eq("profile_id", user.id)
    .is("revoked_at", null);
  refresh();
}

/** Postavke → Obavještenja: nominacija kola samo ako je osoba delegirana na nekoj od utakmica (vidi publish.ts) */
export async function setOnlyAssignedEmails(value: boolean): Promise<{ error?: string }> {
  const user = await getCurrentUser();
  // profiles nema update politiku za korisnike: servisni klijent, strogo na vlastiti red
  const { error } = await createAdminClient().from("profiles").update({ only_assigned_emails: value }).eq("id", user.id);
  return error ? { error: "Postavka nije sačuvana. Pokušaj ponovo." } : {};
}

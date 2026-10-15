"use server";

import { redirect } from "next/navigation";
import { homeFor } from "@/lib/auth";
import { sendEmail, siteUrl } from "@/lib/email";
import { passwordResetEmail } from "@/lib/emails";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type LoginState = { error?: string; email?: string };

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "");

  if (!email || !password) return { error: "Upiši email i šifru.", email };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: "Pogrešan email ili šifra.", email };

  if (isSafeNext(next)) redirect(next);

  // Odmah na početnu stranicu uloge: "/" bi samo preusmjerio dalje, a dotle je ekran prazan
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).maybeSingle();
  redirect(profile ? homeFor(profile.role) : "/");
}

/** Samo interni put. Odbija "//host" i "/\\host" (browser ih tretira kao drugi sajt). */
function isSafeNext(next: string) {
  return /^\/(?![/\\])/.test(next);
}

export type ResetRequestState = { error?: string; sent?: boolean; email?: string };

/** Šalje link za novu šifru. Odgovor je isti postoji li nalog ili ne (ne otkriva ko ima nalog). */
export async function requestPasswordReset(_prev: ResetRequestState, formData: FormData): Promise<ResetRequestState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "Upiši ispravan email.", email };

  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("id, full_name, active").eq("email", email).maybeSingle();
  if (!profile?.active) return { sent: true, email };

  // Najviše jedan email u minuti po adresi (zaštita od zatrpavanja sandučeta)
  const { count } = await admin
    .from("email_log")
    .select("id", { count: "exact", head: true })
    .eq("kind", "password_reset")
    .eq("to_email", email)
    .gte("sent_at", new Date(Date.now() - 60_000).toISOString());
  if (count) return { sent: true, email };

  // Link pravi servisni klijent (ne šalje email); šaljemo ga svojim SMTP-om kao i ostale emailove
  const { data, error } = await admin.auth.admin.generateLink({ type: "recovery", email });
  if (error) return { error: "Link nije poslan. Pokušaj ponovo.", email };

  const link = siteUrl(`/prijava/nova-sifra?token=${encodeURIComponent(data.properties.hashed_token)}`);
  const sent = await sendEmail({ to: email, kind: "password_reset", profileId: profile.id, ...passwordResetEmail(profile.full_name, link) });
  if (!sent) return { error: "Email nije poslan. Pokušaj ponovo ili se javi savezu.", email };
  return { sent: true, email };
}

export type ResetState = { error?: string; expired?: boolean };

/** Token iz emaila se troši tek ovdje (ne pri otvaranju linka), pa ga skeneri linkova u emailu ne potroše */
export async function resetPassword(_prev: ResetState, formData: FormData): Promise<ResetState> {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (password.length < 8) return { error: "Šifra mora imati najmanje 8 znakova." };
  if (password !== confirm) return { error: "Šifre se ne poklapaju." };

  const supabase = await createClient();
  const { error: verifyError } = await supabase.auth.verifyOtp({ type: "recovery", token_hash: token });
  if (verifyError) return { error: "Link je istekao ili je već iskorišten.", expired: true };

  const { error } = await supabase.auth.updateUser({ password });
  if (error && error.code !== "same_password") return { error: "Šifra nije promijenjena. Pokušaj ponovo." };

  redirect("/");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/prijava");
}

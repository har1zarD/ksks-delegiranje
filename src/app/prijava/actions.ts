"use server";

import { redirect } from "next/navigation";
import { homeFor } from "@/lib/auth";
import { sendEmail, siteUrl } from "@/lib/email";
import { passwordResetEmail } from "@/lib/emails";
import { rateLimit, requestIp, TOO_MANY } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type LoginState = { error?: string; email?: string };

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "");

  if (!email || !password) return { error: "Upiši email i šifru.", email };

  // Pogađanje šifre: najviše 20 pokušaja s jedne IP adrese u 10 minuta i 10 na jedan nalog u 15 minuta
  const ip = await requestIp();
  const allowed = (await rateLimit(`login:ip:${ip}`, 20, 600)) && (await rateLimit(`login:email:${email}`, 10, 900));
  if (!allowed) return { error: TOO_MANY, email };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: "Pogrešan email ili šifra.", email };

  const safeNext = safePath(next);
  if (safeNext) redirect(safeNext);

  // Odmah na početnu stranicu uloge: "/" bi samo preusmjerio dalje, a dotle je ekran prazan
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).maybeSingle();
  redirect(profile ? homeFor(profile.role) : "/");
}

/**
 * Samo interni put (null inače). Browser iz adrese briše tab i novi red, pa "/\t/host" postaje "//host":
 * adresa se zato parsira kao u browseru i prihvata samo ako ostaje na istom sajtu.
 */
function safePath(next: string) {
  if (!next.startsWith("/")) return null;
  try {
    const url = new URL(next, "http://ksks.local");
    return url.host === "ksks.local" ? url.pathname + url.search + url.hash : null;
  } catch {
    return null;
  }
}

export type ResetRequestState = { error?: string; sent?: boolean; email?: string };

/** Šalje link za novu šifru. Odgovor je isti postoji li nalog ili ne (ne otkriva ko ima nalog). */
export async function requestPasswordReset(_prev: ResetRequestState, formData: FormData): Promise<ResetRequestState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "Upiši ispravan email.", email };
  if (!(await rateLimit(`reset:ip:${await requestIp()}`, 5, 900))) return { error: TOO_MANY, email };

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
  if (!(await rateLimit(`reset-verify:ip:${await requestIp()}`, 10, 900))) return { error: TOO_MANY };

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

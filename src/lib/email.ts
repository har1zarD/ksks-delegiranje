import nodemailer, { type Transporter } from "nodemailer";
import { createAdminClient } from "@/lib/supabase/admin";

// Slanje emaila preko Gmaila: GMAIL_USER + GMAIL_APP_PASSWORD (Google nalog → Sigurnost → potvrda u 2 koraka → App passwords).
// EMAIL_FROM = adresa pošiljaoca ako nije isti Gmail nalog.
// Test način: EMAIL_ONLY_TO="a@x.ba,b@y.ba" — email ide SAMO na te adrese, ostali primaoci se preskaču (bilježe se u email_log).
/**
 * PREKIDAČ: true = nijedan email ne ide nikome (upisuje se u email_log kao preskočen), za testiranje.
 * Uz to EMAIL_ONLY_TO (ako je postavljen) ograničava primaoce na navedene adrese.
 */
const EMAILS_OFF = false;

let transport: Transporter | null = null;

function getTransport() {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) return null;
  transport ??= nodemailer.createTransport({
    service: "gmail",
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
  });
  return transport;
}

/** Adresa pošiljaoca */
export function senderAddress() {
  return process.env.EMAIL_FROM ?? process.env.GMAIL_USER ?? "ksksdelegiranje@gmail.com";
}

/** Test način: dozvoljene adrese (null = šalje se svima) */
function allowList() {
  const v = process.env.EMAIL_ONLY_TO?.trim();
  return v ? new Set(v.split(/[,\s]+/).filter(Boolean).map((e) => e.toLowerCase())) : null;
}

export type Email = {
  to: string;
  /** Skriveni primaoci (nominacija kola: svi sa liste u jednom emailu) */
  bcc?: string[];
  subject: string;
  text: string;
  html?: string;
  kind: "nomination" | "nomination_list" | "cancellation" | "reminder" | "pending_reminder" | "declined" | "password_reset";
  profileId?: string;
  assignmentId?: string;
};

/** Šalje email i upisuje ga u email_log. Vraća true ako je poslan. */
export async function sendEmail(email: Email): Promise<boolean> {
  if (EMAILS_OFF) {
    await logEmail(email, null, "Slanje je isključeno u kodu (EMAILS_OFF u src/lib/email.ts)");
    return false;
  }

  const t = getTransport();
  let providerId: string | null = null;
  let error: string | null = null;

  // Test način: samo dozvoljene adrese (glavni primalac je pošiljalac kod nominacije kola, pa i njega propuštamo)
  const allow = allowList();
  if (allow) {
    const bcc = email.bcc?.filter((e) => allow.has(e.toLowerCase()));
    const toAllowed = allow.has(email.to.toLowerCase()) || (email.bcc !== undefined && email.to.toLowerCase() === senderAddress().toLowerCase());
    if (!toAllowed || (email.bcc && bcc!.length === 0)) {
      await logEmail(email, null, "Test način: adresa nije na listi EMAIL_ONLY_TO");
      return false;
    }
    email = { ...email, bcc };
  }

  if (!t) {
    error = "Email nije podešen (GMAIL_USER + GMAIL_APP_PASSWORD)";
  } else {
    try {
      const info = await t.sendMail({
        from: { name: "KSKS Delegiranje", address: senderAddress() },
        to: email.to,
        bcc: email.bcc,
        subject: email.subject,
        text: email.text,
        html: email.html,
      });
      providerId = info.messageId;
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    }
  }

  await logEmail(email, providerId, error);
  return error === null;
}

// email_log nema insert politiku za korisnike; piše servisni klijent
async function logEmail(email: Email, providerId: string | null, error: string | null) {
  await createAdminClient().from("email_log").insert({
    kind: email.kind,
    to_email: email.bcc?.length ? `${email.to} (+${email.bcc.length} skriveno)` : email.to,
    profile_id: email.profileId ?? null,
    assignment_id: email.assignmentId ?? null,
    provider_id: providerId,
    error,
  });
}

export function siteUrl(path: string) {
  return `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}${path}`;
}

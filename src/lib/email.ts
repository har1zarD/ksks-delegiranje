import nodemailer, { type Transporter } from "nodemailer";
import { createAdminClient } from "@/lib/supabase/admin";

// Gmail SMTP s app šifrom (Google nalog → Sigurnost → App passwords). Limit ~500 mailova dnevno.
let transport: Transporter | null = null;

function getTransport() {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) return null;
  transport ??= nodemailer.createTransport({
    service: "gmail",
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
  });
  return transport;
}

export type Email = {
  to: string;
  /** Skriveni primaoci (nominacija kola: svi sa liste u jednom emailu) */
  bcc?: string[];
  subject: string;
  text: string;
  html?: string;
  kind: "nomination" | "nomination_list" | "cancellation" | "reminder" | "pending_reminder" | "declined";
  profileId?: string;
  assignmentId?: string;
};

/** Šalje email i upisuje ga u email_log. Vraća true ako je poslan. */
export async function sendEmail(email: Email): Promise<boolean> {
  const t = getTransport();
  let providerId: string | null = null;
  let error: string | null = null;

  if (!t) {
    error = "Email nije podešen (GMAIL_USER / GMAIL_APP_PASSWORD)";
  } else {
    try {
      const info = await t.sendMail({
        from: { name: "KSKS Delegiranje", address: process.env.GMAIL_USER! },
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

  // email_log nema insert politiku za korisnike; piše servisni klijent
  await createAdminClient().from("email_log").insert({
    kind: email.kind,
    to_email: email.bcc?.length ? `${email.to} (+${email.bcc.length} skriveno)` : email.to,
    profile_id: email.profileId ?? null,
    assignment_id: email.assignmentId ?? null,
    provider_id: providerId,
    error,
  });

  return error === null;
}

export function siteUrl(path: string) {
  return `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}${path}`;
}

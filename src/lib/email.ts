import nodemailer, { type Transporter } from "nodemailer";
import { createAdminClient } from "@/lib/supabase/admin";

// Slanje emaila preko Gmail SMTP-a (od 2026-10-21): GMAIL_USER + GMAIL_APP_PASSWORD (app šifra, potvrda u 2 koraka).
// Gmail limiti: ~500 primalaca dnevno i do 100 po poruci, pa se veliki bcc šalje u dijelovima (BCC_CHUNK).
// Brevo put (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS) je ostavljen zakomentarisan ispod ako ikad zatreba.
// Kancelarija saveza (NEVER_EMAIL) ne prima NIKAKVE emailove (od 2026-10-28), ni kopije ni kao primalac.
// Nalog delegiranja (pošiljalac) prima SAMO odbijanja i odsustva (DELEGATION_INBOX u emails.ts); sve ostalo ima u "Poslano".
// Test način: EMAIL_ONLY_TO="a@x.ba,b@y.ba" — email ide SAMO na te adrese, ostali primaoci se preskaču (bilježe se u email_log).
/**
 * PREKIDAČ: true = nijedan email ne ide nikome (upisuje se u email_log kao preskočen), za testiranje.
 * Uz to EMAIL_ONLY_TO (ako je postavljen) ograničava primaoce na navedene adrese.
 */
const EMAILS_OFF = false;

let transport: Transporter | null = null;

function getTransport() {
  const { GMAIL_USER, GMAIL_APP_PASSWORD } = process.env;
  if (!GMAIL_USER || !GMAIL_APP_PASSWORD) return null;
  transport ??= nodemailer.createTransport({ service: "gmail", auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD } });
  return transport;
  // Brevo (isključeno, vidi zaglavlje):
  // const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  // if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null;
  // const port = Number(SMTP_PORT) || 587;
  // transport ??= nodemailer.createTransport({ host: SMTP_HOST, port, secure: port === 465, auth: { user: SMTP_USER, pass: SMTP_PASS } });
  // return transport;
}

/** Najviše skrivenih primalaca u jednoj poruci (Gmail prima do 100 po poruci, uključujući "to") */
const BCC_CHUNK = 90;

/** Adresa pošiljaoca */
export function senderAddress() {
  return process.env.GMAIL_USER ?? "ksksdelegiranje@gmail.com";
}

/** Test način: dozvoljene adrese (null = šalje se svima) */
function allowList() {
  const v = process.env.EMAIL_ONLY_TO?.trim();
  return v ? new Set(v.split(/[,\s]+/).filter(Boolean).map((e) => e.toLowerCase())) : null;
}

/**
 * Adrese kojima aplikacija nikad ne šalje (kancelarija saveza, od 2026-10-28: ne želi nikakve emailove).
 * Izbacuju se iz "to" i bcc svakog emaila; ako ne ostane niko, email se samo upiše u log kao preskočen.
 */
export const NEVER_EMAIL = ["ksksarajevo@bih.net.ba"];

/** Uklanja blokirane adrese; null = nema kome poslati */
function withoutBlocked(email: Email): Email | null {
  const blocked = new Set(NEVER_EMAIL.map((e) => e.toLowerCase()));
  const bcc = email.bcc?.filter((e) => !blocked.has(e.toLowerCase()));
  if (!blocked.has(email.to.toLowerCase())) return { ...email, bcc };
  // Glavni primalac blokiran: ostali iz bcc dobijaju masovni mail (to = pošiljalac, šalje se bez "to")
  return bcc?.length ? { ...email, to: senderAddress(), bcc } : null;
}

export type Email = {
  to: string;
  /** Skriveni primaoci (nominacija kola: svi sa liste u jednom emailu) */
  bcc?: string[];
  subject: string;
  text: string;
  html?: string;
  kind: "nomination" | "nomination_list" | "pending_reminder" | "cancellation" | "accepted" | "declined" | "password_reset" | "schedule_clubs" | "match_changed" | "absence";
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
  /** Djelimično odbijanje: email je poslan, ali ne svima (upisuje se u log kao napomena) */
  let note: string | null = null;

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
  const unblocked = withoutBlocked(email);
  if (!unblocked) {
    await logEmail(email, null, "Adresa ne prima emailove (NEVER_EMAIL u src/lib/email.ts)");
    return false;
  }
  email = unblocked;

  if (!t) {
    error = "Email nije podešen (GMAIL_USER + GMAIL_APP_PASSWORD)";
  } else {
    // Veliki bcc ide u više poruka istog sadržaja; poslano je samo ako su prošli svi dijelovi
    const chunks = email.bcc?.length ? Array.from({ length: Math.ceil(email.bcc.length / BCC_CHUNK) }, (_, i) => email.bcc!.slice(i * BCC_CHUNK, (i + 1) * BCC_CHUNK)) : [undefined];
    // Masovni mail (to = pošiljalac, svi u bcc) ide bez "to", da ga sanduče delegiranja ne primi u Inbox
    const to = email.bcc?.length && email.to.toLowerCase() === senderAddress().toLowerCase() ? undefined : email.to;
    const rejected: string[] = [];
    let accepted = 0;
    try {
      for (const bcc of chunks) {
        const info = await t.sendMail({
          from: { name: "KSKS Nominacije", address: senderAddress() },
          to,
          bcc,
          subject: email.subject,
          text: email.text,
          html: email.html,
        });
        providerId ??= info.messageId;
        rejected.push(...(info.rejected ?? []).map(String));
        accepted += (info.accepted ?? []).length;
      }
      // Adrese koje je server odbio već pri slanju (ostalima je poslano); kasnije odbijene stižu kao bounce u sanduče pošiljaoca
      if (rejected.length) note = `Server odbio ${rejected.length} od ${rejected.length + accepted} adresa: ${rejected.join(", ")}`;
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    }
  }

  await logEmail(email, providerId, error ?? note);
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

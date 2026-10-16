import nodemailer, { type Transporter } from "nodemailer";
import { createAdminClient } from "@/lib/supabase/admin";

// Slanje emaila preko SMTP servisa (Brevo): SMTP_HOST, SMTP_PORT (587 ili 465), SMTP_USER, SMTP_PASS; EMAIL_FROM = verifikovani pošiljalac.
// Gmail put (GMAIL_USER + GMAIL_APP_PASSWORD) je isključen (2026-10-16): nov Gmail nalog uz masovni bcc tiho ne isporučuje
// i ima dnevni limit od 500 adresa. Kod je ostavljen zakomentarisan ispod ako ikad zatreba.
// Kancelarija saveza i nalog delegiranja (ALWAYS_COPY) dobijaju skrivenu kopiju svakog emaila osim linka za novu šifru i odbijanja.
// Test način: EMAIL_ONLY_TO="a@x.ba,b@y.ba" — email ide SAMO na te adrese, ostali primaoci se preskaču (bilježe se u email_log).
/**
 * PREKIDAČ: true = nijedan email ne ide nikome (upisuje se u email_log kao preskočen), za testiranje.
 * Uz to EMAIL_ONLY_TO (ako je postavljen) ograničava primaoce na navedene adrese.
 */
const EMAILS_OFF = false;

let transport: Transporter | null = null;

function getTransport() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null;
  const port = Number(SMTP_PORT) || 587;
  transport ??= nodemailer.createTransport({ host: SMTP_HOST, port, secure: port === 465, auth: { user: SMTP_USER, pass: SMTP_PASS } });
  return transport;
  // Gmail (isključeno, vidi zaglavlje):
  // const { GMAIL_USER, GMAIL_APP_PASSWORD } = process.env;
  // if (!GMAIL_USER || !GMAIL_APP_PASSWORD) return null;
  // transport ??= nodemailer.createTransport({ service: "gmail", auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD } });
  // return transport;
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

/**
 * Skrivena kopija SVAKOG emaila: kancelarija saveza i nalog delegiranja, da savez ima evidenciju svega što aplikacija
 * pošalje (preko SMTP servisa sanduče pošiljaoca inače ne vidi poslano).
 */
const ALWAYS_COPY = ["ksksarajevo@bih.net.ba", "ksksdelegiranje@gmail.com"];
/** Bez kopije: link za novu šifru (sigurnost) i odbijanje, koje ionako ide svim adminima pa i ovim adresama */
const NO_OFFICE_COPY: Email["kind"][] = ["password_reset", "declined"];

/** Dodaje adrese saveza u skrivene primaoce, osim onih koje su već primaoci ili koje test način ne propušta */
function withOfficeCopy(email: Email, allow: Set<string> | null): Email {
  if (NO_OFFICE_COPY.includes(email.kind)) return email;
  const have = new Set([email.to, ...(email.bcc ?? [])].map((e) => e.toLowerCase()));
  const extra = ALWAYS_COPY.filter((a) => !have.has(a.toLowerCase()) && (!allow || allow.has(a.toLowerCase())));
  return extra.length ? { ...email, bcc: [...(email.bcc ?? []), ...extra] } : email;
}

export type Email = {
  to: string;
  /** Skriveni primaoci (nominacija kola: svi sa liste u jednom emailu) */
  bcc?: string[];
  subject: string;
  text: string;
  html?: string;
  kind: "nomination" | "nomination_list" | "cancellation" | "accepted" | "declined" | "password_reset" | "schedule_clubs" | "match_changed";
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
  email = withOfficeCopy(email, allow);

  if (!t) {
    error = "Email nije podešen (SMTP_HOST + SMTP_USER + SMTP_PASS)";
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
      // Adrese koje je server odbio već pri slanju (ostalima je poslano); kasnije odbijene stižu kao bounce u sanduče pošiljaoca
      const rejected = (info.rejected ?? []).map(String);
      if (rejected.length) note = `Server odbio ${rejected.length} od ${rejected.length + (info.accepted ?? []).length} adresa: ${rejected.join(", ")}`;
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

import { absenceParts, formatDayMonth, formatTime, formatWeekday, matchNo, positionName, type Position } from "@/lib/format";
import { sendEmail, siteUrl } from "@/lib/email";
import { absenceEmail, withdrawnEmail } from "@/lib/nomination-email";
import { createAdminClient } from "@/lib/supabase/admin";

type MatchInfo = {
  number?: number;
  digital_scoresheet?: boolean;
  starts_at: string;
  home: { name: string } | null;
  away: { name: string } | null;
  hall: { name: string } | null;
  competition: { name: string } | null;
};

function describe(m: MatchInfo) {
  const when = `${formatWeekday(m.starts_at)} ${formatDayMonth(m.starts_at)} u ${formatTime(m.starts_at)}`;
  return [
    matchNo(m.number),
    `${m.home?.name} – ${m.away?.name}`,
    m.competition?.name,
    when,
    m.hall?.name ?? "Dvorana će biti naknadno određena",
  ]
    .filter(Boolean)
    .join("\n");
}

/** Otkazana nominacija (uklonjena ili zamijenjena osoba), u obliku dokumenta kao nominacija */
export function cancellationEmail(
  name: string,
  position: Position,
  match: Parameters<typeof withdrawnEmail>[1],
  reason: "cancelled" | "replaced" = "cancelled",
) {
  return withdrawnEmail({ name, position }, match, reason, siteUrl("/nominacije"), siteUrl("/icons/icon-192.png"));
}

export function declinedEmail(person: string, position: Position, reason: string, match: MatchInfo & { id: string }) {
  return {
    subject: `Odbijena nominacija: ${match.home?.name} – ${match.away?.name}, ${formatDayMonth(match.starts_at)}`,
    text: `${person} je odbio nominaciju (${positionName(position, match.digital_scoresheet).toLowerCase()}):

${describe(match)}

Razlog: ${reason}

Delegiraj zamjenu:
${siteUrl(`/admin/utakmice/${match.id}`)}`,
  };
}

export function passwordResetEmail(name: string, link: string) {
  return {
    subject: "Nova šifra za KSKS Nominacije",
    text: `Zdravo ${name},

zatražena je nova šifra za tvoj nalog. Otvori link i upiši novu šifru:
${link}

Link važi kratko vrijeme i može se iskoristiti samo jednom. Ako nisi ti tražio novu šifru, zanemari ovaj email; stara šifra i dalje važi.

Košarkaški savez Kantona Sarajevo`,
  };
}

/** Ko dobija obavijest o odbijenoj nominaciji i najavljenom odsustvu: nalog delegiranja i Alden Košarić (delegiranje). Ništa drugo im ne ide. */
export const DELEGATION_INBOX = ["ksksdelegiranje@gmail.com", "alden.kosaric14@gmail.com"];

/** Obavijest savezu da je službeno lice najavilo odsustvo (poziva se nakon upisa, kroz after()) */
export async function notifyAbsence(absence: { profileId: string; startsAt: string; endsAt: string; reason: string | null }) {
  const { data: p } = await createAdminClient()
    .from("profiles")
    .select("full_name, is_referee, is_table, is_commissioner")
    .eq("id", absence.profileId)
    .single();
  if (!p) return;
  const roles = [p.is_referee && "Sudija", p.is_table && "Zapisnički sto", p.is_commissioner && "Komesar"].filter((r): r is string => Boolean(r));
  const { allDay, ...period } = absenceParts(absence.startsAt, absence.endsAt);
  // Cijeli dani: broj dana; s vremenom se trajanje vidi iz perioda
  const days = allDay ? Math.round((Date.parse(absence.endsAt) - Date.parse(absence.startsAt)) / 86_400_000) : null;
  const email = absenceEmail(
    { name: p.full_name, roles },
    { ...period, days, reason: absence.reason },
    siteUrl("/admin/ljudi?prikaz=odsustva"),
    siteUrl("/icons/icon-192.png"),
  );
  const [to, ...bcc] = DELEGATION_INBOX;
  await sendEmail({ to, bcc, kind: "absence", profileId: absence.profileId, ...email });
}

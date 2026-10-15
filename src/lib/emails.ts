import { formatDayMonth, formatTime, formatWeekday, matchNo, positionName, type Position } from "@/lib/format";
import { siteUrl } from "@/lib/email";
import { withdrawnEmail } from "@/lib/nomination-email";

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

/** Savezu: osoba je prihvatila nominaciju (potvrda na adresu pošiljaoca) */
export function acceptedEmail(person: string, position: Position, match: MatchInfo & { id: string }) {
  return {
    subject: `Prihvaćena nominacija: ${match.home?.name} – ${match.away?.name}, ${formatDayMonth(match.starts_at)}`,
    text: `${person} je prihvatio/la nominaciju (${positionName(position, match.digital_scoresheet).toLowerCase()}):

${describe(match)}

Utakmica i delegiranje:
${siteUrl(`/admin/utakmice/${match.id}`)}`,
  };
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

export function reminderEmail(name: string, position: Position, match: MatchInfo) {
  return {
    subject: `Podsjetnik: ${match.home?.name} – ${match.away?.name}, ${formatDayMonth(match.starts_at)} u ${formatTime(match.starts_at)}`,
    text: `Zdravo ${name},

podsjetnik za utakmicu na kojoj si ${positionName(position, match.digital_scoresheet).toLowerCase()}:

${describe(match)}

Detalji i ekipa:
${siteUrl("/utakmice")}

Košarkaški savez Kantona Sarajevo`,
  };
}

export function pendingReminderEmail(name: string, position: Position, match: MatchInfo) {
  return {
    subject: `Čeka tvoj odgovor: ${match.home?.name} – ${match.away?.name}, ${formatDayMonth(match.starts_at)}`,
    text: `Zdravo ${name},

još nisi odgovorio na nominaciju (${positionName(position, match.digital_scoresheet).toLowerCase()}):

${describe(match)}

Prihvati ili odbij:
${siteUrl("/nominacije")}

Košarkaški savez Kantona Sarajevo`,
  };
}

export function passwordResetEmail(name: string, link: string) {
  return {
    subject: "Nova šifra za KSKS Delegiranje",
    text: `Zdravo ${name},

zatražena je nova šifra za tvoj nalog. Otvori link i upiši novu šifru:
${link}

Link važi kratko vrijeme i može se iskoristiti samo jednom. Ako nisi ti tražio novu šifru, zanemari ovaj email; stara šifra i dalje važi.

Košarkaški savez Kantona Sarajevo`,
  };
}

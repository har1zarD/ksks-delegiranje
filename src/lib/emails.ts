import { formatDayMonth, formatTime, formatWeekday, matchNo, positionName, type Position } from "@/lib/format";
import { siteUrl } from "@/lib/email";

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

export function nominationEmail(name: string, position: Position, match: MatchInfo) {
  return {
    subject: `Nominacija: ${match.home?.name} – ${match.away?.name}, ${formatDayMonth(match.starts_at)}`,
    text: `Zdravo ${name},

delegiran si kao ${positionName(position, match.digital_scoresheet).toLowerCase()} na utakmicu:

${describe(match)}

Prihvati ili odbij nominaciju ovdje:
${siteUrl("/nominacije")}

Košarkaški savez Kantona Sarajevo`,
  };
}

export function cancellationEmail(name: string, position: Position, match: MatchInfo) {
  return {
    subject: `Otkazano: ${match.home?.name} – ${match.away?.name}, ${formatDayMonth(match.starts_at)}`,
    text: `Zdravo ${name},

tvoja nominacija (${positionName(position, match.digital_scoresheet).toLowerCase()}) za utakmicu je otkazana:

${describe(match)}

Košarkaški savez Kantona Sarajevo`,
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

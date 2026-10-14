// Emailovi objave nominacije: (1) nominacija kola svima sa liste, (2) lični pregled delegiranih.
// Čista logika (bez baze): ulaz su objavljene utakmice sa ekipom službenih lica.
import { formatDayMonth, formatTime, formatWeekday, matchKindLabel, matchNo, positionName, POSITION_ORDER, type MatchKind, type Position } from "@/lib/format";

export type NominationMatch = {
  id: string;
  number: number;
  starts_at: string;
  round: number | null;
  kind: MatchKind;
  kind_label: string | null;
  digital_scoresheet: boolean;
  competition: { name: string; sort: number } | null;
  home: { name: string } | null;
  away: { name: string } | null;
  hall: { name: string } | null;
  crew: { position: Position; name: string; profileId: string; email: string }[];
};

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const when = (iso: string) => `${formatWeekday(iso)} ${formatDayMonth(iso)} u ${formatTime(iso)}`;
const teams = (m: NominationMatch) => `${m.home?.name ?? "?"} – ${m.away?.name ?? "?"}`;
const crewSorted = (m: NominationMatch) => [...m.crew].sort((a, b) => POSITION_ORDER.indexOf(a.position) - POSITION_ORDER.indexOf(b.position));

/** "17. – 18. 10." ili "17. 10." */
function dateRange(matches: NominationMatch[]) {
  const days = [...new Set(matches.map((m) => formatDayMonth(m.starts_at)))];
  return days.length === 1 ? days[0] : `${days[0]} – ${days[days.length - 1]}`;
}

/** Grupe kao u nominaciji saveza: takmičenje, pa kolo */
function groups(matches: NominationMatch[]) {
  const sorted = [...matches].sort(
    (a, b) =>
      (a.competition?.sort ?? 0) - (b.competition?.sort ?? 0) ||
      (a.round ?? 999) - (b.round ?? 999) ||
      a.starts_at.localeCompare(b.starts_at),
  );
  const map = new Map<string, NominationMatch[]>();
  for (const m of sorted) {
    const title = [m.round ? `${m.round}. kolo` : null, m.competition?.name, matchKindLabel(m.kind, m.kind_label) || null].filter(Boolean).join(" – ");
    map.set(title, [...(map.get(title) ?? []), m]);
  }
  return [...map];
}

/** Nominacija kola: sve objavljene utakmice i ko je gdje delegiran */
export function nominationListEmail(matches: NominationMatch[], link: string) {
  const subject = `Nominacija ${dateRange(matches)}`;

  const text = [
    `NOMINACIJA ${dateRange(matches)}`,
    "",
    ...groups(matches).flatMap(([title, list]) => [
      title.toUpperCase(),
      ...list.flatMap((m) => [
        "",
        `${matchNo(m.number)}: ${teams(m)}`,
        `${when(m.starts_at)}, ${m.hall?.name ?? "dvorana nije određena"}`,
        ...crewSorted(m).map((c) => `  ${positionName(c.position, m.digital_scoresheet)}: ${c.name}`),
      ]),
      "",
    ]),
    `Svoje nominacije prihvati ili odbij u aplikaciji: ${link}`,
    "",
    "Košarkaški savez Kantona Sarajevo",
  ].join("\n");

  const cell = "padding:10px 12px;border-top:1px solid #e7e7ea;vertical-align:top";
  const html = `<div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#0f0f11;max-width:680px">
<h1 style="font-size:20px;margin:0 0 4px">Nominacija ${esc(dateRange(matches))}</h1>
<p style="margin:0 0 20px;color:#5c5c66;font-size:14px">Košarkaški savez Kantona Sarajevo</p>
${groups(matches)
  .map(
    ([title, list]) => `<h2 style="font-size:15px;margin:24px 0 6px">${esc(title)}</h2>
<table style="border-collapse:collapse;width:100%;font-size:14px">${list
      .map(
        (m) => `<tr>
<td style="${cell};width:130px;color:#5c5c66"><b style="color:#0f0f11">${esc(matchNo(m.number))}</b><br>${esc(formatWeekday(m.starts_at))} ${esc(formatDayMonth(m.starts_at))}<br>${esc(formatTime(m.starts_at))}<br>${esc(m.hall?.name ?? "")}</td>
<td style="${cell}"><b>${esc(teams(m))}</b>${crewSorted(m)
          .map((c) => `<br><span style="color:#5c5c66">${esc(positionName(c.position, m.digital_scoresheet))}:</span> ${esc(c.name)}`)
          .join("")}</td>
</tr>`,
      )
      .join("")}</table>`,
  )
  .join("")}
<p style="margin:24px 0 0;font-size:14px">Svoje nominacije prihvati ili odbij u aplikaciji: <a href="${esc(link)}">${esc(link)}</a></p>
</div>`;

  return { subject, text, html };
}

/** Lični pregled: utakmice jedne osobe iz ove objave */
export function personalNominationEmail(name: string, items: { match: NominationMatch; position: Position }[], link: string) {
  const n = items.length;
  const subject = `Tvoje nominacije: ${n} ${n === 1 ? "utakmica" : n < 5 ? "utakmice" : "utakmica"} (${dateRange(items.map((i) => i.match))})`;
  const lines = items
    .sort((a, b) => a.match.starts_at.localeCompare(b.match.starts_at))
    .map(
      (i) =>
        `${matchNo(i.match.number)}, ${i.match.competition?.name ?? ""}: ${teams(i.match)}\n  ${when(i.match.starts_at)}, ${i.match.hall?.name ?? "dvorana nije određena"}\n  ${positionName(i.position, i.match.digital_scoresheet)}`,
    );
  const text = `Zdravo ${name},

delegiran si na:

${lines.join("\n\n")}

Prihvati ili odbij svaku nominaciju ovdje:
${link}

Košarkaški savez Kantona Sarajevo`;
  return { subject, text };
}

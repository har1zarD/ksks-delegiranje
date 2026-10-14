// Nominacija kola emailom, u obliku dokumenta saveza (kao Word nominacija):
//  * omladinska liga: "N KOLO – TAKMIČENJE", za svaku utakmicu broj, termin, dvorana, ekipe, sudije i pomoćne sudije
//  * seniori: poseban dokument "NOMINACIJA – POMOĆNE SUDIJE" (samo sto)
// Svako sa liste vidi cijelo kolo; svoje utakmice i odgovor su u aplikaciji (dugme na dnu).
// Čista logika (bez baze). HTML je za email klijente: tabele i inline stilovi.
import { formatDayMonth, formatTime, formatWeekday, matchKindLabel, positionName, POSITION_ORDER, type MatchKind, type Position } from "@/lib/format";

export type NominationMatch = {
  id: string;
  number: number;
  starts_at: string;
  round: number | null;
  kind: MatchKind;
  kind_label: string | null;
  digital_scoresheet: boolean;
  competition: { name: string; sort: number; category: string } | null;
  home: { name: string } | null;
  away: { name: string } | null;
  hall: { name: string } | null;
  crew: { position: Position; name: string; profileId: string; email: string }[];
};

export type NominationKind = "youth" | "seniors";

const SENIOR = new Set(["seniori", "seniorke"]);
export const nominationKindOf = (m: NominationMatch): NominationKind => (SENIOR.has(m.competition?.category ?? "") ? "seniors" : "youth");

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

/** "Haris Velić" → "Haris VELIĆ" (kao u nominacijama saveza) */
export function nominationName(full: string) {
  const parts = full.trim().split(/\s+/);
  if (parts.length < 2) return full.toUpperCase();
  const last = parts.pop()!;
  return `${parts.join(" ")} ${last.toLocaleUpperCase("bs")}`;
}

const pad = (n: number) => String(n).padStart(2, "0");
const date = (iso: string) => `${formatWeekday(iso)} ${formatDayMonth(iso)}`;

/** "12. – 14. 12." ili "13. 12." */
function dateRange(matches: NominationMatch[]) {
  const days = [...new Set([...matches].sort((a, b) => a.starts_at.localeCompare(b.starts_at)).map((m) => formatDayMonth(m.starts_at)))];
  return days.length === 1 ? days[0] : `${days[0]} – ${days[days.length - 1]}`;
}

/** Redovi ekipe: pozicija → imena (statistika i više osoba u jednom redu, kao u dokumentu) */
function crewRows(m: NominationMatch, kind: NominationKind) {
  const rows = new Map<string, string[]>();
  const sorted = [...m.crew].sort((a, b) => POSITION_ORDER.indexOf(a.position) - POSITION_ORDER.indexOf(b.position));
  for (const c of sorted) {
    // Seniori: samo pomoćne sudije
    if (kind === "seniors" && (c.position.startsWith("referee") || c.position === "commissioner")) continue;
    const label = c.position.startsWith("statistician")
      ? "Statistika"
      : c.position.startsWith("referee")
        ? c.position === "referee_1"
          ? "Glavni sudija"
          : "Sudija"
        : positionName(c.position, m.digital_scoresheet);
    // Sudije su odvojeni redovi; ostale pozicije istog naziva idu u jedan red
    const key = c.position.startsWith("referee") ? `${label}:${c.position}` : label;
    rows.set(key, [...(rows.get(key) ?? []), nominationName(c.name)]);
  }
  return [...rows].map(([key, names]) => ({ label: key.split(":")[0], names: names.join(", ") }));
}

const dayTitle = new Intl.DateTimeFormat("bs-BA", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Sarajevo" });

/** Hronološki: po danu, a unutar dana po satu (8:00, 9:00, 10:00…) */
function groups(matches: NominationMatch[]) {
  const sorted = [...matches].sort((a, b) => a.starts_at.localeCompare(b.starts_at) || a.number - b.number);
  const map = new Map<string, NominationMatch[]>();
  for (const m of sorted) {
    const title = dayTitle.format(new Date(m.starts_at)).toLocaleUpperCase("bs");
    map.set(title, [...(map.get(title) ?? []), m]);
  }
  return [...map];
}

/** "4. KOLO – MINIBASKET" (na kartici utakmice) */
function competitionLine(m: NominationMatch) {
  return [m.round ? `${m.round}. kolo` : null, m.competition?.name, matchKindLabel(m.kind, m.kind_label) || null]
    .filter(Boolean)
    .join(" – ")
    .toLocaleUpperCase("bs");
}

// ───────── Email ─────────

const C = {
  ink: "#0f0f11",
  muted: "#5c5c66",
  faint: "#8b8b95",
  line: "#e7e7ea",
  bg: "#f4f4f6",
  panel: "#ffffff",
  head: "#f7f7f8",
  brand: "#18181b",
};
const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

function matchCard(m: NominationMatch, kind: NominationKind) {
  const rows = crewRows(m, kind);
  const left = `
    ${kind === "youth" ? `<div style="font-size:11px;font-weight:700;letter-spacing:.06em;color:${C.faint};text-transform:uppercase">Utakmica</div>
    <div style="font-size:22px;font-weight:700;color:${C.ink};line-height:1.1;margin-bottom:10px">${pad(m.number)}</div>` : ""}
    <div style="font-size:20px;font-weight:700;color:${C.ink};line-height:1.1">${esc(formatTime(m.starts_at))}</div>
    <div style="font-size:13px;color:${C.muted};margin-top:2px">${esc(date(m.starts_at))}</div>
    <div style="font-size:13px;color:${C.muted};margin-top:4px">${esc(m.hall?.name ?? "Dvorana nije određena")}</div>`;
  const crew = rows.length
    ? rows
        .map(
          (r, i) => `<tr>
            <td style="padding:7px 12px;border-top:${i ? `1px solid ${C.line}` : "0"};font-size:13px;color:${C.muted};width:40%">${esc(r.label)}</td>
            <td style="padding:7px 12px;border-top:${i ? `1px solid ${C.line}` : "0"};font-size:14px;font-weight:600;color:${C.ink}">${esc(r.names)}</td>
          </tr>`,
        )
        .join("")
    : `<tr><td colspan="2" style="padding:8px 12px;font-size:13px;color:${C.faint}">Delegiranje u toku</td></tr>`;

  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid ${C.line};border-radius:8px;border-collapse:separate;background:${C.panel};margin:0 0 12px">
  <tr>
    <td valign="top" style="width:120px;padding:14px 14px;border-right:1px solid ${C.line};background:${C.head};border-radius:8px 0 0 8px">${left}</td>
    <td valign="top" style="padding:0">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
        <tr><td colspan="2" style="padding:10px 12px 0;font-size:11px;font-weight:700;letter-spacing:.05em;color:${C.faint}">${esc(competitionLine(m))}</td></tr>
        <tr>
          <td colspan="2" style="padding:4px 12px 12px;border-bottom:1px solid ${C.line};font-size:15px;font-weight:700;color:${C.ink};text-transform:uppercase">${esc(m.home?.name ?? "?")} – ${esc(m.away?.name ?? "?")}</td>
        </tr>
        <tr><td colspan="2" style="padding:4px 0"><table role="presentation" width="100%" cellspacing="0" cellpadding="0">${crew}</table></td></tr>
      </table>
    </td>
  </tr>
</table>`;
}

/** Nominacija (omladinska liga) ili Nominacija – pomoćne sudije (seniori) */
export function nominationEmail(matches: NominationMatch[], kind: NominationKind, link: string, logo: string) {
  const title = kind === "youth" ? "Nominacija" : "Nominacija – pomoćne sudije";
  const subject = `${title} ${dateRange(matches)}`;

  const text = [
    `${title.toUpperCase()} ${dateRange(matches)}`,
    "Košarkaški savez Kantona Sarajevo",
    "",
    ...groups(matches).flatMap(([group, list]) => [
      ...(group ? [group, ""] : []),
      ...list.flatMap((m) => [
        `${formatTime(m.starts_at)}  ${kind === "youth" ? `UTAKMICA ${pad(m.number)}, ` : ""}${competitionLine(m)}, ${m.hall?.name ?? "dvorana nije određena"}`,
        `${(m.home?.name ?? "?").toUpperCase()} – ${(m.away?.name ?? "?").toUpperCase()}`,
        ...crewRows(m, kind).map((r) => `  ${r.label}: ${r.names}`),
        "",
      ]),
    ]),
    `Prihvati nominaciju: ${link}`,
    "",
    "Takmičarska komisija KSKS",
  ].join("\n");

  const html = `<!doctype html><html lang="bs"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:${C.bg};font-family:${FONT};color:${C.ink}">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${C.bg}"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px">
  <tr><td style="padding:4px 4px 20px">
    <table role="presentation" cellspacing="0" cellpadding="0"><tr>
      <td valign="middle" style="padding-right:12px"><img src="${esc(logo)}" width="44" height="44" alt="KSKS" style="display:block;border:0"></td>
      <td valign="middle">
        <div style="font-size:13px;color:${C.muted}">Košarkaški savez Kantona Sarajevo</div>
        <div style="font-size:22px;font-weight:700;letter-spacing:-.02em;color:${C.ink}">${esc(title)}</div>
      </td>
    </tr></table>
    <div style="margin-top:10px;font-size:15px;color:${C.muted}">${esc(dateRange(matches))}, ${matches.length} ${matches.length === 1 ? "utakmica" : matches.length < 5 ? "utakmice" : "utakmica"}</div>
  </td></tr>
  ${groups(matches)
    .map(
      ([group, list]) => `<tr><td style="padding:0 0 4px">
    ${group ? `<div style="font-size:12px;font-weight:700;letter-spacing:.06em;color:${C.muted};padding:14px 4px 8px">${esc(group)}</div>` : ""}
    ${list.map((m) => matchCard(m, kind)).join("")}
  </td></tr>`,
    )
    .join("")}
  <tr><td style="padding:12px 0 8px">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr>
      <td align="center" bgcolor="${C.brand}" style="border-radius:8px">
        <a href="${esc(link)}" style="display:block;padding:16px 20px;font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:8px">Prihvati nominaciju</a>
      </td>
    </tr></table>
    <p style="margin:12px 4px 0;font-size:13px;color:${C.muted};text-align:center">Svoje utakmice prihvataš ili odbijaš u aplikaciji KSKS Delegiranje.</p>
  </td></tr>
  <tr><td style="padding:20px 4px 0;font-size:13px;color:${C.faint};text-align:center">Takmičarska komisija KSKS</td></tr>
</table>
</td></tr></table>
</body></html>`;

  return { subject, text, html };
}

// Nominacija kola emailom, u obliku dokumenta saveza (kao Word nominacija):
//  * omladinska liga: "N KOLO – TAKMIČENJE", za svaku utakmicu broj, termin, dvorana, ekipe, sudije i pomoćne sudije
//  * seniori: poseban dokument "NOMINACIJA – POMOĆNE SUDIJE" (samo sto)
// Svako sa liste vidi cijelo kolo; svoje utakmice i odgovor su u aplikaciji (dugme na dnu).
// Čista logika (bez baze). HTML je za email klijente: tabele i inline stilovi.
import { fibaGameUrl } from "@/lib/fiba";
import { formatDayMonth, formatTime, formatWeekday, MATCH_STATUS_LABEL, matchKindLabel, positionName, POSITION_ORDER, type MatchKind, type MatchStatus, type Position } from "@/lib/format";

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
  /** FIBA LiveStats: utakmica i pristupni kod (Stream Key) za zapisničara; null = utakmica se ne vodi na FIBA LiveStats */
  fiba_game_id?: number | null;
  fiba_stream_key?: string | null;
  /** changed = novo u odnosu na prethodnu nominaciju (crveno); removed = precrtano (samo u obavijesti o otkazanoj nominaciji) */
  crew: { position: Position; name: string; profileId: string; email: string; changed?: boolean; removed?: boolean }[];
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

/** Redovi ekipe: pozicija → osobe (statistika i više osoba u jednom redu, kao u dokumentu) */
function crewRows(m: Pick<NominationMatch, "crew" | "digital_scoresheet">, kind: NominationKind) {
  const rows = new Map<string, { name: string; profileId: string; changed: boolean; removed: boolean }[]>();
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
    rows.set(key, [...(rows.get(key) ?? []), { name: nominationName(c.name), profileId: c.profileId, changed: Boolean(c.changed), removed: Boolean(c.removed) }]);
  }
  return [...rows].map(([key, people]) => ({ label: key.split(":")[0], people }));
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
function competitionLine(m: CardMatch) {
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
  red: "#d1242f",
};
const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

type Row = ReturnType<typeof crewRows>[number];
/** Polja utakmice potrebna kartici (nominacija i otkazivanje) */
type CardMatch = Pick<NominationMatch, "number" | "starts_at" | "round" | "kind" | "kind_label" | "home" | "away" | "hall" | "fiba_game_id" | "fiba_stream_key"> & {
  competition: { name: string } | null;
};

/** Kartica utakmice. Osoba s oznakom `changed` je crvena (nova u odnosu na prethodnu nominaciju), s `removed` precrtana (otkazana nominacija). */
/** crewless = bez službenih lica (klubovi); changed = promijenjeni termin/dvorana crveno (izmjena utakmice) */
function matchCard(
  m: CardMatch,
  rows: Row[],
  { showNumber, crewless, changed }: { showNumber: boolean; crewless?: boolean; changed?: { time?: boolean; hall?: boolean } },
) {
  const left = `
    ${showNumber ? `<div style="font-size:11px;font-weight:700;letter-spacing:.06em;color:${C.faint};text-transform:uppercase">Utakmica</div>
    <div style="font-size:22px;font-weight:700;color:${C.ink};line-height:1.1;margin-bottom:10px">${pad(m.number)}</div>` : ""}
    <div style="font-size:20px;font-weight:700;color:${changed?.time ? C.red : C.ink};line-height:1.1">${esc(formatTime(m.starts_at))}</div>
    <div style="font-size:13px;color:${changed?.time ? C.red : C.muted};font-weight:${changed?.time ? 700 : 400};margin-top:2px">${esc(date(m.starts_at))}</div>
    <div style="font-size:13px;color:${changed?.hall ? C.red : C.muted};font-weight:${changed?.hall ? 700 : 400};margin-top:4px">${esc(m.hall?.name ?? "Dvorana nije određena")}</div>`;
  const person = (p: Row["people"][number]) =>
    p.removed
      ? `<span style="color:${C.red};text-decoration:line-through">${esc(p.name)}</span>`
      : p.changed
        ? `<span style="color:${C.red}">${esc(p.name)}</span>`
        : esc(p.name);
  const crew = rows.length
    ? rows
        .map(
          (r, i) => `<tr>
            <td style="padding:7px 12px;border-top:${i ? `1px solid ${C.line}` : "0"};font-size:13px;color:${C.muted};width:40%">${esc(r.label)}</td>
            <td style="padding:7px 12px;border-top:${i ? `1px solid ${C.line}` : "0"};font-size:14px;font-weight:600;color:${C.ink}">${r.people.map(person).join(", ")}</td>
          </tr>`,
        )
        .join("")
    : `<tr><td colspan="2" style="padding:8px 12px;font-size:13px;color:${C.faint}">Delegiranje u toku</td></tr>`;
  // FIBA LiveStats: kod kojim zapisničar preuzima utakmicu i javni link statistike
  const fiba =
    m.fiba_stream_key || m.fiba_game_id
      ? `<tr><td colspan="2" style="padding:8px 12px;border-top:1px solid ${C.line};font-size:13px;color:${C.muted}">FIBA LiveStats${
          m.fiba_stream_key ? ` kod: <span style="font-family:ui-monospace,Menlo,Consolas,monospace;font-size:14px;font-weight:700;color:${C.ink}">${esc(m.fiba_stream_key)}</span>` : ""
        }${m.fiba_game_id ? ` · <a href="${esc(fibaGameUrl(m.fiba_game_id))}" style="color:${C.ink};font-weight:600">statistika uživo</a>` : ""}</td></tr>`
      : "";

  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid ${C.line};border-radius:8px;border-collapse:separate;background:${C.panel};margin:0 0 12px">
  <tr>
    <td valign="top" style="width:120px;padding:14px 14px;border-right:1px solid ${C.line};background:${C.head};border-radius:8px 0 0 8px">${left}</td>
    <td valign="top" style="padding:0">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
        <tr><td colspan="2" style="padding:10px 12px 0;font-size:11px;font-weight:700;letter-spacing:.05em;color:${C.faint}">${esc(competitionLine(m))}</td></tr>
        <tr>
          <td colspan="2" style="padding:4px 12px 12px;border-bottom:1px solid ${C.line};font-size:15px;font-weight:700;color:${C.ink};text-transform:uppercase">${esc(m.home?.name ?? "?")} – ${esc(m.away?.name ?? "?")}</td>
        </tr>
        ${crewless ? "" : `<tr><td colspan="2" style="padding:4px 0"><table role="presentation" width="100%" cellspacing="0" cellpadding="0">${crew}${fiba}</table></td></tr>`}
      </table>
    </td>
  </tr>
</table>`;
}

/** Okvir dokumenta saveza: grb, naslov, podnaslov, sadržaj, dugme */
function documentHtml(o: { subject: string; title: string; subtitle: string; intro?: string; body: string; button: string; link: string; note: string; logo: string }) {
  return `<!doctype html><html lang="bs"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${esc(o.subject)}</title></head>
<body style="margin:0;padding:0;background:${C.bg};font-family:${FONT};color:${C.ink}">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${C.bg}"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px">
  <tr><td style="padding:4px 4px 20px">
    <table role="presentation" cellspacing="0" cellpadding="0"><tr>
      <td valign="middle" style="padding-right:12px"><img src="${esc(o.logo)}" width="44" height="44" alt="KSKS" style="display:block;border:0"></td>
      <td valign="middle">
        <div style="font-size:13px;color:${C.muted}">Košarkaški savez Kantona Sarajevo</div>
        <div style="font-size:22px;font-weight:700;letter-spacing:-.02em;color:${C.ink}">${esc(o.title)}</div>
      </td>
    </tr></table>
    <div style="margin-top:10px;font-size:15px;color:${C.muted}">${esc(o.subtitle)}</div>
    ${o.intro ? `<div style="margin-top:6px;font-size:15px;line-height:1.45;color:${C.ink}">${o.intro}</div>` : ""}
  </td></tr>
  ${o.body}
  <tr><td style="padding:12px 0 8px">
    ${o.button ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr>
      <td align="center" bgcolor="${C.brand}" style="border-radius:8px">
        <a href="${esc(o.link)}" style="display:block;padding:16px 20px;font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:8px">${esc(o.button)}</a>
      </td>
    </tr></table>` : ""}
    <p style="margin:12px 4px 0;font-size:13px;color:${C.muted};text-align:center">${esc(o.note)}</p>
  </td></tr>
  <tr><td style="padding:20px 4px 0;font-size:13px;color:${C.faint};text-align:center">Takmičarska komisija KSKS</td></tr>
</table>
</td></tr></table>
</body></html>`;
}

const textLine = (m: CardMatch, showNumber: boolean) =>
  `${formatTime(m.starts_at)}  ${showNumber ? `UTAKMICA ${pad(m.number)}, ` : ""}${competitionLine(m)}, ${m.hall?.name ?? "dvorana nije određena"}`;
const textTeams = (m: CardMatch) => `${(m.home?.name ?? "?").toUpperCase()} – ${(m.away?.name ?? "?").toUpperCase()}`;

/**
 * Nominacija kola u JEDNOM dokumentu: omladinska liga (sudije, komesar, sto) pa seniori (samo pomoćne sudije).
 * Kad ima samo seniorskih utakmica naslov je "Nominacija – pomoćne sudije".
 * Objava izmjena već aktivirane utakmice: osobe s `changed` su crvene, naslov "(izmjena)"; skinuti se ne ispisuju.
 */
/** delegated = false: verzija za listu (primalac nije delegiran ni na jednu od ovih utakmica), bez dugmeta za prihvatanje */
export function nominationEmail(matches: NominationMatch[], link: string, logo: string, delegated = true) {
  const parts = (["youth", "seniors"] as const)
    .map((kind) => ({ kind, list: matches.filter((m) => nominationKindOf(m) === kind) }))
    .filter((p) => p.list.length > 0);
  const title = parts.length === 1 && parts[0].kind === "seniors" ? "Nominacija – pomoćne sudije" : "Nominacija";
  const changed = matches.some((m) => m.crew.some((c) => c.changed));
  const tag = changed ? " (izmjena)" : "";
  const subject = `${title}${tag} ${dateRange(matches)}`;
  const intro = changed ? "Izmjena nominacije: nova imena u odnosu na prethodnu nominaciju su označena crveno." : null;
  const sectionTitle = (kind: NominationKind) => (kind === "youth" ? "NOMINACIJA" : "NOMINACIJA – POMOĆNE SUDIJE");

  const text = [
    `${title.toUpperCase()}${tag.toUpperCase()} ${dateRange(matches)}`,
    "Košarkaški savez Kantona Sarajevo",
    "",
    ...(intro ? [intro, ""] : []),
    ...parts.flatMap(({ kind, list }) => [
      ...(parts.length > 1 ? [sectionTitle(kind), ""] : []),
      ...groups(list).flatMap(([group, day]) => [
        ...(group ? [group, ""] : []),
        ...day.flatMap((m) => [
          textLine(m, kind === "youth"),
          textTeams(m),
          ...crewRows(m, kind).map((r) => `  ${r.label}: ${r.people.map((p) => (p.removed ? `${p.name} (skinuto)` : p.changed ? `${p.name} (novo)` : p.name)).join(", ")}`),
          ...(m.fiba_stream_key ? [`  FIBA LiveStats kod: ${m.fiba_stream_key}`] : []),
          ...(m.fiba_game_id ? [`  Statistika uživo: ${fibaGameUrl(m.fiba_game_id)}`] : []),
          "",
        ]),
      ]),
    ]),
    delegated ? `Prihvati nominaciju: ${link}` : NOT_DELEGATED,
    "",
    "Takmičarska komisija KSKS",
  ].join("\n");

  const body = parts
    .map(
      ({ kind, list }) =>
        (parts.length > 1
          ? `<tr><td style="padding:18px 4px 2px;font-size:15px;font-weight:700;letter-spacing:.04em;color:${C.ink};border-top:1px solid ${C.line}">${esc(sectionTitle(kind))}</td></tr>`
          : "") +
        groups(list)
          .map(
            ([group, day]) => `<tr><td style="padding:0 0 4px">
    ${group ? `<div style="font-size:12px;font-weight:700;letter-spacing:.06em;color:${C.muted};padding:14px 4px 8px">${esc(group)}</div>` : ""}
    ${day.map((m) => matchCard(m, crewRows(m, kind), { showNumber: kind === "youth" })).join("")}
  </td></tr>`,
          )
          .join(""),
    )
    .join("");

  const html = documentHtml({
    subject,
    title,
    subtitle: `${dateRange(matches)}, ${matches.length} ${matches.length === 1 ? "utakmica" : matches.length < 5 ? "utakmice" : "utakmica"}`,
    intro: intro ? esc(intro) : undefined,
    body,
    button: delegated ? "Prihvati nominaciju" : "",
    link,
    note: delegated ? "Svoje utakmice prihvataš ili odbijaš u aplikaciji KSKS Nominacije." : NOT_DELEGATED,
    logo,
  });

  return { subject, text, html };
}

const NOT_DELEGATED = "Nisi delegiran ni na jednu od ovih utakmica. Nominacija ti je poslana informativno.";

/**
 * "Pingaj" (Pregled): osobi koja nije odgovorila na poslanu nominaciju, njene utakmice (njeno ime crveno)
 * i upozorenje da bez odgovora slijedi zamjena. Sve pozicije se ispisuju (i kod seniora).
 */
export function pingEmail(name: string, matches: NominationMatch[], link: string, logo: string) {
  const range = dateRange(matches);
  const subject = `Čeka tvoj odgovor: nominacija ${range}`;
  const intro = `Zdravo ${name}, nominacija još čeka tvoj odgovor. Prihvati je što prije, inače slijedi zamjena na utakmici.`;
  const count = `${matches.length} ${matches.length === 1 ? "utakmica" : matches.length < 5 ? "utakmice" : "utakmica"}`;

  const text = [
    `ČEKA TVOJ ODGOVOR: NOMINACIJA ${range}`,
    "Košarkaški savez Kantona Sarajevo",
    "",
    intro,
    "",
    ...groups(matches).flatMap(([group, day]) => [
      group,
      "",
      ...day.flatMap((m) => [textLine(m, nominationKindOf(m) === "youth"), textTeams(m), ...crewRows(m, "youth").map((r) => `  ${r.label}: ${r.people.map((p) => p.name).join(", ")}`), ""]),
    ]),
    `Prihvati nominaciju: ${link}`,
    "",
    "Takmičarska komisija KSKS",
  ].join("\n");

  const body = groups(matches)
    .map(
      ([group, day]) => `<tr><td style="padding:0 0 4px">
    <div style="font-size:12px;font-weight:700;letter-spacing:.06em;color:${C.muted};padding:14px 4px 8px">${esc(group)}</div>
    ${day.map((m) => matchCard(m, crewRows(m, "youth"), { showNumber: nominationKindOf(m) === "youth" })).join("")}
  </td></tr>`,
    )
    .join("");

  const html = documentHtml({
    subject,
    title: "Čeka tvoj odgovor",
    subtitle: `${range}, ${count}`,
    intro: esc(intro),
    body,
    button: "Prihvati nominaciju",
    link,
    note: "Svoje utakmice prihvataš ili odbijaš u aplikaciji KSKS Nominacije.",
    logo,
  });

  return { subject, text, html };
}

/**
 * Otkazana nominacija (savez je ukloni ili osobu zamijeni drugom), u istom obliku kao nominacija:
 * kartica utakmice s tom osobom precrtanom crveno.
 */
export function withdrawnEmail(
  person: { name: string; position: Position },
  match: CardMatch & { digital_scoresheet: boolean },
  reason: "cancelled" | "replaced",
  link: string,
  logo: string,
) {
  const subject = `Otkazana nominacija: ${match.home?.name ?? "?"} – ${match.away?.name ?? "?"}, ${formatDayMonth(match.starts_at)}`;
  const role = positionName(person.position, match.digital_scoresheet).toLowerCase();
  const intro =
    reason === "replaced"
      ? `Na ovoj utakmici (${role}) te mijenja druga osoba. Utakmica više nije među tvojim nominacijama i ne trebaš dolaziti.`
      : `Tvoja nominacija (${role}) za ovu utakmicu je otkazana. Utakmica više nije među tvojim nominacijama i ne trebaš dolaziti.`;
  const crew: NominationMatch["crew"] = [{ position: person.position, name: person.name, profileId: "removed", email: "", removed: true }];
  const rows = crewRows({ crew, digital_scoresheet: match.digital_scoresheet }, "youth");

  const text = [
    `OTKAZANA NOMINACIJA`,
    "Košarkaški savez Kantona Sarajevo",
    "",
    intro,
    "",
    textLine(match, true),
    textTeams(match),
    `  ${rows[0]?.label}: ${nominationName(person.name)} (otkazano)`,
    "",
    `Moje nominacije: ${link}`,
    "",
    "Takmičarska komisija KSKS",
  ].join("\n");

  const html = documentHtml({
    subject,
    title: "Otkazana nominacija",
    subtitle: `${dayTitle.format(new Date(match.starts_at))}, ${formatTime(match.starts_at)}`,
    intro: esc(intro),
    body: `<tr><td style="padding:8px 0 4px">${matchCard(match, rows, { showNumber: true })}</td></tr>`,
    button: "Otvori moje nominacije",
    link,
    note: "Ostale nominacije ostaju kakve jesu.",
    logo,
  });

  return { subject, text, html };
}

/**
 * Raspored klubovima: datum, vrijeme, dvorana i ekipe, BEZ sudija, komesara i pomoćnih sudija.
 * Poseban, pregledan dokument: grb u zaglavlju, po danima tabela s vremenom, utakmicom i dvoranom.
 * Ide svim klubovima (adrese klubova i trenera) kao skrivenim primaocima.
 */
export function scheduleEmail(matches: NominationMatch[], logo: string) {
  const title = "Raspored utakmica";
  const range = dateRange(matches);
  const subject = `${title} ${range}`;
  const count = `${matches.length} ${matches.length === 1 ? "utakmica" : matches.length < 5 ? "utakmice" : "utakmica"}`;
  const label = (m: NominationMatch) =>
    [nominationKindOf(m) === "youth" ? `Utakmica ${pad(m.number)}` : null, m.competition?.name, m.round ? `${m.round}. kolo` : null, matchKindLabel(m.kind, m.kind_label) || null]
      .filter(Boolean)
      .join(" · ");

  const text = [
    `${title.toUpperCase()} ${range}`,
    "Košarkaški savez Kantona Sarajevo",
    "",
    ...groups(matches).flatMap(([group, list]) => [
      group,
      "",
      ...list.flatMap((m) => [`${formatTime(m.starts_at)}  ${m.home?.name ?? "?"} – ${m.away?.name ?? "?"}`, `       ${label(m)}`, `       ${m.hall?.name ?? "dvorana nije određena"}`, ""]),
    ]),
    "Molimo klubove da budu u dvorani najmanje 30 minuta prije početka utakmice.",
    "",
    "Takmičarska komisija KSKS",
  ].join("\n");

  const days = groups(matches)
    .map(
      ([group, list], gi) => `
      <tr><td colspan="2" style="padding:${gi ? 18 : 14}px 16px 6px;font-size:12px;font-weight:700;letter-spacing:.07em;color:${C.muted};background:${C.head};border-top:${gi ? `1px solid ${C.line}` : "0"};border-bottom:1px solid ${C.line}">${esc(group)}</td></tr>
      ${list
        .map(
          (m, i) => `
      <tr>
        <td valign="top" width="64" style="padding:13px 0 13px 16px;border-top:${i ? `1px solid ${C.line}` : "0"};font-size:17px;font-weight:700;color:${C.ink};white-space:nowrap;line-height:1.2">${esc(formatTime(m.starts_at))}</td>
        <td valign="top" style="padding:13px 16px 13px 12px;border-top:${i ? `1px solid ${C.line}` : "0"}">
          <div style="font-size:11px;font-weight:700;letter-spacing:.05em;color:${C.faint};text-transform:uppercase">${esc(label(m))}</div>
          <div style="font-size:17px;font-weight:700;color:${C.ink};margin-top:3px;line-height:1.25">${esc(m.home?.name ?? "?")} <span style="color:${C.faint};font-weight:500">–</span> ${esc(m.away?.name ?? "?")}</div>
          <div style="font-size:13px;color:${C.muted};margin-top:4px">${esc(m.hall?.name ?? "Dvorana nije određena")}</div>
        </td>
      </tr>`,
        )
        .join("")}`,
    )
    .join("");

  const html = `<!doctype html><html lang="bs"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:${C.bg};font-family:${FONT};color:${C.ink}">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${C.bg}"><tr><td align="center" style="padding:28px 12px">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px">
  <tr><td style="padding:0 4px 20px">
    <table role="presentation" cellspacing="0" cellpadding="0"><tr>
      <td valign="middle" style="padding-right:16px"><img src="${esc(logo)}" width="64" height="64" alt="KSKS" style="display:block;border:0;width:64px;height:64px"></td>
      <td valign="middle">
        <div style="font-size:11px;font-weight:700;letter-spacing:.08em;color:${C.muted};text-transform:uppercase">Košarkaški savez Kantona Sarajevo</div>
        <div style="font-size:26px;font-weight:700;letter-spacing:-.02em;color:${C.ink};line-height:1.15;margin-top:2px">${esc(title)}</div>
        <div style="font-size:14px;color:${C.muted};margin-top:4px">${esc(range)}, ${esc(count)}</div>
      </td>
    </tr></table>
  </td></tr>
  <tr><td>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid ${C.line};border-radius:10px;border-collapse:separate;overflow:hidden;background:${C.panel}">${days}
    </table>
  </td></tr>
  <tr><td style="padding:18px 8px 0;font-size:13px;line-height:1.5;color:${C.muted};text-align:center">Molimo klubove da budu u dvorani najmanje 30 minuta prije početka utakmice.</td></tr>
  <tr><td style="padding:22px 4px 0;font-size:12px;color:${C.faint};text-align:center">Takmičarska komisija KSKS · app.ksksarajevo.ba</td></tr>
</table>
</td></tr></table>
</body></html>`;

  return { subject, text, html };
}

// ───────── Izmjena aktivirane utakmice ─────────

export type MatchChange = {
  starts_at?: { from: string; to: string };
  hall?: { from: string | null; to: string | null };
  status?: { from: MatchStatus; to: MatchStatus };
};

/**
 * Izmjena aktivirane utakmice (termin, dvorana, otkazana/odgođena): službenim licima na utakmici i klubovima (omladinska liga).
 * Novi podaci su crveni, i u listi promjena i na kartici utakmice.
 */
export function matchChangedEmail(match: NominationMatch, change: MatchChange, logo: string) {
  const teams = `${match.home?.name ?? "?"} – ${match.away?.name ?? "?"}`;
  const to = change.status?.to;
  const title = to === "cancelled" ? "Otkazana utakmica" : to === "postponed" ? "Odgođena utakmica" : "Izmjena utakmice";
  const subject = `${title}: ${teams}, ${formatDayMonth(match.starts_at)}`;
  const when = (iso: string) => `${date(iso)} u ${formatTime(iso)}`;
  // Službena lica delegirana na utakmicu (seniori: samo pomoćne sudije, kao u nominaciji)
  const rows = crewRows(match, nominationKindOf(match));
  const crewText = rows.map((r) => `${r.label}: ${r.people.map((p) => p.name).join(", ")}`);
  const lines: { label: string; from: string; to: string }[] = [];
  if (change.starts_at) lines.push({ label: "Termin", from: when(change.starts_at.from), to: when(change.starts_at.to) });
  if (change.hall) lines.push({ label: "Dvorana", from: change.hall.from ?? "nije određena", to: change.hall.to ?? "nije određena" });
  if (change.status) lines.push({ label: "Status", from: MATCH_STATUS_LABEL[change.status.from], to: MATCH_STATUS_LABEL[change.status.to] });

  const text = [
    `${title.toUpperCase()}: ${teams.toUpperCase()}`,
    "Košarkaški savez Kantona Sarajevo",
    "",
    ...lines.map((l) => `${l.label}: ${l.from} → ${l.to}`),
    "",
    textLine(match, true),
    textTeams(match),
    ...crewText,
    "",
    "Ostali podaci o utakmici ostaju isti.",
    "",
    "Takmičarska komisija KSKS",
  ].join("\n");

  const intro = lines
    .map(
      (l) =>
        `<div style="margin-top:4px">${esc(l.label)}: <span style="color:${C.muted}">${esc(l.from)}</span> <span style="color:${C.faint}">→</span> <strong style="color:${C.red}">${esc(l.to)}</strong></div>`,
    )
    .join("");
  const statusBar =
    to === "cancelled" || to === "postponed"
      ? `<tr><td style="padding:0 0 10px"><div style="display:inline-block;padding:6px 12px;border-radius:999px;background:#fdecec;color:${C.red};font-size:13px;font-weight:700">${esc(MATCH_STATUS_LABEL[to])}</div></td></tr>`
      : "";

  const html = documentHtml({
    subject,
    title,
    subtitle: `${dayTitle.format(new Date(match.starts_at))}, ${formatTime(match.starts_at)}`,
    intro,
    body: `${statusBar}<tr><td style="padding:4px 0">${matchCard(match, rows, { showNumber: true, crewless: rows.length === 0, changed: { time: Boolean(change.starts_at), hall: Boolean(change.hall) } })}</td></tr>`,
    button: "",
    link: "",
    note: "Ostali podaci o utakmici ostaju isti.",
    logo,
  });

  return { subject, text, html };
}

// ───────── Najavljeno odsustvo ─────────

/**
 * Savezu (delegiranje): službeno lice je najavilo odsustvo. Ime, uloge, period i razlog u istom okviru kao nominacija.
 * Ne šalje se osobi koja je najavila odsustvo.
 */
export function absenceEmail(
  person: { name: string; roles: string[] },
  absence: { from: string; to: string | null; days: number | null; reason: string | null },
  link: string,
  logo: string,
) {
  const period = absence.to ? `${absence.from} – ${absence.to}` : absence.from;
  const subject = `Odsustvo: ${person.name}, ${period}`;
  const intro = `${person.name} nije dostupan za delegiranje u ovom periodu.`;
  const rows = [
    { label: absence.to ? "Od" : "Dan", value: absence.from },
    ...(absence.to ? [{ label: "Do", value: absence.to }] : []),
    ...(absence.days ? [{ label: "Trajanje", value: `${absence.days} ${absence.days % 10 === 1 && absence.days % 100 !== 11 ? "dan" : "dana"}` }] : []),
    { label: "Razlog", value: absence.reason ?? "Nije naveden" },
  ];

  const text = [
    "NAJAVLJENO ODSUSTVO",
    "Košarkaški savez Kantona Sarajevo",
    "",
    intro,
    "",
    nominationName(person.name),
    ...(person.roles.length ? [person.roles.join(" · ")] : []),
    ...rows.map((r) => `  ${r.label}: ${r.value}`),
    "",
    `Sva odsustva: ${link}`,
    "",
    "Takmičarska komisija KSKS",
  ].join("\n");

  const body = `<tr><td style="padding:8px 0 4px">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid ${C.line};border-radius:8px;border-collapse:separate;background:${C.panel};margin:0 0 12px">
  <tr><td style="padding:12px 14px;border-bottom:1px solid ${C.line};background:${C.head};border-radius:8px 8px 0 0">
    ${person.roles.length ? `<div style="font-size:11px;font-weight:700;letter-spacing:.05em;color:${C.faint};text-transform:uppercase">${esc(person.roles.join(" · "))}</div>` : ""}
    <div style="font-size:17px;font-weight:700;color:${C.ink};margin-top:2px">${esc(nominationName(person.name))}</div>
  </td></tr>
  <tr><td style="padding:4px 0">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">${rows
      .map(
        (r, i) => `<tr>
      <td style="padding:8px 14px;border-top:${i ? `1px solid ${C.line}` : "0"};font-size:13px;color:${C.muted};width:35%">${esc(r.label)}</td>
      <td style="padding:8px 14px;border-top:${i ? `1px solid ${C.line}` : "0"};font-size:14px;font-weight:600;color:${r.label === "Razlog" && !absence.reason ? C.faint : C.ink}">${esc(r.value)}</td>
    </tr>`,
      )
      .join("")}
    </table>
  </td></tr>
</table>
</td></tr>`;

  const html = documentHtml({
    subject,
    title: "Najavljeno odsustvo",
    subtitle: period,
    intro: esc(intro),
    body,
    button: "Otvori odsustva",
    link,
    note: "Osoba se u ovom periodu ne nudi pri delegiranju.",
    logo,
  });

  return { subject, text, html };
}

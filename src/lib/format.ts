import type { Database } from "@/lib/supabase/database.types";

type Enums = Database["public"]["Enums"];
export type Position = Enums["assignment_position"];
export type AssignmentStatus = Enums["assignment_status"];
export type MatchStatus = Enums["match_status"];
export type MatchKind = Enums["match_kind"];

export const MATCH_KIND_LABEL: Record<MatchKind, string> = {
  league: "Liga",
  friendly: "Prijateljska",
  tournament: "Turnir",
  custom: "Ostalo",
};

/** Naziv vrste za prikaz uz utakmicu; liga se ne ispisuje (podrazumijevana) */
export function matchKindLabel(kind: MatchKind | null | undefined, label?: string | null) {
  if (!kind || kind === "league") return "";
  return kind === "custom" ? (label ?? MATCH_KIND_LABEL.custom) : MATCH_KIND_LABEL[kind];
}

export const POSITION_LABEL: Record<Position, string> = {
  referee_1: "1. sudija",
  referee_2: "2. sudija",
  referee_3: "3. sudija",
  scorer: "Zapisničar",
  assistant_scorer: "Pom. zapisničar",
  timer: "Glavno vrijeme",
  assistant_timer: "Pom. semafor",
  shot_clock: "24/14",
  timer_shot_clock: "Glavno vrijeme – 24/14",
  statistician_1: "Statistika",
  statistician_2: "Statistika 2",
  statistician_3: "Statistika 3",
  commissioner: "Komesar",
};

export const POSITION_ORDER: Position[] = [
  "commissioner",
  "referee_1",
  "referee_2",
  "referee_3",
  "scorer",
  "assistant_scorer",
  "timer",
  "assistant_timer",
  "shot_clock",
  "timer_shot_clock",
  "statistician_1",
  "statistician_2",
  "statistician_3",
];

/** Naziv pozicije na utakmici: zapisničar s digitalnim zapisnikom je "Dig. zapisnik" */
export function positionName(position: Position, digital?: boolean | null) {
  return position === "scorer" && digital ? "Dig. zapisnik" : POSITION_LABEL[position];
}

export const ASSIGNMENT_STATUS_LABEL: Record<AssignmentStatus, string> = {
  pending: "Čeka odgovor",
  accepted: "Prihvaćeno",
  declined: "Odbijeno",
  cancelled: "Otkazano",
};

export const MATCH_STATUS_LABEL: Record<MatchStatus, string> = {
  scheduled: "Zakazana",
  live: "Uživo",
  finished: "Završena",
  postponed: "Odgođena",
  cancelled: "Otkazana",
};

const TZ = "Europe/Sarajevo";

// Datumi se formatiraju ručno (ne Intl "bs-BA"): browseri nemaju isti bosanski format kao server,
// pa bi se tekst razlikovao pri hidrataciji. Zona je uvijek Europe/Sarajevo.
export const WEEKDAYS = ["ned", "pon", "uto", "sri", "čet", "pet", "sub"];
export const MONTHS_SHORT = ["jan", "feb", "mar", "apr", "maj", "jun", "jul", "avg", "sep", "okt", "nov", "dec"];
export const MONTHS = ["januar", "februar", "mart", "april", "maj", "juni", "juli", "august", "septembar", "oktobar", "novembar", "decembar"];

function parts(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return { y, m, d, weekday: new Date(Date.UTC(y, m - 1, d)).getUTCDay() };
}

export function formatWeekday(iso: string) {
  return WEEKDAYS[parts(isoToSarajevo(iso).date).weekday];
}
export function formatDayMonth(iso: string) {
  const { d, m } = parts(isoToSarajevo(iso).date);
  return `${d}. ${m}.`;
}
const dayHeading = new Intl.DateTimeFormat("bs-BA", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });

/** "Subota, 24. oktobar" iz "2026-10-24" (naslov dana u rasporedu) */
export function formatDayHeading(day: string) {
  const s = dayHeading.format(new Date(`${day}T12:00:00Z`));
  return s.charAt(0).toUpperCase() + s.slice(1);
}
/** Grupa u rasporedu: vikend (subota i nedjelja) je jedna grupa s ključem subote, radni dan je svoja grupa */
export function weekendKey(day: string) {
  return parts(day).weekday === 0 ? addDays(day, -1) : day;
}

/** Naslov grupe: "Vikend, 24. – 25. oktobar" za subotu (ključ vikenda), inače naslov dana */
export function formatGroupHeading(key: string) {
  const sat = parts(key);
  if (sat.weekday !== 6) return formatDayHeading(key);
  const sun = parts(addDays(key, 1));
  return sat.m === sun.m ? `Vikend, ${sat.d}. – ${sun.d}. ${MONTHS[sun.m - 1]}` : `Vikend, ${sat.d}. ${MONTHS[sat.m - 1]} – ${sun.d}. ${MONTHS[sun.m - 1]}`;
}

/** "KK IUS-Famos" → "kk-ius-famos" (ime fajla bez dijakritika) */
export function slug(s: string) {
  return s
    .toLocaleLowerCase("bs")
    .replace(/đ/g, "dj")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** "Utakmica 66" (broj je jedinstven u sezoni) */
export function matchNo(n: number | null | undefined) {
  return n == null ? "" : `Utakmica ${n}`;
}

/** Kratka oznaka perioda: Q1–Q4, produžeci P1, P2… */
export function periodShort(p: number) {
  return p <= 4 ? `Q${p}` : `P${p - 4}`;
}

/** Puni naziv perioda: "1. četvrtina", "1. produžetak" */
export function periodLabel(p: number) {
  return p <= 4 ? `${p}. četvrtina` : `${p - 4}. produžetak`;
}

export function formatTime(iso: string) {
  return isoToSarajevo(iso).time;
}
/** Datum bez vremena (kolona tipa date, "2026-10-24") → "24. 10. 2026." */
export function formatDate(date: string) {
  const { d, m, y } = parts(date);
  return `${d}. ${m}. ${y}.`;
}

/** Današnji datum u Sarajevu kao "YYYY-MM-DD" (toISOString bi dao UTC datum) */
export function todayISO() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date());
}

/** "2026-10-24" + "18:30" po sarajevskom vremenu → ISO u UTC */
export function sarajevoToISO(date: string, time: string) {
  const [y, mo, d] = date.split("-").map(Number);
  const [h, mi] = time.split(":").map(Number);
  const asUtc = Date.UTC(y, mo - 1, d, h, mi);
  // Pomak zone za taj trenutak (CET/CEST), izračunat preko Intl
  const offset = (t: number) => {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: TZ,
      hourCycle: "h23",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
    }).formatToParts(new Date(t));
    const get = (type: string) => Number(parts.find((p) => p.type === type)!.value);
    return Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute")) - t;
  };
  const first = asUtc - offset(asUtc);
  return new Date(asUtc - offset(first)).toISOString();
}

/** ISO → { date: "YYYY-MM-DD", time: "HH:MM" } po sarajevskom vremenu (za forme) */
export function isoToSarajevo(iso: string) {
  const d = new Date(iso);
  return {
    date: new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(d),
    time: new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit" }).format(d),
  };
}

/** ISO → "YYYY-MM-DD" po sarajevskom vremenu (za grupisanje po danu) */
export function dayKey(iso: string) {
  return isoToSarajevo(iso).date;
}

/** "YYYY-MM-DD" + n dana (kalendarski, bez vremenskih zona) */
export function addDays(date: string, n: number) {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** "YYYY-MM-DD" + n mjeseci */
export function addMonths(date: string, n: number) {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + n);
  return d.toISOString().slice(0, 10);
}

/** Pomoćni sudija smije ispraviti ili poništiti konačni rezultat ovoliko sati nakon upisa */
export const SCORE_UNDO_HOURS = 24;

/** Do kada sto smije ispraviti ili poništiti rezultat; null kad je rok prošao ili rezultat nije upisao sto */
export function scoreUndoUntil(enteredAt: string | null, now = Date.now()) {
  if (!enteredAt) return null;
  const until = new Date(enteredAt).getTime() + SCORE_UNDO_HOURS * 60 * 60 * 1000;
  return until > now ? new Date(until).toISOString() : null;
}

// ───────── Odsustva ─────────

/** Koliko utakmica zauzima osobu od početka (s produžecima i pauzama); odsustvo u tom prozoru isključuje delegiranje */
export const MATCH_MINUTES = 120;

/** Vrijeme koje utakmica zauzima: [početak, početak + MATCH_MINUTES) kao ISO */
export function matchWindow(startsAt: string) {
  const start = new Date(startsAt).getTime();
  return { start: new Date(start).toISOString(), end: new Date(start + MATCH_MINUTES * 60_000).toISOString() };
}

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * Odsustvo iz forme: datum od (+ vrijeme), datum do (+ vrijeme). Bez vremena = cijeli dan
 * (od 00:00 prvog dana do 00:00 dana poslije zadnjeg); bez datuma "do" = isti dan.
 */
export function absenceRange(input: { from: string; fromTime?: string; to?: string; toTime?: string }): { startsAt: string; endsAt: string } | { error: string } {
  const date = /^\d{4}-\d{2}-\d{2}$/;
  const to = input.to || input.from;
  if (!date.test(input.from) || !date.test(to)) return { error: "Izaberi datum." };
  if ((input.fromTime && !HHMM.test(input.fromTime)) || (input.toTime && !HHMM.test(input.toTime))) return { error: "Vrijeme upiši kao SS:MM." };
  const startsAt = sarajevoToISO(input.from, input.fromTime || "00:00");
  const endsAt = input.toTime ? sarajevoToISO(to, input.toTime) : sarajevoToISO(addDays(to, 1), "00:00");
  if (endsAt <= startsAt) return { error: "Kraj mora biti poslije početka." };
  if (endsAt <= new Date().toISOString()) return { error: "To vrijeme je već prošlo." };
  return { startsAt, endsAt };
}

/** Početak i kraj odsustva za prikaz: cijeli dani bez vremena, inače dan u sedmici, datum i vrijeme */
export function absenceParts(startsAt: string, endsAt: string): { from: string; to: string | null; allDay: boolean } {
  const s = isoToSarajevo(startsAt);
  const e = isoToSarajevo(endsAt);
  const day = (d: string) => {
    const p = parts(d);
    return `${WEEKDAYS[p.weekday]} ${p.d}. ${p.m}.`;
  };
  if (s.time === "00:00" && e.time === "00:00") {
    const last = addDays(e.date, -1);
    return { from: formatDate(s.date), to: last === s.date ? null : formatDate(last), allDay: true };
  }
  if (s.date === e.date) return { from: `${day(s.date)} ${s.time}`, to: e.time, allDay: false };
  return { from: `${day(s.date)} ${s.time}`, to: `${day(e.date)} ${e.time}`, allDay: false };
}

/** Odsustvo u jednom redu (MCP, opis kandidata) */
export function formatAbsence(startsAt: string, endsAt: string) {
  const { from, to } = absenceParts(startsAt, endsAt);
  return to ? `${from} – ${to}` : from;
}

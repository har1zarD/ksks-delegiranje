import type { Database } from "@/lib/supabase/database.types";

type Enums = Database["public"]["Enums"];
export type Position = Enums["assignment_position"];
export type AssignmentStatus = Enums["assignment_status"];
export type MatchStatus = Enums["match_status"];

export const POSITION_LABEL: Record<Position, string> = {
  referee_1: "1. sudija",
  referee_2: "2. sudija",
  referee_3: "3. sudija",
  scorer: "Zapisničar",
  timer: "Mjerač vremena",
  shot_clock: "24 sekunde",
  commissioner: "Komesar",
};

export const POSITION_ORDER: Position[] = [
  "referee_1",
  "referee_2",
  "referee_3",
  "scorer",
  "timer",
  "shot_clock",
  "commissioner",
];

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

/** Pozicije na utakmici: 2 ili 3 sudije; sto 2 (zapisničar, mjerač vremena) ili 3 (+ 24 sekunde) */
export function requiredPositions(refereeCount: number, tableCount = 2): Position[] {
  return POSITION_ORDER.filter(
    (p) => (p !== "referee_3" || refereeCount === 3) && (p !== "shot_clock" || tableCount === 3),
  );
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

import type { TeamIdentity } from "@/components/team-name";
// Čisti proračuni za kotizacije i naknade (bez Next-a i baze, testabilno).
import type { Crew } from "@/lib/crew";
import { matchKindLabel, MONTHS, POSITION_LABEL, POSITION_ORDER, sarajevoToISO, type MatchKind, type Position } from "@/lib/format";

// ───────── Kotizacije ─────────

export type FeeState = "none" | "paid" | "late" | "partial" | "unpaid";

export const FEE_STATE_LABEL: Record<FeeState, string> = {
  none: "Kotizacija nije određena",
  paid: "Plaćeno",
  late: "Kasni prvi dio",
  partial: "Djelimično",
  unpaid: "Nije plaćeno",
};

export function feeStatus(opts: {
  fee: number | null;
  firstPart: number | null;
  dueOn: string | null;
  paid: number;
  today: string;
}): { state: FeeState; remaining: number } {
  const { fee, firstPart, dueOn, paid, today } = opts;
  if (fee == null) return { state: "none", remaining: 0 };
  const remaining = round2(Math.max(fee - paid, 0));
  if (paid >= fee) return { state: "paid", remaining: 0 };
  // Nakon roka mora biti uplaćen prvi dio (ili cijela kotizacija kad nema podjele)
  if (dueOn && today > dueOn && paid < (firstPart ?? fee)) return { state: "late", remaining };
  return { state: paid > 0 ? "partial" : "unpaid", remaining };
}

export function round2(n: number) {
  return Math.round(n * 100) / 100;
}

/** Iznos bez "KM" i bez ",00" za cijele brojeve: 26.400 / 1.234,50 (za velike brojeve uz posebnu oznaku KM) */
export function formatAmount(n: number) {
  return formatKM(n).replace(" KM", "").replace(/,00$/, "");
}

/** 1.234,50 KM — ručno, jer browseri nemaju isti bs-BA format kao server (hidratacija) */
export function formatKM(n: number) {
  const [int, dec] = Math.abs(n).toFixed(2).split(".");
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${n < 0 ? "−" : ""}${grouped},${dec} KM`;
}

/** 1 utakmica, 2–4 utakmice, 5+ utakmica (11–14 utakmica) */
export function matchesLabel(n: number) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  const word = mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14) ? "utakmice" : "utakmica";
  return `${n} ${word}`;
}

// ───────── Mjeseci ─────────

/** "2026-10" ili null ako nije ispravan */
export function parseMonth(value: unknown): string | null {
  return typeof value === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(value) ? value : null;
}

export function shiftMonth(month: string, n: number) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Granice mjeseca po sarajevskom vremenu, kao ISO u UTC: [from, to) */
export function monthBounds(month: string) {
  return { from: sarajevoToISO(`${month}-01`, "00:00"), to: sarajevoToISO(`${shiftMonth(month, 1)}-01`, "00:00") };
}

export function formatMonth(month: string) {
  const [y, m] = month.split("-").map(Number);
  return `${MONTHS[m - 1]} ${y}.`;
}

// ───────── Naknade ─────────

/** Pravila naknada takmičenja (KM). null = nije određeno. */
export type FeeRules = {
  fee_referee_2_km: number | null;
  fee_referee_3_km: number | null;
  fee_table_km: number | null;
  /** Statistika po osobi (null = nije određeno) */
  fee_stats_km?: number | null;
  fee_commissioner_km: number | null;
  /** Zapisničar kad je digitalni zapisnik (null = kao sto) */
  fee_digital_km?: number | null;
};

const TABLE: Position[] = ["scorer", "assistant_scorer", "timer", "assistant_timer", "shot_clock", "timer_shot_clock"];
const STATS: Position[] = ["statistician_1", "statistician_2", "statistician_3"];

/** Naknada jedne osobe na utakmici: sudija zavisi od toga sude li dvojica ili trojica; zapisničar s digitalnim zapisnikom ima svoju cijenu */
export function feeFor(position: Position, refereeCount: number, rules: FeeRules | null, digital = false): number | null {
  if (!rules) return null;
  if (position === "scorer" && digital && rules.fee_digital_km != null) return Number(rules.fee_digital_km);
  const v =
    position === "commissioner"
      ? rules.fee_commissioner_km
      : STATS.includes(position)
        ? (rules.fee_stats_km ?? null)
        : TABLE.includes(position)
          ? rules.fee_table_km
          : refereeCount === 3
            ? rules.fee_referee_3_km
            : rules.fee_referee_2_km;
  return v == null ? null : Number(v);
}

export type CostLine = { label: string; count: number; unit: number | null; total: number | null };

/** Trošak utakmice po pravilima takmičenja i sastavu: sudije, sto, statistika, komesar */
export function matchCost(rules: FeeRules | null, crew: Crew) {
  const refereeCount = crew.refereeCount;
  // Digitalni zapisnik sa svojom cijenom ide kao poseban red, ostatak stola po cijeni stola
  const digitalScorer = crew.scorer && crew.digital && rules?.fee_digital_km != null;
  const tableCount = [crew.scorer && !digitalScorer, crew.assistantScorer, crew.timer, crew.assistantTimer, crew.shotClock, crew.timerShotClock].filter(Boolean).length;
  const line = (label: string, count: number, unit: number | null): CostLine => ({
    label,
    count,
    unit,
    total: unit == null ? null : round2(unit * count),
  });
  const lines = [
    crew.referees && line(refereeCount === 3 ? "Sudije (trojka)" : "Sudije (dvojka)", refereeCount, feeFor("referee_1", refereeCount, rules)),
    digitalScorer && line("Dig. zapisnik", 1, feeFor("scorer", refereeCount, rules, true)),
    tableCount > 0 && line("Zapisnički sto", tableCount, feeFor("timer", refereeCount, rules)),
    crew.stats > 0 && line("Statistika", crew.stats, feeFor("statistician_1", refereeCount, rules)),
    crew.commissioner && line("Komesar", 1, feeFor("commissioner", refereeCount, rules)),
  ].filter((l): l is CostLine => Boolean(l));
  return {
    lines,
    total: round2(lines.reduce((s, l) => s + (l.total ?? 0), 0)),
    missing: lines.some((l) => l.unit == null),
  };
}

export type PayrollAssignment = {
  id: string;
  position: Position;
  paid_at: string | null;
  profile: { id: string; full_name: string };
  match: {
    id: string;
    number: number;
    starts_at: string;
    referee_count: number;
    digital_scoresheet: boolean;
    kind: MatchKind;
    kind_label: string | null;
    competition: ({ name: string; short_name: string | null } & FeeRules) | null;
    home: TeamIdentity | null;
    away: TeamIdentity | null;
  };
};

export type PayrollItem = {
  assignmentId: string;
  matchId: string;
  number: number;
  startsAt: string;
  competition: string;
  /** "Prijateljska", "Turnir", vlastiti naziv; prazno za ligu */
  kind: string;
  teams: string;
  home: TeamIdentity | null;
  away: TeamIdentity | null;
  position: Position;
  refereeCount: number;
  /** null = naknada za takmičenje i poziciju nije određena */
  amount: number | null;
  paidAt: string | null;
};

export type PayrollPerson = {
  profileId: string;
  name: string;
  items: PayrollItem[];
  /** Zarađeno (sve stavke s određenom cijenom) */
  total: number;
  paid: number;
  /** Duguje se */
  unpaid: number;
  unpaidCount: number;
  /** Stavke bez određene cijene */
  missing: number;
};

// ───────── Filteri obračuna ─────────

export type PositionGroup = "referees" | "table" | "commissioners";

export const POSITION_GROUP_LABEL: Record<PositionGroup, string> = {
  referees: "Sudije",
  table: "Pomoćne sudije",
  commissioners: "Komesari",
};

export function positionGroup(position: Position): PositionGroup {
  if (position === "commissioner") return "commissioners";
  return TABLE.includes(position) || STATS.includes(position) ? "table" : "referees";
}

export type PaidFilter = "paid" | "unpaid";

export type PayrollFilter = { group?: PositionGroup; paid?: PaidFilter; q?: string };

/** Pretraga bez obzira na velika slova i dijakritike (spars = Spars, cosic = Ćosić) */
function fold(s: string) {
  return s.normalize("NFD").replace(/\p{M}/gu, "").replace(/đ/g, "dj").replace(/Đ/g, "dj").toLowerCase();
}

/** Filtrira delegiranja prije obračuna: grupa pozicija, isplaćeno/neisplaćeno, tekst (osoba, ekipa, takmičenje, broj utakmice) */
export function filterPayroll<A extends PayrollAssignment>(rows: A[], f: PayrollFilter): A[] {
  const words = f.q ? fold(f.q).split(/\s+/).filter(Boolean) : [];
  return rows.filter((a) => {
    if (f.group && positionGroup(a.position) !== f.group) return false;
    if (f.paid === "paid" && !a.paid_at) return false;
    if (f.paid === "unpaid" && a.paid_at) return false;
    if (words.length === 0) return true;
    const hay = fold(
      [
        a.profile.full_name,
        a.match.home?.name,
        a.match.away?.name,
        a.match.competition?.name,
        a.match.competition?.short_name,
        a.match.kind_label,
        String(a.match.number),
        `utakmica ${a.match.number}`,
      ]
        .filter(Boolean)
        .join(" "),
    );
    return words.every((w) => hay.includes(w));
  });
}

/** Filteri iz adrese: ?grupa=sudije|sto|komesari&isplata=isplaceno|neisplaceno&q=spars */
export function parsePayrollFilter(sp: Record<string, string | string[] | undefined>): PayrollFilter {
  const one = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  const group = ({ sudije: "referees", sto: "table", komesari: "commissioners" } as const)[one("grupa") as "sudije" | "sto" | "komesari"];
  const paid = ({ isplaceno: "paid", neisplaceno: "unpaid" } as const)[one("isplata") as "isplaceno" | "neisplaceno"];
  const q = one("q")?.trim().slice(0, 80) || undefined;
  return { group, paid, q };
}

export function computePayroll(assignments: PayrollAssignment[]): PayrollPerson[] {
  const people = new Map<string, PayrollPerson>();

  for (const a of assignments) {
    const person = people.get(a.profile.id) ?? {
      profileId: a.profile.id,
      name: a.profile.full_name,
      items: [],
      total: 0,
      paid: 0,
      unpaid: 0,
      unpaidCount: 0,
      missing: 0,
    };
    const amount = feeFor(a.position, a.match.referee_count, a.match.competition, a.match.digital_scoresheet);
    person.items.push({
      assignmentId: a.id,
      matchId: a.match.id,
      number: a.match.number,
      startsAt: a.match.starts_at,
      competition: a.match.competition?.short_name ?? a.match.competition?.name ?? "",
      kind: matchKindLabel(a.match.kind, a.match.kind_label),
      teams: `${a.match.home?.name ?? ""} – ${a.match.away?.name ?? ""}`,
      home: a.match.home,
      away: a.match.away,
      position: a.position,
      refereeCount: a.match.referee_count,
      amount,
      paidAt: a.paid_at,
    });
    if (!a.paid_at) person.unpaidCount++;
    if (amount == null) person.missing++;
    else {
      person.total = round2(person.total + amount);
      if (a.paid_at) person.paid = round2(person.paid + amount);
      else person.unpaid = round2(person.unpaid + amount);
    }
    people.set(a.profile.id, person);
  }

  for (const p of people.values()) {
    p.items.sort((x, y) => x.startsAt.localeCompare(y.startsAt) || POSITION_ORDER.indexOf(x.position) - POSITION_ORDER.indexOf(y.position));
  }
  return [...people.values()].sort((a, b) => a.name.localeCompare(b.name, "bs"));
}

/** Zbir preko svih osoba */
export function payrollTotals(people: PayrollPerson[]) {
  return people.reduce(
    (t, p) => ({
      total: round2(t.total + p.total),
      paid: round2(t.paid + p.paid),
      unpaid: round2(t.unpaid + p.unpaid),
      items: t.items + p.items.length,
      unpaidItems: t.unpaidItems + p.unpaidCount,
    }),
    { total: 0, paid: 0, unpaid: 0, items: 0, unpaidItems: 0 },
  );
}

// ───────── CSV (Excel: UTF-8 BOM, separator ;) ─────────

function csvCell(v: string | number | null) {
  if (v == null) return "";
  const s = typeof v === "number" ? String(v).replace(".", ",") : v;
  return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(rows: (string | number | null)[][]) {
  return "﻿" + rows.map((r) => r.map(csvCell).join(";")).join("\r\n") + "\r\n";
}

export function payrollCsv(people: PayrollPerson[], formatDay: (iso: string) => string) {
  const rows: (string | number | null)[][] = [["Ime i prezime", "Br. utakmice", "Datum", "Takmičenje", "Utakmica", "Pozicija", "Naknada (KM)", "Isplaćeno"]];
  for (const p of people) {
    for (const i of p.items) {
      rows.push([p.name, i.number, formatDay(i.startsAt), i.kind ? `${i.competition} (${i.kind})` : i.competition, i.teams, POSITION_LABEL[i.position], i.amount, i.paidAt ? formatDay(i.paidAt) : "ne"]);
    }
    rows.push([p.name, null, null, null, null, "Ukupno", p.total, null]);
    rows.push([p.name, null, null, null, null, "Duguje se", p.unpaid, null]);
  }
  return toCsv(rows);
}

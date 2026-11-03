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
  /** Zapisničar (null = kao sto) */
  fee_scorer_km?: number | null;
  /** Zapisničar kad je digitalni zapisnik (null = kao zapisničar) */
  fee_digital_km?: number | null;
};

const TABLE: Position[] = ["scorer", "assistant_scorer", "timer", "assistant_timer", "shot_clock", "timer_shot_clock"];
const STATS: Position[] = ["statistician_1", "statistician_2", "statistician_3"];

/** Naknada jedne osobe na utakmici: sudija zavisi od toga sude li dvojica ili trojica; zapisničar (i digitalni zapisnik) može imati svoju cijenu */
export function feeFor(position: Position, refereeCount: number, rules: FeeRules | null, digital = false): number | null {
  if (!rules) return null;
  if (position === "scorer" && digital && rules.fee_digital_km != null) return Number(rules.fee_digital_km);
  if (position === "scorer" && rules.fee_scorer_km != null) return Number(rules.fee_scorer_km);
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

/**
 * Trošak utakmice po pravilima takmičenja i sastavu: sudije, sto, statistika, komesar.
 * `fees`: ručne naknade delegiranja po poziciji (npr. turnir škola), imaju prednost nad pravilom.
 */
export function matchCost(rules: FeeRules | null, crew: Crew, fees: Partial<Record<Position, number>> = {}) {
  const refereeCount = crew.refereeCount;
  // Zapisničar sa svojom cijenom (običan ili digitalni zapisnik) ide kao poseban red, ostatak stola po cijeni stola
  const ownScorer = crew.scorer && ((crew.digital && rules?.fee_digital_km != null) || rules?.fee_scorer_km != null);
  const table = [
    crew.scorer && !ownScorer && "scorer",
    crew.assistantScorer && "assistant_scorer",
    crew.timer && "timer",
    crew.assistantTimer && "assistant_timer",
    crew.shotClock && "shot_clock",
    crew.timerShotClock && "timer_shot_clock",
  ].filter((p): p is Position => Boolean(p));
  // Red iz pozicija; jedinična cijena samo kad je ista za sve (ručne naknade mogu biti različite)
  const line = (label: string, positions: Position[]): CostLine => {
    const units = positions.map((p) => fees[p] ?? feeFor(p, refereeCount, rules, crew.digital));
    const missing = units.some((u) => u == null);
    const same = units.every((u) => u === units[0]);
    return {
      label,
      count: positions.length,
      unit: missing || !same ? null : units[0],
      total: missing ? null : round2(units.reduce<number>((s, u) => s + u!, 0)),
    };
  };
  const referees: Position[] = ["referee_1", "referee_2", "referee_3"].slice(0, refereeCount) as Position[];
  const lines = [
    crew.referees && line(refereeCount === 3 ? "Sudije (trojka)" : "Sudije (dvojka)", referees),
    ownScorer && line(crew.digital ? "Dig. zapisnik" : "Zapisničar", ["scorer"]),
    table.length > 0 && line("Zapisnički sto", table),
    crew.stats > 0 && line("Statistika", STATS.slice(0, crew.stats)),
    crew.commissioner && line("Komesar", ["commissioner"]),
  ].filter((l): l is CostLine => Boolean(l));
  return {
    lines,
    total: round2(lines.reduce((s, l) => s + (l.total ?? 0), 0)),
    missing: lines.some((l) => l.total == null),
  };
}

export type PayrollAssignment = {
  id: string;
  position: Position;
  paid_at: string | null;
  /** Ručna naknada za ovo delegiranje (null = po pravilu takmičenja) */
  fee_km: number | null;
  profile: { id: string; full_name: string };
  match: {
    id: string;
    number: number;
    starts_at: string;
    /** Kolo u takmičenju (null = bez kola, npr. prijateljska) */
    round: number | null;
    referee_count: number;
    digital_scoresheet: boolean;
    kind: MatchKind;
    kind_label: string | null;
    competition: ({ name: string; short_name: string | null; category: string; sort: number } & FeeRules) | null;
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
  /** Cijena po pravilu takmičenja (bez ručne izmjene) */
  ruleAmount: number | null;
  /** Cijena je ručno određena za ovu utakmicu */
  custom: boolean;
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

export type PayrollFilter = { group?: PositionGroup; paid?: PaidFilter; q?: string; selection?: string; round?: number };

/** Pretraga bez obzira na velika slova i dijakritike (spars = Spars, cosic = Ćosić) */
function fold(s: string) {
  return s.normalize("NFD").replace(/\p{M}/gu, "").replace(/đ/g, "dj").replace(/Đ/g, "dj").toLowerCase();
}

/** Slug za URL: "Pioniri G1" → "pioniri-g1", "srednje škole" → "srednje-skole" */
function slugify(s: string) {
  return fold(s).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

/** Utakmice bez takmičenja (prijateljske, turniri) */
const OTHER_SELECTION = "ostalo";

/** Pripada li delegiranje selekciji: cijela kategorija ("pioniri") ili jedno takmičenje ("pioniri-g1") */
function inSelection(c: PayrollAssignment["match"]["competition"], selection: string) {
  if (!c) return selection === OTHER_SELECTION;
  return slugify(c.category) === selection || slugify(c.short_name ?? c.name) === selection;
}

export type PayrollSelection = { value: string; label: string; competitions: { value: string; label: string }[] };

/** Selekcije za filter, iz delegiranja perioda: kategorija (Pioniri) s takmičenjima (Pioniri G1, G2), redom takmičenja */
export function payrollSelections(rows: PayrollAssignment[]): PayrollSelection[] {
  // Svako takmičenje jednom, po redoslijedu; kategorija dolazi na mjesto svog prvog takmičenja
  const competitions = new Map<string, NonNullable<PayrollAssignment["match"]["competition"]>>();
  let other = false;
  for (const { match } of rows) {
    if (match.competition) competitions.set(slugify(match.competition.short_name ?? match.competition.name), match.competition);
    else other = true;
  }
  const categories = new Map<string, PayrollSelection>();
  for (const [value, c] of [...competitions].sort((x, y) => x[1].sort - y[1].sort)) {
    const key = slugify(c.category);
    const cat = categories.get(key) ?? { value: key, label: c.category.charAt(0).toUpperCase() + c.category.slice(1), competitions: [] };
    cat.competitions.push({ value, label: c.short_name ?? c.name });
    categories.set(key, cat);
  }
  const list = [...categories.values()];
  return other ? [...list, { value: OTHER_SELECTION, label: "Ostalo", competitions: [] }] : list;
}

/** Kola za filter: ona koja postoje u delegiranjima izabrane selekcije (ili svih), rastuće */
export function payrollRounds(rows: PayrollAssignment[], selection?: string): number[] {
  const set = new Set<number>();
  for (const { match } of rows) {
    if (match.round && (!selection || inSelection(match.competition, selection))) set.add(match.round);
  }
  return [...set].sort((a, b) => a - b);
}

/** Filtrira delegiranja prije obračuna: grupa pozicija, isplaćeno/neisplaćeno, tekst (osoba, ekipa, takmičenje, broj utakmice) */
export function filterPayroll<A extends PayrollAssignment>(rows: A[], f: PayrollFilter): A[] {
  const words = f.q ? fold(f.q).split(/\s+/).filter(Boolean) : [];
  return rows.filter((a) => {
    if (f.group && positionGroup(a.position) !== f.group) return false;
    if (f.paid === "paid" && !a.paid_at) return false;
    if (f.paid === "unpaid" && a.paid_at) return false;
    if (f.selection && !inSelection(a.match.competition, f.selection)) return false;
    if (f.round && a.match.round !== f.round) return false;
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

/** Filteri iz adrese: ?grupa=sudije|sto|komesari&isplata=isplaceno|neisplaceno&selekcija=pioniri|pioniri-g1&kolo=1&q=spars */
export function parsePayrollFilter(sp: Record<string, string | string[] | undefined>): PayrollFilter {
  const one = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  const group = ({ sudije: "referees", sto: "table", komesari: "commissioners" } as const)[one("grupa") as "sudije" | "sto" | "komesari"];
  const paid = ({ isplaceno: "paid", neisplaceno: "unpaid" } as const)[one("isplata") as "isplaceno" | "neisplaceno"];
  const q = one("q")?.trim().slice(0, 80) || undefined;
  const selection = one("selekcija")?.trim().slice(0, 60) || undefined;
  const kolo = Number(one("kolo"));
  const round = Number.isInteger(kolo) && kolo > 0 && kolo < 1000 ? kolo : undefined;
  return { group, paid, q, selection, round };
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
    const ruleAmount = feeFor(a.position, a.match.referee_count, a.match.competition, a.match.digital_scoresheet);
    const custom = a.fee_km != null;
    const amount = custom ? Number(a.fee_km) : ruleAmount;
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
      ruleAmount,
      custom,
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
    // Najnovije utakmice prvo (korisnik, 2026-10-17); unutar utakmice po poziciji
    p.items.sort((x, y) => y.startsAt.localeCompare(x.startsAt) || POSITION_ORDER.indexOf(x.position) - POSITION_ORDER.indexOf(y.position));
  }
  return [...people.values()].sort((a, b) => a.name.localeCompare(b.name, "bs"));
}

export type PayrollMatch = {
  matchId: string;
  number: number;
  startsAt: string;
  competition: string;
  kind: string;
  home: TeamIdentity | null;
  away: TeamIdentity | null;
  /** Stavke svih osoba na utakmici, po poziciji */
  items: (PayrollItem & { name: string })[];
  total: number;
  paid: number;
  unpaid: number;
  unpaidCount: number;
};

/** Isti obračun grupisan po utakmici (za isplatu cijele utakmice odjednom) */
export function payrollByMatch(people: PayrollPerson[]): PayrollMatch[] {
  const matches = new Map<string, PayrollMatch>();
  for (const p of people) {
    for (const i of p.items) {
      const m = matches.get(i.matchId) ?? {
        matchId: i.matchId,
        number: i.number,
        startsAt: i.startsAt,
        competition: i.competition,
        kind: i.kind,
        home: i.home,
        away: i.away,
        items: [],
        total: 0,
        paid: 0,
        unpaid: 0,
        unpaidCount: 0,
      };
      m.items.push({ ...i, name: p.name });
      if (!i.paidAt) m.unpaidCount++;
      if (i.amount != null) {
        m.total = round2(m.total + i.amount);
        if (i.paidAt) m.paid = round2(m.paid + i.amount);
        else m.unpaid = round2(m.unpaid + i.amount);
      }
      matches.set(i.matchId, m);
    }
  }
  for (const m of matches.values()) m.items.sort((x, y) => POSITION_ORDER.indexOf(x.position) - POSITION_ORDER.indexOf(y.position));
  // Najnovije utakmice prvo (korisnik, 2026-10-17)
  return [...matches.values()].sort((a, b) => b.startsAt.localeCompare(a.startsAt) || b.number - a.number);
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

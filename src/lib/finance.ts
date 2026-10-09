// Čisti proračuni za kotizacije i naknade (bez Next-a i baze, testabilno).
import { MONTHS, POSITION_LABEL, POSITION_ORDER, sarajevoToISO, type Position } from "@/lib/format";

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
  fee_commissioner_km: number | null;
};

const TABLE: Position[] = ["scorer", "timer", "shot_clock"];

/** Naknada jedne osobe na utakmici: sudija zavisi od toga sude li dvojica ili trojica */
export function feeFor(position: Position, refereeCount: number, rules: FeeRules | null): number | null {
  if (!rules) return null;
  const v =
    position === "commissioner"
      ? rules.fee_commissioner_km
      : TABLE.includes(position)
        ? rules.fee_table_km
        : refereeCount === 3
          ? rules.fee_referee_3_km
          : rules.fee_referee_2_km;
  return v == null ? null : Number(v);
}

export type CostLine = { label: string; count: number; unit: number | null; total: number | null };

/** Trošak utakmice po pravilima takmičenja: sudije, sto, komesar */
export function matchCost(rules: FeeRules | null, refereeCount: number, tableCount: number) {
  const line = (label: string, count: number, unit: number | null): CostLine => ({
    label,
    count,
    unit,
    total: unit == null ? null : round2(unit * count),
  });
  const lines = [
    line(refereeCount === 3 ? "Sudije (trojka)" : "Sudije (dvojka)", refereeCount, feeFor("referee_1", refereeCount, rules)),
    line("Zapisnički sto", tableCount, feeFor("scorer", refereeCount, rules)),
    line("Komesar", 1, feeFor("commissioner", refereeCount, rules)),
  ];
  return {
    lines,
    total: round2(lines.reduce((s, l) => s + (l.total ?? 0), 0)),
    missing: lines.some((l) => l.unit == null),
  };
}

export type PayrollAssignment = {
  position: Position;
  profile: { id: string; full_name: string };
  match: {
    id: string;
    starts_at: string;
    referee_count: number;
    competition: ({ name: string; short_name: string | null } & FeeRules) | null;
    home: { name: string } | null;
    away: { name: string } | null;
  };
};

export type PayrollItem = {
  matchId: string;
  startsAt: string;
  competition: string;
  teams: string;
  position: Position;
  refereeCount: number;
  /** null = naknada za takmičenje i poziciju nije određena */
  amount: number | null;
};

export type PayrollPerson = {
  profileId: string;
  name: string;
  items: PayrollItem[];
  total: number;
  missing: number;
};

export function computePayroll(assignments: PayrollAssignment[]): PayrollPerson[] {
  const people = new Map<string, PayrollPerson>();

  for (const a of assignments) {
    const person = people.get(a.profile.id) ?? {
      profileId: a.profile.id,
      name: a.profile.full_name,
      items: [],
      total: 0,
      missing: 0,
    };
    const amount = feeFor(a.position, a.match.referee_count, a.match.competition);
    person.items.push({
      matchId: a.match.id,
      startsAt: a.match.starts_at,
      competition: a.match.competition?.short_name ?? a.match.competition?.name ?? "",
      teams: `${a.match.home?.name ?? ""} – ${a.match.away?.name ?? ""}`,
      position: a.position,
      refereeCount: a.match.referee_count,
      amount,
    });
    if (amount == null) person.missing++;
    else person.total = round2(person.total + amount);
    people.set(a.profile.id, person);
  }

  for (const p of people.values()) {
    p.items.sort((x, y) => x.startsAt.localeCompare(y.startsAt) || POSITION_ORDER.indexOf(x.position) - POSITION_ORDER.indexOf(y.position));
  }
  return [...people.values()].sort((a, b) => a.name.localeCompare(b.name, "bs"));
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
  const rows: (string | number | null)[][] = [["Ime i prezime", "Datum", "Takmičenje", "Utakmica", "Pozicija", "Naknada (KM)"]];
  for (const p of people) {
    for (const i of p.items) {
      rows.push([p.name, formatDay(i.startsAt), i.competition, i.teams, POSITION_LABEL[i.position], i.amount]);
    }
    rows.push([p.name, null, null, null, "Ukupno", p.total]);
  }
  return toCsv(rows);
}

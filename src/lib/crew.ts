// Sastav ekipe utakmice: ko se delegira (sudije, komesar, pomoćne sudije za stolom, statistika).
// Jedini izvor istine za pozicije utakmice; čista logika (bez Next-a i baze).
//  * Omladinska liga: sve pozicije u jednoj nominaciji
//  * Seniori (takmičenje sa split_nominations): sudije + komesar i pomoćne sudije su dvije odvojene nominacije
import type { Position } from "@/lib/format";

/** Seniorska takmičenja: delegiranje da, tabela i kotizacija ne (vodi ih viši savez) */
export const SENIOR_CATEGORIES = ["seniori", "seniorke"] as const;

export type Crew = {
  /** Sudije se delegiraju (seniori: ponekad samo sto) */
  referees: boolean;
  refereeCount: 2 | 3;
  commissioner: boolean;
  scorer: boolean;
  assistantScorer: boolean;
  timer: boolean;
  /** Pomoćni semafor (ABA liga): pomoćna sudija uz glavno vrijeme */
  assistantTimer: boolean;
  shotClock: boolean;
  /** Jedna osoba za glavno vrijeme i 24/14 (omladinska liga) */
  timerShotClock: boolean;
  /** Statistika: 0–3 osobe (EuroCup 3, domaće seniorske lige 2) */
  stats: 0 | 1 | 2 | 3;
  /** Digitalni zapisnik: zapisničar se ispisuje kao "Dig. zapisnik" */
  digital: boolean;
};

/** Kolone sastava na utakmici (za selecte) */
export const CREW_COLUMNS =
  "has_referees, referee_count, has_commissioner, has_scorer, has_assistant_scorer, has_timer, has_assistant_timer, has_shot_clock, has_timer_shot_clock, stats_count, digital_scoresheet" as const;

/** Kolone podrazumijevanog sastava na takmičenju */
export const CREW_DEFAULT_COLUMNS =
  "referees_default, referee_count_default, commissioner_default, scorer_default, assistant_scorer_default, timer_default, assistant_timer_default, shot_clock_default, timer_shot_clock_default, stats_default, digital_default, split_nominations" as const;

type CrewRow = {
  has_referees: boolean;
  referee_count: number;
  has_commissioner: boolean;
  has_scorer: boolean;
  has_assistant_scorer: boolean;
  has_timer: boolean;
  has_assistant_timer: boolean;
  has_shot_clock: boolean;
  has_timer_shot_clock: boolean;
  stats_count: number;
  digital_scoresheet: boolean;
};

type CrewDefaultsRow = {
  referees_default: boolean;
  referee_count_default: number;
  commissioner_default: boolean;
  scorer_default: boolean;
  assistant_scorer_default: boolean;
  timer_default: boolean;
  assistant_timer_default: boolean;
  shot_clock_default: boolean;
  timer_shot_clock_default: boolean;
  stats_default: number;
  digital_default: boolean;
};

const stats = (n: number) => (Math.min(3, Math.max(0, n)) as Crew["stats"]);

export function crewOf(m: CrewRow): Crew {
  return {
    referees: m.has_referees,
    refereeCount: m.referee_count === 3 ? 3 : 2,
    commissioner: m.has_commissioner,
    scorer: m.has_scorer,
    assistantScorer: m.has_assistant_scorer,
    timer: m.has_timer,
    assistantTimer: m.has_assistant_timer,
    shotClock: m.has_shot_clock,
    timerShotClock: m.has_timer_shot_clock,
    stats: stats(m.stats_count),
    digital: m.digital_scoresheet,
  };
}

export function crewDefaultsOf(c: CrewDefaultsRow): Crew {
  return {
    referees: c.referees_default,
    refereeCount: c.referee_count_default === 3 ? 3 : 2,
    commissioner: c.commissioner_default,
    scorer: c.scorer_default,
    assistantScorer: c.assistant_scorer_default,
    timer: c.timer_default,
    assistantTimer: c.assistant_timer_default,
    shotClock: c.shot_clock_default,
    timerShotClock: c.timer_shot_clock_default,
    stats: stats(c.stats_default),
    digital: c.digital_default,
  };
}

/** Sastav → kolone utakmice (insert/update) */
export function crewToRow(c: Crew) {
  return {
    has_referees: c.referees,
    referee_count: c.refereeCount,
    has_commissioner: c.commissioner,
    has_scorer: c.scorer,
    has_assistant_scorer: c.assistantScorer,
    has_timer: c.timer,
    has_assistant_timer: c.assistantTimer,
    has_shot_clock: c.shotClock,
    has_timer_shot_clock: c.timerShotClock,
    stats_count: c.stats,
    digital_scoresheet: c.digital,
    // Stara kolona (uklanja se kasnije): broj ljudi za glavnim stolom bez statistike
    table_count: c.shotClock ? 3 : 2,
  };
}

/** Sastav → podrazumijevane kolone takmičenja */
export function crewToDefaults(c: Crew) {
  return {
    referees_default: c.referees,
    referee_count_default: c.refereeCount,
    commissioner_default: c.commissioner,
    scorer_default: c.scorer,
    assistant_scorer_default: c.assistantScorer,
    timer_default: c.timer,
    assistant_timer_default: c.assistantTimer,
    shot_clock_default: c.shotClock,
    timer_shot_clock_default: c.timerShotClock,
    stats_default: c.stats,
    digital_default: c.digital,
    table_count_default: c.shotClock ? 3 : 2,
  };
}

/** Sastav iz forme (polja crew_*; vidi CrewEditor) */
export function crewFromForm(f: FormData): Crew {
  const on = (k: string) => f.get(`crew_${k}`) === "1";
  return {
    referees: on("referees"),
    refereeCount: f.get("crew_referee_count") === "3" ? 3 : 2,
    commissioner: on("commissioner"),
    scorer: on("scorer"),
    assistantScorer: on("assistant_scorer"),
    timer: on("timer"),
    assistantTimer: on("assistant_timer"),
    shotClock: on("shot_clock"),
    timerShotClock: on("timer_shot_clock"),
    stats: stats(Number(f.get("crew_stats") ?? 0) || 0),
    digital: on("digital"),
  };
}

// ───────── Pozicije ─────────

export type NominationGroup = "officials" | "table";

/** Sudije i komesar vs pomoćne sudije (sto + statistika) */
export function nominationGroupOf(position: Position): NominationGroup {
  return position.startsWith("referee") || position === "commissioner" ? "officials" : "table";
}

export const NOMINATION_GROUP_LABEL: Record<NominationGroup, string> = {
  officials: "Sudije i komesar",
  table: "Pomoćne sudije",
};

/** Pozicije koje utakmica treba, redom kao u nominaciji */
export function crewPositions(c: Crew): Position[] {
  const list: Position[] = [];
  if (c.commissioner) list.push("commissioner");
  if (c.referees) list.push("referee_1", "referee_2", ...(c.refereeCount === 3 ? (["referee_3"] as const) : []));
  if (c.scorer) list.push("scorer");
  if (c.assistantScorer) list.push("assistant_scorer");
  if (c.timer) list.push("timer");
  if (c.assistantTimer) list.push("assistant_timer");
  if (c.shotClock) list.push("shot_clock");
  if (c.timerShotClock) list.push("timer_shot_clock");
  if (c.stats >= 1) list.push("statistician_1");
  if (c.stats >= 2) list.push("statistician_2");
  if (c.stats >= 3) list.push("statistician_3");
  return list;
}

/**
 * Sastav bez jedne pozicije (uklanjanje prazne pozicije sa utakmice, npr. samo sudije bez stola):
 * sudije 3 → 2 → bez sudija, statistika jedna manje, ostale pozicije se isključe. Vraćanje: uređivač sastava.
 */
export function crewWithout(c: Crew, position: Position): Crew {
  switch (position) {
    case "referee_1":
    case "referee_2":
    case "referee_3":
      return c.refereeCount === 3 ? { ...c, refereeCount: 2 } : { ...c, referees: false };
    case "statistician_1":
    case "statistician_2":
    case "statistician_3":
      return { ...c, stats: stats(c.stats - 1) };
    case "commissioner":
      return { ...c, commissioner: false };
    case "scorer":
      return { ...c, scorer: false };
    case "assistant_scorer":
      return { ...c, assistantScorer: false };
    case "timer":
      return { ...c, timer: false };
    case "assistant_timer":
      return { ...c, assistantTimer: false };
    case "shot_clock":
      return { ...c, shotClock: false };
    case "timer_shot_clock":
      return { ...c, timerShotClock: false };
  }
}

/**
 * Sastav s dodatom pozicijom (dodavanje na utakmici, "Dodaj poziciju"): sudije se uključe (3. sudija = trojka),
 * statistika do tog broja, ostale pozicije se uključe.
 */
export function crewWithPosition(c: Crew, position: Position): Crew {
  switch (position) {
    case "referee_1":
    case "referee_2":
      return { ...c, referees: true };
    case "referee_3":
      return { ...c, referees: true, refereeCount: 3 };
    case "statistician_1":
    case "statistician_2":
    case "statistician_3":
      return { ...c, stats: stats(Math.max(c.stats, Number(position.slice(-1)))) };
    case "commissioner":
      return { ...c, commissioner: true };
    case "scorer":
      return { ...c, scorer: true };
    case "assistant_scorer":
      return { ...c, assistantScorer: true };
    case "timer":
      return { ...c, timer: true };
    case "assistant_timer":
      return { ...c, assistantTimer: true };
    case "shot_clock":
      return { ...c, shotClock: true };
    case "timer_shot_clock":
      return { ...c, timerShotClock: true };
  }
}

// ───────── Vještine pomoćnih sudija ─────────

export type TableSkill = "scorer" | "timer" | "shot_clock" | "stats";

export const TABLE_SKILLS: { key: TableSkill; label: string }[] = [
  { key: "scorer", label: "Zapisnik" },
  { key: "timer", label: "Glavno vrijeme" },
  { key: "shot_clock", label: "24/14" },
  { key: "stats", label: "Statistika" },
];

/** Koju vještinu traži pozicija za stolom (null = nije pozicija za stolom); glavno vrijeme–24/14 traži obje, vidi skillsFor */
export function skillFor(position: Position): TableSkill | null {
  if (position === "scorer" || position === "assistant_scorer") return "scorer";
  if (position === "timer" || position === "assistant_timer" || position === "timer_shot_clock") return "timer";
  if (position === "shot_clock") return "shot_clock";
  if (position.startsWith("statistician")) return "stats";
  return null;
}

/** Sve vještine koje pozicija traži (jedna osoba za glavno vrijeme i 24/14 mora znati oboje) */
export function skillsFor(position: Position): TableSkill[] {
  if (position === "timer_shot_clock") return ["timer", "shot_clock"];
  const s = skillFor(position);
  return s ? [s] : [];
}

/** Kratak opis sastava: "3 sudije, komesar, zapisnik, glavno vrijeme, 24/14, 1 statistika" */
export function crewSummary(c: Crew) {
  const parts = [
    c.referees ? `${c.refereeCount} sudije` : "bez sudija",
    c.commissioner && "komesar",
    c.scorer && (c.digital ? "dig. zapisnik" : "zapisnik"),
    c.assistantScorer && "pom. zapisnik",
    c.timer && "glavno vrijeme",
    c.assistantTimer && "pom. semafor",
    c.shotClock && "24/14",
    c.timerShotClock && "glavno vrijeme i 24/14",
    c.stats > 0 && `${c.stats} statistika`,
  ];
  return parts.filter(Boolean).join(", ");
}

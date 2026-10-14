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
  shotClock: boolean;
  stats: 0 | 1 | 2;
  /** Digitalni zapisnik: zapisničar se ispisuje kao "Dig. zapisnik" */
  digital: boolean;
};

/** Kolone sastava na utakmici (za selecte) */
export const CREW_COLUMNS =
  "has_referees, referee_count, has_commissioner, has_scorer, has_assistant_scorer, has_timer, has_shot_clock, stats_count, digital_scoresheet" as const;

/** Kolone podrazumijevanog sastava na takmičenju */
export const CREW_DEFAULT_COLUMNS =
  "referees_default, referee_count_default, commissioner_default, scorer_default, assistant_scorer_default, timer_default, shot_clock_default, stats_default, digital_default, split_nominations" as const;

type CrewRow = {
  has_referees: boolean;
  referee_count: number;
  has_commissioner: boolean;
  has_scorer: boolean;
  has_assistant_scorer: boolean;
  has_timer: boolean;
  has_shot_clock: boolean;
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
  shot_clock_default: boolean;
  stats_default: number;
  digital_default: boolean;
};

const stats = (n: number) => (Math.min(2, Math.max(0, n)) as Crew["stats"]);

export function crewOf(m: CrewRow): Crew {
  return {
    referees: m.has_referees,
    refereeCount: m.referee_count === 3 ? 3 : 2,
    commissioner: m.has_commissioner,
    scorer: m.has_scorer,
    assistantScorer: m.has_assistant_scorer,
    timer: m.has_timer,
    shotClock: m.has_shot_clock,
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
    shotClock: c.shot_clock_default,
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
    has_shot_clock: c.shotClock,
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
    shot_clock_default: c.shotClock,
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
    shotClock: on("shot_clock"),
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
  if (c.shotClock) list.push("shot_clock");
  if (c.stats >= 1) list.push("statistician_1");
  if (c.stats === 2) list.push("statistician_2");
  return list;
}

/** Kratak opis sastava: "3 sudije, komesar, zapisnik, glavno vrijeme, 24/14, 1 statistika" */
export function crewSummary(c: Crew) {
  const parts = [
    c.referees ? `${c.refereeCount} sudije` : "bez sudija",
    c.commissioner && "komesar",
    c.scorer && (c.digital ? "dig. zapisnik" : "zapisnik"),
    c.assistantScorer && "pom. zapisnik",
    c.timer && "glavno vrijeme",
    c.shotClock && "24/14",
    c.stats > 0 && `${c.stats} statistika`,
  ];
  return parts.filter(Boolean).join(", ");
}

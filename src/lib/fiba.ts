// FIBA LiveStats (Genius Sports): javni podaci utakmica koje se vode na FIBA LiveStats.
// Čista logika i fetch (bez baze): feed takmičenja (zadnje i žive utakmice) i cijela utakmica (data.json).
import { sarajevoToISO } from "@/lib/format";

const BASE = "https://fibalivestats.dcd.shared.geniussports.com";

/** Javna stranica utakmice na FIBA LiveStats */
export const fibaGameUrl = (matchId: number) => `${BASE}/u/BIH/${matchId}/`;

/** "https://fibalivestats…/u/BIH/2939998/", "…/data/2939998/data.json" ili samo "2939998" → 2939998 */
export function parseFibaMatchId(input: string): number | null {
  const s = input.trim();
  const m = /^\d{5,9}$/.test(s) ? [s, s] : s.match(/\/(?:u\/[A-Z]+|data)\/(\d{5,9})(?:\/|$)/);
  return m ? Number(m[1]) : null;
}

// ───────── Feed takmičenja ─────────

type FeedRow = {
  competitionId: number;
  matchId: number;
  matchStatus: string;
  matchTime: string; // "2026-10-19 19:00:00", lokalno (Sarajevo)
  live: number;
  homename: string;
  homelogo?: string;
  homescore: string;
  awayname: string;
  awaylogo?: string;
  awayscore: string;
};

export type FibaFeedGame = {
  id: number;
  competition_id: number;
  starts_at: string;
  status: string;
  live: boolean;
  home_name: string;
  away_name: string;
  home_logo: string | null;
  away_logo: string | null;
  home_score: number | null;
  away_score: number | null;
};

const score = (v: string | number | undefined) => (v === undefined || v === "" ? null : Number(v));

/** Zadnje i žive utakmice takmičenja (FIBA vraća samo trenutni krug, ne cijeli raspored) */
export async function fetchCompetitionFeed(competitionId: number): Promise<FibaFeedGame[]> {
  const res = await fetch(`${BASE}/data/competition/${competitionId}.json`, { cache: "no-store" });
  if (!res.ok) return [];
  const rows = (await res.json().catch(() => [])) as FeedRow[];
  if (!Array.isArray(rows)) return [];
  return rows.map((r) => {
    const [date, time] = r.matchTime.split(" ");
    const notStarted = r.matchStatus === "SCHEDULED" || r.matchStatus === "READY";
    return {
      id: r.matchId,
      competition_id: competitionId,
      starts_at: sarajevoToISO(date, time.slice(0, 5)),
      status: r.matchStatus,
      live: r.live === 1,
      home_name: r.homename,
      away_name: r.awayname,
      home_logo: r.homelogo || null,
      away_logo: r.awaylogo || null,
      home_score: notStarted ? null : score(r.homescore),
      away_score: notStarted ? null : score(r.awayscore),
    };
  });
}

// ───────── Cijela utakmica ─────────

type RawPerson = { name?: string; firstName?: string; familyName?: string };

type RawPlayer = RawPerson & {
  shirtNumber: string;
  playingPosition?: string;
  starter: number;
  captain?: number;
  active: number;
  sMinutes: string;
  sPoints: number;
  sFieldGoalsMade: number;
  sFieldGoalsAttempted: number;
  sThreePointersMade: number;
  sThreePointersAttempted: number;
  sFreeThrowsMade: number;
  sFreeThrowsAttempted: number;
  sReboundsOffensive: number;
  sReboundsDefensive: number;
  sReboundsTotal: number;
  sAssists: number;
  sSteals: number;
  sBlocks: number;
  sTurnovers: number;
  sFoulsPersonal: number;
  sFoulsOn?: number;
  sPlusMinusPoints: number;
  eff_1: number;
};

type RawTeam = {
  name: string;
  shortName?: string;
  code?: string;
  score: number;
  logo?: { url?: string };
  coach?: string;
  fouls?: number;
  timeouts?: number;
  pl?: Record<string, RawPlayer>;
  [key: `p${number}_score`]: number | undefined;
  tot_sPoints?: number;
  tot_sFieldGoalsMade?: number;
  tot_sFieldGoalsAttempted?: number;
  tot_sThreePointersMade?: number;
  tot_sThreePointersAttempted?: number;
  tot_sFreeThrowsMade?: number;
  tot_sFreeThrowsAttempted?: number;
  tot_sReboundsOffensive?: number;
  tot_sReboundsDefensive?: number;
  tot_sReboundsTotal?: number;
  tot_sAssists?: number;
  tot_sSteals?: number;
  tot_sBlocks?: number;
  tot_sTurnovers?: number;
  tot_sFoulsPersonal?: number;
  tot_eff_1?: number;
  tot_sPointsInThePaint?: number;
  tot_sPointsFastBreak?: number;
  tot_sPointsSecondChance?: number;
  tot_sPointsFromTurnovers?: number;
  tot_sBenchPoints?: number;
  tot_sBiggestLead?: number;
  tot_sBiggestScoringRun?: number;
  tot_sLeadChanges?: number;
  tot_sTimesScoresLevel?: number;
  tot_sTimeLeading?: number;
};

type RawAction = RawPerson & {
  actionNumber: number;
  actionType: string;
  subType?: string;
  period: number;
  periodType?: string;
  gt: string;
  s1: string;
  s2: string;
  tno: number;
  success: number;
  scoring: number;
  shirtNumber?: string;
  qualifier?: string[];
};

type RawGame = {
  clock: string;
  period: number;
  periodType: string;
  inOT: number;
  periodsMax: number;
  periodLengthREGULAR?: number;
  periodLengthOVERTIME?: number;
  attendance?: number;
  tm: Record<"1" | "2", RawTeam>;
  officials?: Record<string, RawPerson | undefined>;
  pbp?: RawAction[];
};

export type FibaLine = {
  pts: number;
  fgm: number;
  fga: number;
  tpm: number;
  tpa: number;
  ftm: number;
  fta: number;
  oreb: number;
  dreb: number;
  reb: number;
  ast: number;
  stl: number;
  blk: number;
  tov: number;
  pf: number;
  eff: number;
};

export type FibaPlayer = FibaLine & {
  number: string;
  name: string;
  firstName: string | null;
  familyName: string | null;
  /** Iznuđene lične greške */
  fd: number;
  starter: boolean;
  captain: boolean;
  onCourt: boolean;
  minutes: string;
  plusMinus: number;
};

export type FibaTeam = {
  name: string;
  logo: string | null;
  score: number;
  coach: string | null;
  fouls: number | null;
  timeouts: number | null;
  periods: number[];
  players: FibaPlayer[];
  totals: FibaLine;
  /** Poeni iz reketa, kontre, druge šanse, nakon izgubljene lopte, s klupe; najveće vodstvo i serija… (null = FIBA ne vodi) */
  extras: Record<FibaExtra, number | null>;
};

export type FibaExtra = "paint" | "fastBreak" | "secondChance" | "fromTurnovers" | "bench" | "biggestLead" | "biggestRun" | "leadChanges" | "timesTied";

/** Akcija u toku utakmice (play-by-play), od prve do zadnje */
export type FibaAction = {
  n: number;
  period: number;
  /** Preostalo vrijeme perioda "07:43" */
  clock: string;
  /** Sekunde od početka utakmice */
  elapsed: number;
  /** 1 domaćin, 2 gost, 0 bez ekipe (početak/kraj perioda) */
  side: 0 | 1 | 2;
  type: string;
  subType: string;
  success: boolean;
  scoring: boolean;
  player: string | null;
  number: string | null;
  home: number;
  away: number;
};

export type FibaGame = {
  id: number;
  /** Nije počela / u toku / završena */
  state: "scheduled" | "live" | "finished";
  period: number;
  clock: string;
  attendance: number | null;
  home: FibaTeam;
  away: FibaTeam;
  officials: { role: string; name: string }[];
  /** Trajanje četvrtine i produžetka u minutama */
  periodMinutes: { regular: number; overtime: number };
  actions: FibaAction[];
};

const OFFICIALS: [string, string][] = [
  ["referee1", "1. sudija"],
  ["referee2", "2. sudija"],
  ["referee3", "3. sudija"],
  ["commissioner", "Komesar"],
];

const personName = (p: RawPerson) => p.name ?? [p.firstName, p.familyName].filter(Boolean).join(" ");

/** "MEDIN Duskaj" → "Medin Duskaj": riječi pisane velikim slovima dobiju veliko samo prvo slovo */
export function properName(s: string) {
  return s.replace(/\p{L}[\p{L}'’-]*/gu, (w) => (w.length > 1 && w === w.toUpperCase() ? w.charAt(0) + w.slice(1).toLowerCase() : w));
}

/** Puno ime igrača ("Joshua Ola-Joseph"), inače FIBA skraćeno ("J. Ola-Joseph") */
const fullName = (p: RawPerson) => properName([p.firstName, p.familyName].filter(Boolean).join(" ") || p.name || "");

function team(t: RawTeam): FibaTeam {
  const periods: number[] = [];
  for (let i = 1; t[`p${i}_score`] !== undefined; i++) periods.push(Number(t[`p${i}_score`]));
  const players = Object.values(t.pl ?? {})
    .map<FibaPlayer>((p) => ({
      number: p.shirtNumber,
      name: fullName(p),
      firstName: p.firstName || null,
      familyName: p.familyName || null,
      fd: p.sFoulsOn ?? 0,
      starter: p.starter === 1,
      captain: p.captain === 1,
      onCourt: p.active === 1,
      minutes: p.sMinutes || "0:00",
      plusMinus: p.sPlusMinusPoints ?? 0,
      pts: p.sPoints ?? 0,
      fgm: p.sFieldGoalsMade ?? 0,
      fga: p.sFieldGoalsAttempted ?? 0,
      tpm: p.sThreePointersMade ?? 0,
      tpa: p.sThreePointersAttempted ?? 0,
      ftm: p.sFreeThrowsMade ?? 0,
      fta: p.sFreeThrowsAttempted ?? 0,
      oreb: p.sReboundsOffensive ?? 0,
      dreb: p.sReboundsDefensive ?? 0,
      reb: p.sReboundsTotal ?? 0,
      ast: p.sAssists ?? 0,
      stl: p.sSteals ?? 0,
      blk: p.sBlocks ?? 0,
      tov: p.sTurnovers ?? 0,
      pf: p.sFoulsPersonal ?? 0,
      eff: p.eff_1 ?? 0,
    }))
    // Starteri prvi, pa po broju dresa
    .sort((a, b) => Number(b.starter) - Number(a.starter) || Number(a.number) - Number(b.number));
  return {
    name: t.name,
    logo: t.logo?.url ?? null,
    score: Number(t.score ?? 0),
    coach: t.coach || null,
    fouls: t.fouls ?? null,
    timeouts: t.timeouts ?? null,
    periods,
    players,
    totals: {
      pts: t.tot_sPoints ?? 0,
      fgm: t.tot_sFieldGoalsMade ?? 0,
      fga: t.tot_sFieldGoalsAttempted ?? 0,
      tpm: t.tot_sThreePointersMade ?? 0,
      tpa: t.tot_sThreePointersAttempted ?? 0,
      ftm: t.tot_sFreeThrowsMade ?? 0,
      fta: t.tot_sFreeThrowsAttempted ?? 0,
      oreb: t.tot_sReboundsOffensive ?? 0,
      dreb: t.tot_sReboundsDefensive ?? 0,
      reb: t.tot_sReboundsTotal ?? 0,
      ast: t.tot_sAssists ?? 0,
      stl: t.tot_sSteals ?? 0,
      blk: t.tot_sBlocks ?? 0,
      tov: t.tot_sTurnovers ?? 0,
      pf: t.tot_sFoulsPersonal ?? 0,
      eff: t.tot_eff_1 ?? 0,
    },
    extras: {
      paint: t.tot_sPointsInThePaint ?? null,
      fastBreak: t.tot_sPointsFastBreak ?? null,
      secondChance: t.tot_sPointsSecondChance ?? null,
      fromTurnovers: t.tot_sPointsFromTurnovers ?? null,
      bench: t.tot_sBenchPoints ?? null,
      biggestLead: t.tot_sBiggestLead ?? null,
      biggestRun: t.tot_sBiggestScoringRun ?? null,
      leadChanges: t.tot_sLeadChanges ?? null,
      timesTied: t.tot_sTimesScoresLevel ?? null,
    },
  };
}

/** "07:43" → sekunde */
const clockSeconds = (gt: string) => {
  const [m, s] = gt.split(":").map(Number);
  return (m || 0) * 60 + (s || 0);
};

/** Play-by-play od početka (FIBA daje od zadnje akcije); vrijeme od početka utakmice za grafikon toka */
function actions(g: RawGame): FibaAction[] {
  const regular = (g.periodLengthREGULAR ?? 10) * 60;
  const overtime = (g.periodLengthOVERTIME ?? 5) * 60;
  const start = (period: number) => (period <= 4 ? (period - 1) * regular : 4 * regular + (period - 5) * overtime);
  return [...(g.pbp ?? [])]
    .sort((a, b) => a.actionNumber - b.actionNumber)
    .map((a) => {
      const length = a.period <= 4 ? regular : overtime;
      const name = a.firstName || a.familyName ? fullName(a) : null;
      return {
        n: a.actionNumber,
        period: a.period,
        clock: a.gt,
        elapsed: start(a.period) + Math.max(0, length - clockSeconds(a.gt)),
        side: a.tno === 1 || a.tno === 2 ? a.tno : 0,
        type: a.actionType,
        subType: a.subType ?? "",
        success: a.success === 1,
        scoring: a.scoring === 1,
        player: name,
        number: a.shirtNumber || null,
        home: Number(a.s1) || 0,
        away: Number(a.s2) || 0,
      };
    });
}

/** Stanje iz play-by-play: "game end" = završena, bilo koja akcija = u toku */
function stateOf(g: RawGame): FibaGame["state"] {
  const pbp = g.pbp ?? [];
  if (pbp.some((a) => a.actionType === "game" && a.subType === "end")) return "finished";
  return pbp.length > 0 ? "live" : "scheduled";
}

/** Cijela utakmica (null = FIBA je nema ili još nema podataka). `startsAt`: nezatvorena stara utakmica nije "uživo". */
export async function fetchFibaGame(matchId: number, startsAt?: string | null): Promise<FibaGame | null> {
  const res = await fetch(`${BASE}/data/${matchId}/data.json`, { cache: "no-store" });
  if (!res.ok) return null;
  const g = (await res.json().catch(() => null)) as RawGame | null;
  if (!g?.tm?.["1"] || !g.tm["2"]) return null;
  return {
    id: matchId,
    state: stateOf(g) === "live" && startsAt && Date.now() - Date.parse(startsAt) > LIVE_MAX_MS ? "finished" : stateOf(g),
    period: g.period,
    clock: g.clock,
    attendance: g.attendance || null,
    home: team(g.tm["1"]),
    away: team(g.tm["2"]),
    officials: OFFICIALS.flatMap(([key, role]) => {
      const p = g.officials?.[key];
      const name = p && personName(p);
      return name ? [{ role, name: properName(name) }] : [];
    }),
    periodMinutes: { regular: g.periodLengthREGULAR ?? 10, overtime: g.periodLengthOVERTIME ?? 5 },
    actions: actions(g),
  };
}

/** Utakmica koja je "u toku" duže od ovoga je zapravo završena (zapisničar je nije zatvorio u LiveStats) */
const LIVE_MAX_MS = 4 * 60 * 60 * 1000;

/** Status iz feeda → stanje (FIBA: SCHEDULED, READY, IN_PROGRESS, COMPLETE, FINISHED…) */
export function feedState(status: string, live: boolean, startsAt?: string | null): FibaGame["state"] {
  if (status === "COMPLETE" || status === "FINISHED" || status === "CONFIRMED") return "finished";
  if (live || status === "IN_PROGRESS") return startsAt && Date.now() - Date.parse(startsAt) > LIVE_MAX_MS ? "finished" : "live";
  return "scheduled";
}

/** Lige i kategorije na stranici FIBA uživo, redom za filter (seniori po takmičenju, omladinska liga KS po kategoriji) */
export const FIBA_CATEGORIES = [
  { key: "plbih", label: "Premijer liga" },
  { key: "plbih_z", label: "Premijer liga Ž" },
  { key: "a1", label: "A1 liga" },
  { key: "a2", label: "A2 liga" },
  { key: "pioniri", label: "Pioniri" },
  { key: "kadeti", label: "Kadeti" },
  { key: "juniori", label: "Juniori" },
  { key: "pionirke", label: "Pionirke" },
  { key: "kadetkinje", label: "Kadetkinje" },
] as const;

const SENIOR_CATEGORIES = new Set(["plbih", "plbih_z", "a1", "a2"]);

/** "Premijer liga" ili "Omladinska liga KS, Kadeti" (naslov FIBA utakmice) */
export function fibaCategoryLabel(category: string | null | undefined) {
  if (category === "ostalo") return "Turniri i prijateljske";
  const label = FIBA_CATEGORIES.find((c) => c.key === category)?.label;
  if (category && SENIOR_CATEGORIES.has(category)) return label!;
  return label ? `Omladinska liga KS, ${label}` : "Omladinska liga KS";
}

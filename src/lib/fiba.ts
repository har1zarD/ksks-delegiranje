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
};

type RawGame = {
  clock: string;
  period: number;
  periodType: string;
  inOT: number;
  periodsMax: number;
  attendance?: number;
  tm: Record<"1" | "2", RawTeam>;
  officials?: Record<string, RawPerson | undefined>;
  pbp?: { actionType: string; subType?: string; period: number }[];
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
};

const OFFICIALS: [string, string][] = [
  ["referee1", "1. sudija"],
  ["referee2", "2. sudija"],
  ["referee3", "3. sudija"],
  ["commissioner", "Komesar"],
];

const personName = (p: RawPerson) => p.name ?? [p.firstName, p.familyName].filter(Boolean).join(" ");

function team(t: RawTeam): FibaTeam {
  const periods: number[] = [];
  for (let i = 1; t[`p${i}_score`] !== undefined; i++) periods.push(Number(t[`p${i}_score`]));
  const players = Object.values(t.pl ?? {})
    .map<FibaPlayer>((p) => ({
      number: p.shirtNumber,
      name: personName(p),
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
  };
}

/** Stanje iz play-by-play: "game end" = završena, bilo koja akcija = u toku */
function stateOf(g: RawGame): FibaGame["state"] {
  const pbp = g.pbp ?? [];
  if (pbp.some((a) => a.actionType === "game" && a.subType === "end")) return "finished";
  return pbp.length > 0 ? "live" : "scheduled";
}

/** Cijela utakmica (null = FIBA je nema ili još nema podataka) */
export async function fetchFibaGame(matchId: number): Promise<FibaGame | null> {
  const res = await fetch(`${BASE}/data/${matchId}/data.json`, { cache: "no-store" });
  if (!res.ok) return null;
  const g = (await res.json().catch(() => null)) as RawGame | null;
  if (!g?.tm?.["1"] || !g.tm["2"]) return null;
  return {
    id: matchId,
    state: stateOf(g),
    period: g.period,
    clock: g.clock,
    attendance: g.attendance || null,
    home: team(g.tm["1"]),
    away: team(g.tm["2"]),
    officials: OFFICIALS.flatMap(([key, role]) => {
      const p = g.officials?.[key];
      const name = p && personName(p);
      return name ? [{ role, name }] : [];
    }),
  };
}

/** Status iz feeda → stanje (FIBA: SCHEDULED, READY, IN_PROGRESS, COMPLETE, FINISHED…) */
export function feedState(status: string, live: boolean): FibaGame["state"] {
  if (live || status === "IN_PROGRESS") return "live";
  if (status === "COMPLETE" || status === "FINISHED" || status === "CONFIRMED") return "finished";
  return "scheduled";
}

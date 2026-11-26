import { cacheLife, cacheTag } from "next/cache";
import { requireRole } from "@/lib/auth";
import { LIFE, TAG } from "@/lib/cache";
import { dayKey, sarajevoToISO, todayISO } from "@/lib/format";
import { properName } from "@/lib/fiba";
import { seasonOf } from "@/lib/fiba-stats";
import { FIBA_RESULT_PREFIX, LEAGUE_FIBA_CATEGORIES, LEAGUE_FIBA_COMPETITION, leagueFibaResults, leagueRound } from "@/lib/league-fiba";
import { createAdminClient } from "@/lib/supabase/admin";
import { rows } from "./db";
import { licensePhotos, type LicensePhoto } from "./fiba";

const SOCIAL_SELECT = `
  id, number, round, starts_at, status, home_score, away_score,
  competition:competitions!matches_competition_id_fkey!inner (
    id, name, short_name, season:seasons!competitions_season_id_fkey!inner ( is_current )
  ),
  home:teams!matches_home_team_id_fkey ( name, club:clubs!teams_club_id_fkey ( logo_url ) ),
  away:teams!matches_away_team_id_fkey ( name, club:clubs!teams_club_id_fkey ( logo_url ) ),
  hall:halls!matches_hall_id_fkey ( name )
` as const;

const currentSeasonMatches = (db: ReturnType<typeof createAdminClient>) =>
  db.from("matches").select(SOCIAL_SELECT).eq("competition.season.is_current", true);

/** Sve utakmice tekuće sezone koje propusti `narrow`, po 500 */
async function socialMatches(narrow: (query: ReturnType<typeof currentSeasonMatches>) => ReturnType<typeof currentSeasonMatches>) {
  const db = createAdminClient();
  const matches = [];
  const batchSize = 500;
  for (let offset = 0; ; offset += batchSize) {
    const batch = rows(await narrow(currentSeasonMatches(db)).order("starts_at").order("id").range(offset, offset + batchSize - 1));
    matches.push(...batch);
    if (batch.length < batchSize) break;
  }
  return matches.map((m) => ({
    id: m.id,
    startsAt: m.starts_at,
    status: m.status,
    date: dayKey(m.starts_at),
    round: m.round,
    competitionId: m.competition.id,
    competition: m.competition.short_name ?? m.competition.name,
    home: m.home?.name ?? "—",
    away: m.away?.name ?? "—",
    homeLogo: m.home?.club?.logo_url ?? null,
    awayLogo: m.away?.club?.logo_url ?? null,
    hall: m.hall?.name ?? null,
    homeScore: m.home_score,
    awayScore: m.away_score,
  }));
}

async function socialRows(from: string) {
  "use cache: remote";
  cacheLife(LIFE.live);
  cacheTag(TAG.matches, TAG.competitions, TAG.teams, TAG.clubs, TAG.halls);
  return socialMatches((query) => query
    .in("status", ["scheduled", "postponed"])
    .or(`status.eq.postponed,starts_at.gte.${sarajevoToISO(from, "00:00")}`));
}

async function socialResultRows() {
  "use cache: remote";
  cacheLife(LIFE.live);
  cacheTag(TAG.matches, TAG.competitions, TAG.teams, TAG.clubs, TAG.halls);
  return socialMatches((query) => query.eq("status", "finished").not("home_score", "is", null).not("away_score", "is", null));
}

async function socialRoundRows() {
  "use cache: remote";
  cacheLife(LIFE.live);
  cacheTag(TAG.matches, TAG.competitions, TAG.teams, TAG.clubs, TAG.halls);
  return socialMatches((query) => query.in("status", ["scheduled", "live", "postponed", "finished"]));
}

/**
 * Lige saveza (A2 jug, A1 žene): rezultati s FIBA statistike za parove iz rasporeda koji nemaju utakmicu u aplikaciji
 * (vidi `leagueFibaResults`), s grbovima ekipa i četvrtinama. Keširan čitač bez provjere prijave: zove ga samo
 * kod koji je prijavu već provjerio (getLeagueFibaResults, tabele).
 */
export async function leagueFibaRows() {
  "use cache: remote";
  cacheLife(LIFE.live);
  cacheTag(TAG.fiba, TAG.matches, TAG.competitions, TAG.teams, TAG.clubs);
  const db = createAdminClient();
  const [games, linked, ours] = await Promise.all([
    db.from("fiba_games").select("id, starts_at, status, live, home_name, away_name, home_score, away_score")
      .eq("competition_id", LEAGUE_FIBA_COMPETITION).not("status", "in", "(SCHEDULED,READY)")
      .not("home_score", "is", null).not("away_score", "is", null).not("starts_at", "is", null)
      .order("starts_at", { ascending: false }).limit(1000).then(rows),
    db.from("matches").select("fiba_game_id").not("fiba_game_id", "is", null).then(rows),
    socialRoundRows(),
  ]);
  const taken = new Set(linked.map((m) => m.fiba_game_id));
  // Završena: status COMPLETE, ili utakmica s koševima koja je u feedu ostala "u toku" (FIBA feed pokazuje samo zadnji krug,
  // pa utakmica koju statističar nije zaključio ostane tako zauvijek) a počela je prije više od 6 sati
  const stale = Date.now() - 6 * 60 * 60 * 1000;
  const free = games.flatMap((g) => {
    if (taken.has(g.id) || g.starts_at == null || g.home_score == null || g.away_score == null) return [];
    const over = g.status === "COMPLETE" || (!g.live && g.home_score + g.away_score > 0 && Date.parse(g.starts_at) < stale);
    return over ? [{ ...g, starts_at: g.starts_at, home_score: g.home_score, away_score: g.away_score }] : [];
  });
  const results = leagueFibaResults(free, ours);
  if (results.length === 0) return [];
  const teamGames = rows(await db.from("fiba_team_games").select("game_id, side, periods").in("game_id", results.map((r) => r.gameId)));
  const periodsOf = (gameId: number, side: number) => teamGames.find((t) => t.game_id === gameId && t.side === side)?.periods ?? [];
  const logos = new Map(ours.flatMap((m) => [[`${m.competitionId}|${m.home}`, m.homeLogo] as const, [`${m.competitionId}|${m.away}`, m.awayLogo] as const]));
  const names = new Map(ours.map((m) => [m.competitionId, m.competition]));
  return results.map((r) => {
    const home = periodsOf(r.gameId, 1);
    const away = periodsOf(r.gameId, 2);
    return {
      ...r,
      competition: names.get(r.competitionId) ?? "",
      homeLogo: logos.get(`${r.competitionId}|${r.home}`) ?? null,
      awayLogo: logos.get(`${r.competitionId}|${r.away}`) ?? null,
      periods: home.length === away.length ? home.map((points, i) => ({ home: points, away: away[i] })) : [],
    };
  });
}

/** Rezultati liga saveza s FIBA statistike kojih nema u aplikaciji (A2 jug, A1 žene) */
export async function getLeagueFibaResults() {
  await requireRole("admin");
  return leagueFibaRows();
}

export type LeagueFibaRow = Awaited<ReturnType<typeof getLeagueFibaResults>>[number];

/** Isti rezultati kao stavke za slike rezultata i kola */
export async function getSocialFibaResults(): Promise<SocialMatch[]> {
  return (await getLeagueFibaResults()).filter((r) => r.competition).map((r) => ({
    id: `${FIBA_RESULT_PREFIX}${r.gameId}`,
    startsAt: r.startsAt,
    status: "finished" as const,
    date: dayKey(r.startsAt),
    round: r.round,
    competitionId: r.competitionId,
    competition: r.competition,
    home: r.home,
    away: r.away,
    homeLogo: r.homeLogo,
    awayLogo: r.awayLogo,
    hall: r.hall,
    homeScore: r.homeScore,
    awayScore: r.awayScore,
  }));
}

export async function getSocialSchedules() {
  await requireRole("admin");
  const today = todayISO();
  const matches = await socialRows(today);
  const now = Date.now();
  return { matches: matches.filter((match) => match.status === "postponed" || new Date(match.startsAt).getTime() > now), today, now };
}

/** Završene utakmice tekuće sezone s upisanim rezultatom, za slike rezultata */
export async function getSocialResults() {
  await requireRole("admin");
  return socialResultRows();
}

/** Sve neotkazane utakmice tekuće sezone (odigrane, u toku, zakazane i odgođene), za sliku kola */
export async function getSocialRound() {
  await requireRole("admin");
  return socialRoundRows();
}

export type SocialMatch = Awaited<ReturnType<typeof getSocialSchedules>>["matches"][number];

// ───────── Statistika liga saveza (A2 jug, A1 žene) za slike: MVP kola, petorka, lideri ─────────

/** Nastup igrača na jednoj utakmici lige saveza (box score s FIBA LiveStats, ime i fotografija s licence) */
export type SocialStatLine = {
  gameId: number;
  competitionId: string;
  round: number | null;
  date: string;
  playerId: string;
  licenseId: string | null;
  first: string;
  last: string;
  number: string | null;
  team: string;
  teamLogo: string | null;
  opponent: string;
  opponentLogo: string | null;
  home: boolean;
  teamScore: number;
  opponentScore: number;
  won: boolean;
  starter: boolean;
  seconds: number;
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
  plusMinus: number;
};

export type SocialStatsData = {
  leagues: { id: string; name: string; rounds: number[] }[];
  lines: SocialStatLine[];
  /** Fotografije s licence: { [licenseId]: { photo, cutout } } (cutout = PNG bez pozadine) */
  photos: Record<string, LicensePhoto>;
};

async function socialStatRows() {
  "use cache: remote";
  cacheLife(LIFE.reference);
  cacheTag(TAG.fiba, TAG.matches, TAG.competitions, TAG.teams, TAG.clubs);
  const db = createAdminClient();
  const season = seasonOf(new Date().toISOString())!;
  const seasonStart = sarajevoToISO(`${season.slice(0, 4)}-07-01`, "00:00");
  const categories = Object.keys(LEAGUE_FIBA_CATEGORIES);
  const competitionIds = Object.values(LEAGUE_FIBA_CATEGORIES);
  const [games, competitions, teams] = await Promise.all([
    db.from("fiba_games").select("id, category, starts_at, home_name, away_name, home_score, away_score")
      .in("category", categories).eq("status", "COMPLETE").gte("starts_at", seasonStart).not("stats_at", "is", null).then(rows),
    db.from("competitions").select("id, name, short_name").in("id", competitionIds).then(rows),
    db.from("teams").select("name, competition_id, club:clubs!teams_club_id_fkey ( logo_url )").in("competition_id", competitionIds).then(rows),
  ]);
  if (games.length === 0) return { leagues: [], lines: [] };
  const ids = games.map((g) => g.id);
  const [players, linked] = await Promise.all([
    db.from("fiba_player_games")
      .select("game_id, side, player_id, license_id, first_name, family_name, number, starter, seconds, pts, fgm, fga, tpm, tpa, ftm, fta, oreb, dreb, reb, ast, stl, blk, tov, pf, eff, plus_minus")
      .in("game_id", ids).gt("seconds", 0).limit(5000).then(rows),
    db.from("matches").select("fiba_game_id, round").in("fiba_game_id", ids).then(rows),
  ]);
  const logos = new Map(teams.map((t) => [`${t.competition_id}|${t.name}`, t.club?.logo_url ?? null]));
  const roundOf = new Map(linked.map((m) => [m.fiba_game_id!, m.round]));
  const byGame = new Map(games.map((g) => {
    const competitionId = LEAGUE_FIBA_CATEGORIES[g.category!];
    const startsAt = g.starts_at!;
    return [g.id, { ...g, competitionId, startsAt, round: roundOf.get(g.id) ?? leagueRound(competitionId, g.home_name, g.away_name, startsAt) }];
  }));
  const lines = players.flatMap<SocialStatLine>((p) => {
    const g = byGame.get(p.game_id);
    if (!g || g.home_score == null || g.away_score == null) return [];
    const home = p.side === 1;
    const team = home ? g.home_name : g.away_name;
    const opponent = home ? g.away_name : g.home_name;
    const teamScore = home ? g.home_score : g.away_score;
    const opponentScore = home ? g.away_score : g.home_score;
    // Ime s licence je već pravilno; FIBA ime ponekad velikim slovima ("MEDIN Duskaj")
    const fix = (t: string | null) => (p.license_id ? t ?? "" : properName(t ?? "")).trim();
    return [{
      gameId: g.id, competitionId: g.competitionId, round: g.round, date: dayKey(g.startsAt),
      playerId: p.player_id, licenseId: p.license_id, first: fix(p.first_name), last: fix(p.family_name), number: p.number,
      team, teamLogo: logos.get(`${g.competitionId}|${team}`) ?? null,
      opponent, opponentLogo: logos.get(`${g.competitionId}|${opponent}`) ?? null,
      home, teamScore, opponentScore, won: teamScore > opponentScore, starter: p.starter, seconds: p.seconds,
      pts: p.pts, fgm: p.fgm, fga: p.fga, tpm: p.tpm, tpa: p.tpa, ftm: p.ftm, fta: p.fta,
      oreb: p.oreb, dreb: p.dreb, reb: p.reb, ast: p.ast, stl: p.stl, blk: p.blk, tov: p.tov, pf: p.pf, eff: p.eff, plusMinus: p.plus_minus,
    }];
  });
  const leagues = competitions
    .map((c) => ({
      id: c.id,
      name: c.short_name ?? c.name,
      rounds: [...new Set(lines.filter((l) => l.competitionId === c.id && l.round != null).map((l) => l.round!))].sort((a, b) => a - b),
    }))
    .filter((l) => lines.some((x) => x.competitionId === l.id))
    .sort((a, b) => competitionIds.indexOf(a.id) - competitionIds.indexOf(b.id));
  return { leagues, lines };
}

/** Statistika liga saveza s FIBA LiveStats (tekuća sezona) i fotografije igrača s licence, za slike statistike */
export async function getSocialStats(): Promise<SocialStatsData> {
  await requireRole("admin");
  const { leagues, lines } = await socialStatRows();
  const photos: Record<string, LicensePhoto> = await licensePhotos(lines.map((l) => l.licenseId));
  return { leagues, lines, photos };
}

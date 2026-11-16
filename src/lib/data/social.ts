import { cacheLife, cacheTag } from "next/cache";
import { requireRole } from "@/lib/auth";
import { LIFE, TAG } from "@/lib/cache";
import { dayKey, sarajevoToISO, todayISO } from "@/lib/format";
import { FIBA_RESULT_PREFIX, LEAGUE_FIBA_COMPETITION, leagueFibaResults } from "@/lib/league-fiba";
import { createAdminClient } from "@/lib/supabase/admin";
import { rows } from "./db";

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

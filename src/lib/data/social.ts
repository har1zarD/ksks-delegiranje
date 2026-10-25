import { cacheLife, cacheTag } from "next/cache";
import { requireRole } from "@/lib/auth";
import { LIFE, TAG } from "@/lib/cache";
import { dayKey, sarajevoToISO, todayISO } from "@/lib/format";
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

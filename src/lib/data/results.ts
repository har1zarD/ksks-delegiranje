import { cacheLife, cacheTag } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getCurrentUser, requireRole } from "@/lib/auth";
import { CREW_DEFAULT_COLUMNS, SENIOR_CATEGORIES } from "@/lib/crew";
import { LIFE, TAG } from "@/lib/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";
import { computeStandings, type CarryOver } from "@/lib/standings";
import { row, rows } from "./db";

type Db = SupabaseClient<Database>;

// Keširani čitači (servisni klijent) vraćaju podatke zajedničke svim prijavljenim korisnicima;
// izvezene funkcije prvo provjere prijavu/ulogu (isto kao RLS: svi aktivni vide takmičenja i rezultate).

const COMPETITION_LIST_SELECT =
  "id, name, short_name, parent_id, carry_over_h2h, sort, format, season:seasons!competitions_season_id_fkey!inner ( is_current )" as const;

const RESULT_MATCH_SELECT = `
  id, number, kind, kind_label, round, starts_at, status, home_team_id, away_team_id, home_score, away_score,
  home:teams!matches_home_team_id_fkey ( id, name ),
  away:teams!matches_away_team_id_fkey ( id, name ),
  hall:halls!matches_hall_id_fkey ( name ),
  match_periods ( period, home_points, away_points )
` as const;

const STANDING_MATCH_SELECT = "home_team_id, away_team_id, home_score, away_score, status, round, kind" as const;

async function currentCompetitionRows() {
  "use cache: remote";
  cacheLife(LIFE.reference);
  cacheTag(TAG.competitions);
  return rows(
    await createAdminClient()
      .from("competitions")
      .select(COMPETITION_LIST_SELECT)
      .eq("season.is_current", true)
      // Seniori: savez delegira, ali tabele vodi viši savez
      .not("category", "in", `(${SENIOR_CATEGORIES.join(",")})`)
      .order("sort")
      .order("name"),
  );
}

/** Takmičenja tekuće sezone (vidi svaki prijavljeni korisnik) */
export async function getCurrentCompetitions() {
  await getCurrentUser();
  return currentCompetitionRows();
}

async function loadStandings(
  db: Db,
  competition: { id: string; parent_id: string | null; carry_over_h2h: boolean },
  teams: { id: string; name: string }[],
  matches: Parameters<typeof computeStandings>[1],
) {
  let carryOver: CarryOver | undefined;
  if (competition.parent_id && competition.carry_over_h2h) {
    const [pt, pm] = await Promise.all([
      db.from("teams").select("id, name").eq("competition_id", competition.parent_id),
      db.from("matches").select(STANDING_MATCH_SELECT).eq("competition_id", competition.parent_id),
    ]);
    carryOver = { parentTeams: rows(pt), parentMatches: rows(pm) };
  }
  return computeStandings(teams, matches, { carryOver });
}

async function getParent(db: Db, parentId: string | null) {
  if (!parentId) return null;
  const { data } = await db.from("competitions").select("id, name").eq("id", parentId).maybeSingle();
  return data;
}

/** Tabela i rezultati po kolima za jedno takmičenje (isto za sve korisnike) */
async function resultsData(competitionId: string) {
  "use cache: remote";
  cacheLife(LIFE.live);
  cacheTag(TAG.competitions, TAG.teams, TAG.matches, TAG.periods, TAG.halls);
  const db = createAdminClient();
  const [comp, teams, matches] = await Promise.all([
    db.from("competitions").select("id, name, short_name, parent_id, carry_over_h2h, format").eq("id", competitionId).maybeSingle(),
    db.from("teams").select("id, name").eq("competition_id", competitionId),
    db.from("matches").select(RESULT_MATCH_SELECT).eq("competition_id", competitionId).order("starts_at"),
  ]);
  const competition = row(comp);
  if (!competition) return null;
  const teamRows = rows(teams);
  const matchRows = rows(matches);

  const [standings, parent] = await Promise.all([
    loadStandings(db, competition, teamRows, matchRows),
    getParent(db, competition.parent_id),
  ]);

  // Kola redom; utakmice bez kola (play-off, ručno dodane) na kraju
  const rounds = new Map<number | null, typeof matchRows>();
  for (const m of matchRows) rounds.set(m.round, [...(rounds.get(m.round) ?? []), m]);
  const ordered = [...rounds].sort(([a], [b]) => (a ?? Infinity) - (b ?? Infinity));

  return { competition: { ...competition, parent }, standings, rounds: ordered };
}

export async function getResults(competitionId: string) {
  await getCurrentUser();
  return resultsData(competitionId);
}

// ───────────────────────── Admin ─────────────────────────

async function competitionsOverviewRows() {
  "use cache: remote";
  cacheLife(LIFE.live);
  cacheTag(TAG.competitions, TAG.teams, TAG.matches);
  return rows(
    await createAdminClient()
      .from("competitions")
      .select(`${COMPETITION_LIST_SELECT}, category, teams ( count ), matches ( count )`)
      .eq("season.is_current", true)
      .order("sort")
      .order("name"),
  );
}

export async function getCompetitionsOverview() {
  await requireRole("admin");
  return (await competitionsOverviewRows()).map((c) => ({
    ...c,
    teamCount: c.teams[0]?.count ?? 0,
    matchCount: c.matches[0]?.count ?? 0,
  }));
}

async function competitionAdminData(id: string) {
  "use cache: remote";
  cacheLife(LIFE.live);
  cacheTag(TAG.competitions, TAG.teams, TAG.clubs, TAG.matches);
  const db = createAdminClient();
  const [comp, teams, clubs, matches, children] = await Promise.all([
    db
      .from("competitions")
      .select(
        `id, season_id, name, short_name, category, gender, starts_on, format, fee_km, fee_first_km, fee_due_on, periods, period_min, parent_id, carry_over_h2h, ${CREW_DEFAULT_COLUMNS}`,
      )
      .eq("id", id)
      .maybeSingle(),
    db
      .from("teams")
      .select("id, name, sort, club:clubs!teams_club_id_fkey ( id, short_name )")
      .eq("competition_id", id)
      .order("sort")
      .order("name"),
    db.from("clubs").select("id, name, short_name").eq("active", true).order("name"),
    db.from("matches").select(STANDING_MATCH_SELECT).eq("competition_id", id),
    db.from("competitions").select("id, name").eq("parent_id", id).order("name"),
  ]);
  const competition = row(comp);
  if (!competition) return null;
  const teamRows = rows(teams);
  const matchRows = rows(matches);

  const [standings, parent] = await Promise.all([
    loadStandings(db, competition, teamRows, matchRows),
    getParent(db, competition.parent_id),
  ]);
  const maxRound = Math.max(0, ...matchRows.map((m) => m.round ?? 0));

  return {
    competition: { ...competition, parent },
    teams: teamRows,
    clubs: rows(clubs),
    matchCount: matchRows.length,
    maxRound,
    standings,
    children: rows(children),
  };
}

export async function getCompetitionAdmin(id: string) {
  await requireRole("admin");
  return competitionAdminData(id);
}

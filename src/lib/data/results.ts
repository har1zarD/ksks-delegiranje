import { cacheLife, cacheTag } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getCurrentUser, requireRole } from "@/lib/auth";
import { CREW_DEFAULT_COLUMNS, SENIOR_CATEGORIES } from "@/lib/crew";
import { LIFE, TAG } from "@/lib/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";
import { hasLeagueFixtures } from "@/lib/league-fiba";
import { computeStandings, type CarryOver } from "@/lib/standings";
import { row, rows } from "./db";
import { leagueFibaRows } from "./social";

type Db = SupabaseClient<Database>;

// Keširani čitači (servisni klijent) vraćaju podatke zajedničke svim prijavljenim korisnicima;
// izvezene funkcije prvo provjere prijavu/ulogu (isto kao RLS: svi aktivni vide takmičenja i rezultate).

const COMPETITION_LIST_SELECT =
  "id, name, short_name, category, parent_id, carry_over_h2h, sort, format, season:seasons!competitions_season_id_fkey!inner ( is_current )" as const;

const RESULT_MATCH_SELECT = `
  id, number, kind, kind_label, round, starts_at, status, home_team_id, away_team_id, home_score, away_score,
  home:teams!matches_home_team_id_fkey ( id, name, club:clubs!teams_club_id_fkey ( logo_url ) ),
  away:teams!matches_away_team_id_fkey ( id, name, club:clubs!teams_club_id_fkey ( logo_url ) ),
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
  competition: { id: string; category: string; parent_id: string | null; carry_over_h2h: boolean },
  teams: { id: string; name: string; club: { logo_url: string | null } | null }[],
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
  // Lige saveza (A2 jug, A1 žene): utakmice kojih nema u aplikaciji, a odigrane su po FIBA statistici, broje se u tabelu
  let all = matches;
  if (hasLeagueFixtures(competition.id)) {
    const teamId = new Map(teams.map((team) => [team.name, team.id]));
    const played = (await leagueFibaRows()).flatMap((r) => {
      const home = teamId.get(r.home);
      const away = teamId.get(r.away);
      return r.competitionId === competition.id && home && away
        ? [{ home_team_id: home, away_team_id: away, home_score: r.homeScore, away_score: r.awayScore, status: "finished", round: r.round, kind: "league" }]
        : [];
    });
    if (played.length) all = [...matches, ...played];
  }
  const logos = new Map(teams.map((team) => [team.id, team.club?.logo_url ?? null]));
  return computeStandings(teams, all, { carryOver }).map((standing) => ({ ...standing, logoUrl: logos.get(standing.teamId) ?? null }));
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
  cacheTag(TAG.competitions, TAG.teams, TAG.clubs, TAG.matches, TAG.periods, TAG.halls);
  const db = createAdminClient();
  const [comp, teams, matches] = await Promise.all([
    db.from("competitions").select("id, name, short_name, category, parent_id, carry_over_h2h, format").eq("id", competitionId).maybeSingle(),
    db.from("teams").select("id, name, club:clubs!teams_club_id_fkey ( logo_url )").eq("competition_id", competitionId),
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
      .select(`${COMPETITION_LIST_SELECT}, teams ( count ), matches ( count )`)
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
      .select("id, name, sort, club:clubs!teams_club_id_fkey ( id, short_name, logo_url )")
      .eq("competition_id", id)
      .order("sort")
      .order("name"),
    db.from("clubs").select("id, name, short_name, logo_url").eq("active", true).order("name"),
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

// ───────────────────────── Slike za objavu ─────────────────────────

/** Tabela i ekipe svakog takmičenja tekuće sezone (i seniori), za slike tabele i klubova */
async function socialTablesData() {
  "use cache: remote";
  cacheLife(LIFE.live);
  cacheTag(TAG.competitions, TAG.teams, TAG.clubs, TAG.matches);
  const db = createAdminClient();
  const competitions = rows(await db.from("competitions").select(COMPETITION_LIST_SELECT).eq("season.is_current", true).order("sort").order("name"));
  return Promise.all(
    competitions.map(async (competition) => {
      const [teams, matches] = await Promise.all([
        db.from("teams").select("id, name, club:clubs!teams_club_id_fkey ( logo_url )").eq("competition_id", competition.id),
        db.from("matches").select(STANDING_MATCH_SELECT).eq("competition_id", competition.id),
      ]);
      const standings = await loadStandings(db, competition, rows(teams), rows(matches));
      return {
        id: competition.id,
        name: competition.short_name ?? competition.name,
        standings: standings.map((s) => ({ teamId: s.teamId, name: s.name, logoUrl: s.logoUrl, played: s.played, won: s.won, lost: s.lost, pointsFor: s.pointsFor, pointsAgainst: s.pointsAgainst, diff: s.diff, points: s.points })),
      };
    }),
  );
}

export async function getSocialTables() {
  await requireRole("admin");
  return (await socialTablesData()).filter((competition) => competition.standings.length >= 2);
}

export type SocialTable = Awaited<ReturnType<typeof getSocialTables>>[number];

/** Pozicija ekipe na tabeli (id ekipe → mjesto), za prikaz uz naziv ekipe u listama utakmica */
export type TeamRanks = Record<string, number>;

/**
 * Takmičenja čije se mjesto na tabeli prikazuje uz naziv ekipe (omladinske lige KSKS).
 * Ostala (Srednje škole, WABA U15, seniorske lige i lige saveza) bez pozicije.
 */
const RANKED_COMPETITIONS = new Set([
  "c6b366f8-1d26-4b9d-94fe-bfefd988ca60", // Unobasket
  "ecd30198-7ae7-4856-a411-d7bb0c7e35d3", // Minibasket
  "ad3e34d0-8393-46ec-a464-e0db6a898cb9", // Pioniri G1
  "9a46987b-ee80-4ad4-b956-4dd29bebaf37", // Pioniri G2
  "e5da2f34-3891-40b5-b946-9484f3750e34", // Kadeti G1
  "efa174a7-1a9a-464c-ad1d-5c8ba0aee67b", // Kadeti G2
  "76190da0-e3cd-4939-81e9-c05cd590890c", // Juniori
  "c661f272-7329-486d-ba5e-5edeb7924586", // ŽOL — Pionirke
  "ce36b0c1-7df5-4ac5-a391-de280bd0d220", // ŽOL — Kadetkinje
]);

/**
 * Pozicije ekipa iz RANKED_COMPETITIONS, iz istih tabela kao Rezultati (isti keš kao slike tabele).
 * Bez pozicije dok takmičenje nema nijednu odigranu utakmicu lige.
 */
export async function getTeamRanks(): Promise<TeamRanks> {
  await getCurrentUser();
  const ranks: TeamRanks = {};
  for (const table of await socialTablesData()) {
    if (!RANKED_COMPETITIONS.has(table.id)) continue;
    if (table.standings.length < 2 || !table.standings.some((s) => s.played > 0)) continue;
    table.standings.forEach((s, i) => (ranks[s.teamId] = i + 1));
  }
  return ranks;
}

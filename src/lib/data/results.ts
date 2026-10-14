import { getCurrentUser, requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { computeStandings, type CarryOver } from "@/lib/standings";

const COMPETITION_LIST_SELECT =
  "id, name, short_name, parent_id, carry_over_h2h, sort, format, season:seasons!competitions_season_id_fkey!inner ( is_current )" as const;

const RESULT_MATCH_SELECT = `
  id, number, round, starts_at, status, home_team_id, away_team_id, home_score, away_score,
  home:teams!matches_home_team_id_fkey ( id, name ),
  away:teams!matches_away_team_id_fkey ( id, name ),
  hall:halls!matches_hall_id_fkey ( name ),
  match_periods ( period, home_points, away_points )
` as const;

const STANDING_MATCH_SELECT = "home_team_id, away_team_id, home_score, away_score, status, round" as const;

/** Takmičenja tekuće sezone (vidi svaki prijavljeni korisnik) */
export async function getCurrentCompetitions() {
  await getCurrentUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("competitions")
    .select(COMPETITION_LIST_SELECT)
    .eq("season.is_current", true)
    .order("sort")
    .order("name");
  if (error) throw error;
  return data ?? [];
}

async function loadStandings(
  supabase: Awaited<ReturnType<typeof createClient>>,
  competition: { id: string; parent_id: string | null; carry_over_h2h: boolean },
  teams: { id: string; name: string }[],
  matches: Parameters<typeof computeStandings>[1],
) {
  let carryOver: CarryOver | undefined;
  if (competition.parent_id && competition.carry_over_h2h) {
    const [pt, pm] = await Promise.all([
      supabase.from("teams").select("id, name").eq("competition_id", competition.parent_id),
      supabase.from("matches").select(STANDING_MATCH_SELECT).eq("competition_id", competition.parent_id),
    ]);
    if (pt.error) throw pt.error;
    if (pm.error) throw pm.error;
    carryOver = { parentTeams: pt.data ?? [], parentMatches: pm.data ?? [] };
  }
  return computeStandings(teams, matches, { carryOver });
}

async function getParent(supabase: Awaited<ReturnType<typeof createClient>>, parentId: string | null) {
  if (!parentId) return null;
  const { data } = await supabase.from("competitions").select("id, name").eq("id", parentId).maybeSingle();
  return data;
}

/** Tabela i rezultati po kolima za jedno takmičenje */
export async function getResults(competitionId: string) {
  await getCurrentUser();
  const supabase = await createClient();
  const [comp, teams, matches] = await Promise.all([
    supabase
      .from("competitions")
      .select("id, name, short_name, parent_id, carry_over_h2h, format")
      .eq("id", competitionId)
      .maybeSingle(),
    supabase.from("teams").select("id, name").eq("competition_id", competitionId),
    supabase.from("matches").select(RESULT_MATCH_SELECT).eq("competition_id", competitionId).order("starts_at"),
  ]);
  for (const r of [comp, teams, matches]) if (r.error) throw r.error;
  if (!comp.data) return null;

  const [standings, parent] = await Promise.all([
    loadStandings(supabase, comp.data, teams.data ?? [], matches.data ?? []),
    getParent(supabase, comp.data.parent_id),
  ]);

  // Kola redom; utakmice bez kola (play-off, ručno dodane) na kraju
  const rounds = new Map<number | null, NonNullable<typeof matches.data>>();
  for (const m of matches.data ?? []) rounds.set(m.round, [...(rounds.get(m.round) ?? []), m]);
  const ordered = [...rounds].sort(([a], [b]) => (a ?? Infinity) - (b ?? Infinity));

  return { competition: { ...comp.data, parent }, standings, rounds: ordered };
}

// ───────────────────────── Admin ─────────────────────────

export async function getCompetitionsOverview() {
  await requireRole("admin");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("competitions")
    .select(`${COMPETITION_LIST_SELECT}, category, teams ( count ), matches ( count )`)
    .eq("season.is_current", true)
    .order("sort")
    .order("name");
  if (error) throw error;
  return (data ?? []).map((c) => ({
    ...c,
    teamCount: c.teams[0]?.count ?? 0,
    matchCount: c.matches[0]?.count ?? 0,
  }));
}

export async function getCompetitionAdmin(id: string) {
  await requireRole("admin");
  const supabase = await createClient();
  const [comp, teams, clubs, matches, children] = await Promise.all([
    supabase
      .from("competitions")
      .select(
        "id, season_id, name, short_name, category, gender, starts_on, format, fee_km, fee_first_km, fee_due_on, periods, period_min, parent_id, carry_over_h2h, referee_count_default, table_count_default",
      )
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("teams")
      .select("id, name, sort, club:clubs!teams_club_id_fkey ( id, short_name )")
      .eq("competition_id", id)
      .order("sort")
      .order("name"),
    supabase.from("clubs").select("id, name, short_name").eq("active", true).order("name"),
    supabase.from("matches").select(STANDING_MATCH_SELECT).eq("competition_id", id),
    supabase.from("competitions").select("id, name").eq("parent_id", id).order("name"),
  ]);
  for (const r of [comp, teams, clubs, matches, children]) if (r.error) throw r.error;
  if (!comp.data) return null;

  const [standings, parent] = await Promise.all([
    loadStandings(supabase, comp.data, teams.data ?? [], matches.data ?? []),
    getParent(supabase, comp.data.parent_id),
  ]);
  const maxRound = Math.max(0, ...(matches.data ?? []).map((m) => m.round ?? 0));

  return {
    competition: { ...comp.data, parent },
    teams: teams.data ?? [],
    clubs: clubs.data ?? [],
    matchCount: matches.data?.length ?? 0,
    maxRound,
    standings,
    children: children.data ?? [],
  };
}

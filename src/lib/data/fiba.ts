import { after } from "next/server";
import { cacheLife, cacheTag } from "next/cache";
import { getCurrentUser, requireRole } from "@/lib/auth";
import { LIFE, TAG } from "@/lib/cache";
import { fetchCompetitionFeed, fetchFibaGame, type FibaFeedGame } from "@/lib/fiba";
import { FIBA_CLUBS, fibaClubBase, fibaClubName } from "@/lib/fiba-clubs";
import { createAdminClient } from "@/lib/supabase/admin";
import { row, rows } from "./db";

// FIBA LiveStats (omladinska liga KS): spisak utakmica = sve što je feed takmičenja ikad pokazao ili je uvezeno/dodano
// (fiba_games) + svježi feed. Veza s našom utakmicom je matches.fiba_game_id.
// Keširani čitači koriste servisni klijent; izvezene funkcije prvo provjere prijavu (vidi svaki prijavljeni korisnik).

const GAME_COLUMNS =
  "id, competition_id, category, starts_at, status, live, home_name, away_name, home_logo, away_logo, home_score, away_score, stream_key" as const;

const LINKED_MATCH = "id, number, starts_at, fiba_game_id, fiba_stream_key, competition:competitions!matches_competition_id_fkey ( name, short_name )" as const;

export type FibaGameRow = Omit<FibaFeedGame, "starts_at" | "competition_id"> & {
  starts_at: string | null;
  competition_id: number | null;
  category: string | null;
  stream_key?: string | null;
};

async function clubLogos(): Promise<Record<string, string>> {
  "use cache: remote";
  cacheLife(LIFE.reference);
  cacheTag(TAG.clubs);
  const clubs = rows(await createAdminClient().from("clubs").select("id, name, short_name, logo_url"));
  const byId = new Map(clubs.map((club) => [club.id, club.logo_url]));
  const storage = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/club-logos`;
  // Novi FIBA nazivi (nova sezona, uzrast, ekipa) se prepoznaju po osnovi naziva kluba; ista osnova kod klubova s različitim logom se preskače
  const auto = new Map<string, string | null>();
  for (const club of clubs) {
    if (!club.logo_url) continue;
    for (const base of new Set([club.name, club.short_name].filter(Boolean).map(fibaClubBase))) {
      auto.set(base, auto.has(base) && auto.get(base) !== club.logo_url ? null : club.logo_url);
    }
  }
  const logos: Record<string, string> = {};
  for (const [base, logo] of auto) if (logo) logos[`~${base}`] = logo;
  // Ručna lista ima prednost, i po tačnom nazivu i po osnovi
  for (const club of FIBA_CLUBS) {
    const logo = club.clubId ? byId.get(club.clubId) : club.logoPath ? `${storage}/${club.logoPath}` : null;
    if (!logo) continue;
    for (const name of club.names) {
      logos[fibaClubName(name)] = logo;
      logos[`~${fibaClubBase(name)}`] = logo;
    }
  }
  return logos;
}

/** Logo FIBA ekipe: tačan naziv s ručne liste, pa osnova naziva ("GEN U14" → GEN) */
function logoOf(logos: Record<string, string>, name: string): string | undefined {
  return logos[fibaClubName(name)] ?? logos[`~${fibaClubBase(name)}`];
}

function withClubLogos<T extends Pick<FibaGameRow, "home_name" | "away_name" | "home_logo" | "away_logo">>(
  game: T,
  logos: Record<string, string>,
): T {
  return {
    ...game,
    home_logo: logoOf(logos, game.home_name) ?? game.home_logo,
    away_logo: logoOf(logos, game.away_name) ?? game.away_logo,
  };
}

async function competitionRows() {
  "use cache: remote";
  cacheLife(LIFE.reference);
  cacheTag(TAG.fiba);
  return rows(await createAdminClient().from("fiba_competitions").select("id, name, sort, active, category").eq("active", true).order("sort"));
}

/** Svježi feed svih aktivnih takmičenja (FIBA vraća samo zadnji/trenutni krug); seniorske lige nose kategoriju takmičenja */
async function feedGames() {
  "use cache: remote";
  cacheLife(LIFE.fiba);
  cacheTag(TAG.fiba);
  const competitions = await competitionRows();
  const feeds = await Promise.all(
    competitions.map(async (c) => (await fetchCompetitionFeed(c.id).catch(() => [])).map((g) => ({ ...g, ...(c.category ? { category: c.category } : {}) }))),
  );
  return feeds.flat();
}

async function storedGames() {
  "use cache: remote";
  cacheLife(LIFE.fiba);
  cacheTag(TAG.fiba);
  return rows(
    await createAdminClient().from("fiba_games").select(GAME_COLUMNS).order("starts_at", { ascending: false, nullsFirst: false }).limit(1000),
  );
}

/** Naše utakmice povezane s FIBA utakmicom */
async function linkedMatches() {
  "use cache: remote";
  cacheLife(LIFE.live);
  cacheTag(TAG.matches, TAG.competitions);
  return rows(await createAdminClient().from("matches").select(LINKED_MATCH).not("fiba_game_id", "is", null));
}

/** Pamti utakmice iz feeda (kategorija omladinske lige, pristupni kod i veza se ne diraju) */
async function storeFeed(games: (FibaFeedGame & { category?: string })[]) {
  if (games.length === 0) return;
  const now = new Date().toISOString();
  const { error } = await createAdminClient()
    .from("fiba_games")
    .upsert(games.map((g) => ({ ...g, updated_at: now })));
  if (error) console.error("[fiba] upis feeda:", error.message);
}

export async function getFibaCompetitions() {
  await getCurrentUser();
  return competitionRows();
}

/** Sve poznate FIBA utakmice (s našom utakmicom ako je povezana); feed ima prednost i upisuje se u bazu poslije odgovora */
export async function getFibaGames() {
  await getCurrentUser();
  const [feed, stored, linked, logos] = await Promise.all([feedGames(), storedGames(), linkedMatches(), clubLogos()]);
  after(() => storeFeed(feed));
  const byId = new Map<number, FibaGameRow>(stored.map((g) => [g.id, g]));
  for (const g of feed) byId.set(g.id, { ...g, category: g.category ?? byId.get(g.id)?.category ?? null, stream_key: byId.get(g.id)?.stream_key ?? null });
  const matchOf = new Map(linked.map((m) => [m.fiba_game_id!, m]));
  return [...byId.values()].map((g) => ({ ...withClubLogos(g, logos), match: matchOf.get(g.id) ?? null }));
}

async function liveGame(matchId: number, startsAt: string | null) {
  "use cache: remote";
  cacheLife(LIFE.fiba);
  cacheTag(TAG.fiba, `fiba:${matchId}`);
  return fetchFibaGame(matchId, startsAt);
}

async function storedGame(matchId: number) {
  "use cache: remote";
  cacheLife(LIFE.fiba);
  cacheTag(TAG.fiba);
  return row(await createAdminClient().from("fiba_games").select(GAME_COLUMNS).eq("id", matchId).maybeSingle());
}

/** Cijela utakmica s FIBA LiveStats + zapis iz baze (termin, kategorija) + naša povezana utakmica */
export async function getFibaGame(matchId: number) {
  await getCurrentUser();
  const [stored, linked, logos] = await Promise.all([storedGame(matchId), linkedMatches(), clubLogos()]);
  const game = await liveGame(matchId, stored?.starts_at ?? null);
  const logoFor = (name: string, storedName: string | undefined, fallback: string | null) =>
    logoOf(logos, name) ?? (storedName ? logoOf(logos, storedName) : undefined) ?? fallback;
  return {
    game: game ? {
      ...game,
      home: { ...game.home, logo: logoFor(game.home.name, stored?.home_name, game.home.logo) },
      away: { ...game.away, logo: logoFor(game.away.name, stored?.away_name, game.away.logo) },
    } : null,
    stored: stored ? withClubLogos(stored, logos) : null,
    match: linked.find((m) => m.fiba_game_id === matchId) ?? null,
  };
}

/** Admin: naše utakmice omladinske lige oko termina FIBA utakmice (±3 dana) koje još nemaju FIBA utakmicu */
export async function getLinkCandidates(startsAt: string | null) {
  await requireRole("admin");
  const at = startsAt ? Date.parse(startsAt) : Date.now();
  const day = 24 * 60 * 60 * 1000;
  return rows(
    await createAdminClient()
      .from("matches")
      .select(
        "id, number, starts_at, competition:competitions!matches_competition_id_fkey ( short_name, name ), home:teams!matches_home_team_id_fkey ( name ), away:teams!matches_away_team_id_fkey ( name )",
      )
      .is("fiba_game_id", null)
      .gte("starts_at", new Date(at - 3 * day).toISOString())
      .lte("starts_at", new Date(at + 3 * day).toISOString())
      .order("starts_at"),
  );
}

// ───────── Statistika (box score završenih utakmica u bazi: fiba_player_games, fiba_team_games) ─────────

const LINE = "pts, fgm, fga, tpm, tpa, ftm, fta, oreb, dreb, reb, ast, stl, blk, tov, pf, eff" as const;
const TEAM_GAME = `game_id, side, team_name, club_key, coach, score, periods, ${LINE}, paint, fast_break, second_chance, from_turnovers, bench, biggest_lead, biggest_run, lead_changes, times_tied` as const;
const PLAYER_GAME = `game_id, side, player_id, team_name, first_name, family_name, number, position, starter, captain, seconds, ${LINE}, fd, plus_minus` as const;

/** Klubovi FIBA ekipa (ID igrača = klub + ime) */
async function teamAliases() {
  "use cache: remote";
  cacheLife(LIFE.reference);
  cacheTag(TAG.fiba);
  const data = rows(await createAdminClient().from("fiba_team_aliases").select("team_key, club_key"));
  return Object.fromEntries(data.map((a) => [a.team_key, a.club_key]));
}

/** Statistika ekipa svih završenih utakmica (četvrtine za listu, prosjeci ekipa) */
async function teamGames() {
  "use cache: remote";
  cacheLife(LIFE.reference);
  cacheTag(TAG.fiba);
  return rows(await createAdminClient().from("fiba_team_games").select(TEAM_GAME).limit(5000));
}

/** Prosjeci igrača jedne kategorije u sezoni (pogled fiba_player_season) */
async function seasonRows(category: string, season: string) {
  "use cache: remote";
  cacheLife(LIFE.reference);
  cacheTag(TAG.fiba);
  return rows(await createAdminClient().from("fiba_player_season").select("*").eq("category", category).eq("season", season).limit(5000));
}

/** Sve utakmice jednog igrača, najnovija prva */
async function playerLines(playerId: string) {
  "use cache: remote";
  cacheLife(LIFE.reference);
  cacheTag(TAG.fiba);
  return rows(
    await createAdminClient()
      .from("fiba_player_games")
      .select(`${PLAYER_GAME}, game:fiba_games!inner ( ${GAME_COLUMNS} )`)
      .eq("player_id", playerId),
  ).sort((a, b) => Date.parse(b.game.starts_at ?? "") - Date.parse(a.game.starts_at ?? ""));
}

/** Igrači jedne ekipe u kategoriji, po utakmici */
async function teamPlayerLines(category: string, teamName: string) {
  "use cache: remote";
  cacheLife(LIFE.reference);
  cacheTag(TAG.fiba);
  return rows(
    await createAdminClient()
      .from("fiba_player_games")
      .select(`${PLAYER_GAME}, game:fiba_games!inner ( id, category, starts_at )`)
      .eq("team_name", teamName)
      .eq("game.category", category)
      .limit(5000),
  );
}

export type FibaTeamGame = Awaited<ReturnType<typeof teamGames>>[number];
export type FibaSeasonRow = Awaited<ReturnType<typeof seasonRows>>[number];

/** Četvrtine i statistika ekipa po FIBA utakmici: { [gameId]: [domaćin, gost] } */
export async function getFibaTeamGames() {
  await getCurrentUser();
  const byGame = new Map<number, FibaTeamGame[]>();
  for (const t of await teamGames()) byGame.set(t.game_id, [...(byGame.get(t.game_id) ?? []), t].sort((a, b) => a.side - b.side));
  return byGame;
}

/** Igrači kategorije u sezoni (prosjeci) s logom ekipe */
export async function getFibaSeason(category: string, seasonKey: string) {
  await getCurrentUser();
  const [season, logos] = await Promise.all([seasonRows(category, seasonKey), clubLogos()]);
  return season.map((p) => ({ ...p, logo: logoOf(logos, p.team_name ?? "") ?? null }));
}

export async function getFibaAliases() {
  await getCurrentUser();
  return teamAliases();
}

/** Igrač: sve njegove utakmice (s rezultatom i protivnikom) */
export async function getFibaPlayer(playerId: string) {
  await getCurrentUser();
  const [lines, logos] = await Promise.all([playerLines(playerId), clubLogos()]);
  return lines.map((l) => ({ ...l, game: withClubLogos(l.game, logos) }));
}

/** Igrači ekipe u kategoriji (po utakmici) */
export async function getFibaTeamPlayers(category: string, teamName: string) {
  await getCurrentUser();
  return teamPlayerLines(category, teamName);
}

/** Logo FIBA ekipe po nazivu */
export async function getFibaLogo(name: string) {
  await getCurrentUser();
  return logoOf(await clubLogos(), name) ?? null;
}

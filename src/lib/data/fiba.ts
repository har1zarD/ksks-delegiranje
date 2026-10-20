import { after } from "next/server";
import { cacheLife, cacheTag } from "next/cache";
import { getCurrentUser, requireRole } from "@/lib/auth";
import { LIFE, TAG } from "@/lib/cache";
import { fetchCompetitionFeed, fetchFibaGame, type FibaFeedGame } from "@/lib/fiba";
import { FIBA_CLUBS, fibaClubName } from "@/lib/fiba-clubs";
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
  const clubs = rows(await createAdminClient().from("clubs").select("id, logo_url"));
  const byId = new Map(clubs.map((club) => [club.id, club.logo_url]));
  const storage = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/club-logos`;
  return Object.fromEntries(FIBA_CLUBS.flatMap((club) => {
    const logo = club.clubId ? byId.get(club.clubId) : club.logoPath ? `${storage}/${club.logoPath}` : null;
    return logo ? club.names.map((name) => [fibaClubName(name), logo]) : [];
  }));
}

function withClubLogos<T extends Pick<FibaGameRow, "home_name" | "away_name" | "home_logo" | "away_logo">>(
  game: T,
  logos: Record<string, string>,
): T {
  return {
    ...game,
    home_logo: logos[fibaClubName(game.home_name)] ?? game.home_logo,
    away_logo: logos[fibaClubName(game.away_name)] ?? game.away_logo,
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
    logos[fibaClubName(name)] ?? (storedName ? logos[fibaClubName(storedName)] : undefined) ?? fallback;
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

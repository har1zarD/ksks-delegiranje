import { after } from "next/server";
import { cacheLife, cacheTag } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { LIFE, TAG } from "@/lib/cache";
import { fetchCompetitionFeed, fetchFibaGame, type FibaFeedGame } from "@/lib/fiba";
import { createAdminClient } from "@/lib/supabase/admin";
import { row, rows } from "./db";

// FIBA LiveStats: spisak utakmica = sve što je feed takmičenja ikad pokazao (pamti se u fiba_games) + svježi feed.
// Keširani čitači koriste servisni klijent; izvezene funkcije prvo provjere prijavu (vidi svaki prijavljeni korisnik).

const GAME_COLUMNS =
  "id, competition_id, starts_at, status, live, home_name, away_name, home_logo, away_logo, home_score, away_score, match_id" as const;

export type FibaGameRow = Omit<FibaFeedGame, "starts_at" | "competition_id"> & { starts_at: string | null; competition_id: number | null; match_id: string | null };

async function competitionRows() {
  "use cache: remote";
  cacheLife(LIFE.reference);
  cacheTag(TAG.fiba);
  return rows(await createAdminClient().from("fiba_competitions").select("id, name, sort, active").order("sort"));
}

/** Svježi feed svih aktivnih takmičenja (FIBA vraća samo zadnji/trenutni krug) */
async function feedGames() {
  "use cache: remote";
  cacheLife(LIFE.fiba);
  cacheTag(TAG.fiba);
  const competitions = (await competitionRows()).filter((c) => c.active);
  const feeds = await Promise.all(competitions.map((c) => fetchCompetitionFeed(c.id).catch(() => [])));
  return feeds.flat();
}

async function storedGames() {
  "use cache: remote";
  cacheLife(LIFE.fiba);
  cacheTag(TAG.fiba);
  return rows(
    await createAdminClient().from("fiba_games").select(GAME_COLUMNS).order("starts_at", { ascending: false, nullsFirst: false }).limit(500),
  );
}

/** Pamti utakmice iz feeda (veza s našom utakmicom, match_id, se ne dira) */
async function storeFeed(games: FibaFeedGame[]) {
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

/** Sve poznate FIBA utakmice; feed ima prednost (svježiji rezultat) i upisuje se u bazu poslije odgovora */
export async function getFibaGames(): Promise<FibaGameRow[]> {
  await getCurrentUser();
  const [feed, stored] = await Promise.all([feedGames(), storedGames()]);
  after(() => storeFeed(feed));
  const byId = new Map<number, FibaGameRow>(stored.map((g) => [g.id, g]));
  for (const g of feed) byId.set(g.id, { ...g, match_id: byId.get(g.id)?.match_id ?? null });
  return [...byId.values()];
}

async function liveGame(matchId: number) {
  "use cache: remote";
  cacheLife(LIFE.fiba);
  cacheTag(TAG.fiba, `fiba:${matchId}`);
  return fetchFibaGame(matchId);
}

async function storedGame(matchId: number) {
  "use cache: remote";
  cacheLife(LIFE.fiba);
  cacheTag(TAG.fiba);
  return row(await createAdminClient().from("fiba_games").select(GAME_COLUMNS).eq("id", matchId).maybeSingle());
}

/** Cijela utakmica s FIBA LiveStats + zapis iz baze (takmičenje, termin) */
export async function getFibaGame(matchId: number) {
  await getCurrentUser();
  const [game, stored, competitions] = await Promise.all([liveGame(matchId), storedGame(matchId), competitionRows()]);
  const competition = competitions.find((c) => c.id === stored?.competition_id) ?? null;
  return { game, stored, competition };
}

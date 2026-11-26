import { cacheLife, cacheTag } from "next/cache";
import { getCurrentUser, requireRole } from "@/lib/auth";
import { LIFE, TAG } from "@/lib/cache";
import { fetchCompetitionFeed, fetchFibaGame, type FibaFeedGame, type FibaGame } from "@/lib/fiba";
import { FIBA_CLUBS, fibaClubBase, fibaClubName } from "@/lib/fiba-clubs";
import { LEAGUE_FIBA_CATEGORIES } from "@/lib/league-fiba";
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

/**
 * Prave grupe omladinske lige iz naše baze (takmičenja tekuće sezone te kategorije, s ekipama): FIBA feed zna samo
 * trenutni krug, pa se tabela po samim FIBA utakmicama pogrešno dijeli na male grupe dok sve ekipe grupe ne odigraju
 * jedna s drugom. Prazno za seniorske kategorije (plbih, a1…) — te nemamo kao takmičenja u svojoj bazi.
 */
async function youthGroupRows(category: string) {
  "use cache: remote";
  cacheLife(LIFE.reference);
  cacheTag(TAG.competitions, TAG.teams);
  const db = createAdminClient();
  const competitions = rows(
    await db
      .from("competitions")
      .select("id, name, short_name, sort, season:seasons!competitions_season_id_fkey!inner ( is_current )")
      .eq("category", category)
      .eq("season.is_current", true)
      .order("sort")
      .order("name"),
  );
  if (competitions.length === 0) return [];
  const teams = rows(
    await db
      .from("teams")
      .select("name, competition_id, club:clubs!teams_club_id_fkey ( logo_url )")
      .in("competition_id", competitions.map((c) => c.id)),
  );
  const byGroup = new Map<string, { name: string; logo: string | null }[]>();
  for (const t of teams) byGroup.set(t.competition_id, [...(byGroup.get(t.competition_id) ?? []), { name: t.name, logo: t.club?.logo_url ?? null }]);
  return competitions.map((c) => ({ label: c.short_name ?? c.name, teams: byGroup.get(c.id) ?? [] })).filter((g) => g.teams.length > 0);
}

/** Prave grupe omladinske lige jedne kategorije (vidi `youthGroupRows`); svaki prijavljeni korisnik */
export async function getYouthGroups(category: string) {
  await getCurrentUser();
  return youthGroupRows(category);
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

export async function getFibaCompetitions() {
  await getCurrentUser();
  return competitionRows();
}

/**
 * Sve poznate FIBA utakmice (s našom utakmicom ako je povezana); svježi feed ima prednost.
 * U bazu feed upisuje samo pg_cron (sync_fiba_feed svake 2 minute): feed kasni i satima drži odigrane utakmice kao
 * SCHEDULED, pa bi upis odavde brisao rezultat koji je sync_fiba_stats uzeo iz same utakmice (tabela bez tih utakmica).
 */
export async function getFibaGames() {
  await getCurrentUser();
  const [feed, stored, linked, logos] = await Promise.all([feedGames(), storedGames(), linkedMatches(), clubLogos()]);
  const byId = new Map<number, FibaGameRow>(stored.map((g) => [g.id, g]));
  for (const g of feed) {
    const known = byId.get(g.id);
    // Zakašnjeli feed ne vraća završenu utakmicu na "zakazana"
    if (known?.status === "COMPLETE" && (g.status === "SCHEDULED" || g.status === "READY")) continue;
    byId.set(g.id, { ...g, category: g.category ?? known?.category ?? null, stream_key: known?.stream_key ?? null });
  }
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

/** Igrači završene utakmice iz baze: ID igrača, ime (s licence) i licenca, po strani i broju dresa */
async function storedPlayers(matchId: number) {
  "use cache: remote";
  cacheLife(LIFE.reference);
  cacheTag(TAG.fiba);
  return rows(
    await createAdminClient().from("fiba_player_games").select("side, number, player_id, first_name, family_name, license_id").eq("game_id", matchId),
  );
}

/** Cijela utakmica s FIBA LiveStats + zapis iz baze (termin, kategorija) + naša povezana utakmica */
export async function getFibaGame(matchId: number) {
  await getCurrentUser();
  const [stored, linked, logos, players, photos] = await Promise.all([storedGame(matchId), linkedMatches(), clubLogos(), storedPlayers(matchId), licensePhotos()]);
  const game = await liveGame(matchId, stored?.starts_at ?? null);
  const logoFor = (name: string, storedName: string | undefined, fallback: string | null) =>
    logoOf(logos, name) ?? (storedName ? logoOf(logos, storedName) : undefined) ?? fallback;
  // Liga saveza: naziv ekipe kao u takmičenju; igrač s licencom: ime s licence, ID i fotografija (box score iz baze)
  const league = Boolean(stored?.category && LEAGUE_FIBA_CATEGORIES[stored.category]);
  const withStored = (team: FibaGame["home"], side: 1 | 2, storedName: string | undefined): FibaGame["home"] => ({
    ...team,
    name: league && storedName ? storedName : team.name,
    logo: logoFor(team.name, storedName, team.logo),
    players: team.players.map((p) => {
      const own = players.find((x) => x.side === side && x.number === p.number);
      if (!own) return p;
      const name = own.license_id ? [own.first_name, own.family_name].filter(Boolean).join(" ") : p.name;
      return { ...p, name, id: own.player_id, photo: own.license_id ? photos[own.license_id]?.photo ?? null : null };
    }),
  });
  return {
    game: game ? {
      ...game,
      home: withStored(game.home, 1, stored?.home_name),
      away: withStored(game.away, 2, stored?.away_name),
    } : null,
    stored: stored ? withClubLogos(stored, logos) : null,
    match: linked.find((m) => m.fiba_game_id === matchId) ?? null,
  };
}

const SENIOR_FIBA = new Set(["plbih", "a1", "a2"]);
const SENIOR_FIBA_Z = new Set(["plbih_z", "a1_z"]);

/**
 * Naše kategorije (competitions.category) koje odgovaraju jednoj FIBA kategoriji/takmičenju, za filter kandidata
 * u getLinkCandidates — bez ovoga se nudi BILO KOJA nepovezana utakmica u ±3 dana (npr. omladinska Pioniri utakmica
 * dobije kao kandidat seniorsku Premijer ligu Ž utakmicu koja slučajno pada u isti dan). `category` je često null
 * (nova FIBA utakmica još nema podatke), zato se oslanja i na FIBA competition_id (50399 = cijela omladinska liga).
 */
function ourCategoriesFor(category: string | null, competitionId: number | null): string[] | null {
  if (category) {
    if (SENIOR_FIBA.has(category)) return ["seniori"];
    if (SENIOR_FIBA_Z.has(category)) return ["seniorke"];
    return [category]; // omladinska liga: isti naziv kategorije kod nas i na FIBA
  }
  if (competitionId === 50399) return ["pioniri", "kadeti", "juniori", "pionirke", "kadetkinje"];
  if (competitionId === 50128 || competitionId === 50201) return ["seniori"];
  if (competitionId === 50228) return ["seniorke"];
  return null;
}

/** Admin: naše utakmice bez FIBA utakmice oko termina (±3 dana), suzeno na istu kategoriju (vidi ourCategoriesFor) */
export async function getLinkCandidates(startsAt: string | null, category: string | null, competitionId: number | null) {
  await requireRole("admin");
  const at = startsAt ? Date.parse(startsAt) : Date.now();
  const day = 24 * 60 * 60 * 1000;
  const all = rows(
    await createAdminClient()
      .from("matches")
      .select(
        "id, number, starts_at, competition:competitions!matches_competition_id_fkey ( short_name, name, category ), home:teams!matches_home_team_id_fkey ( name ), away:teams!matches_away_team_id_fkey ( name )",
      )
      .is("fiba_game_id", null)
      .gte("starts_at", new Date(at - 3 * day).toISOString())
      .lte("starts_at", new Date(at + 3 * day).toISOString())
      .order("starts_at"),
  );
  const allowed = ourCategoriesFor(category, competitionId);
  return allowed ? all.filter((m) => m.competition && allowed.includes(m.competition.category)) : all;
}

// ───────── Fotografije igrača liga saveza (licence) ─────────

/** Link fotografije s licence važi 2 sata (keš se osvježava svake minute) */
const PHOTO_SECONDS = 2 * 60 * 60;

export type LicensePhoto = { photo: string | null; cutout: string | null };

/**
 * Fotografije igrača s licencom u ligama saveza (A2 jug, A1 žene): obična i izrezana (PNG bez pozadine, za slike za
 * objavu), privremeni linkovi jer je bucket licenci privatan. { [licenseId]: { photo, cutout } }
 */
async function licensePhotoRows(): Promise<Record<string, LicensePhoto>> {
  "use cache: remote";
  cacheLife(LIFE.reference);
  cacheTag(TAG.licenses);
  const db = createAdminClient();
  const list = rows(
    await db.from("licenses").select("id, photo_path, cutout_path").in("competition_id", Object.values(LEAGUE_FIBA_CATEGORIES)).eq("kind", "player"),
  );
  const paths = [...new Set(list.flatMap((l) => [l.photo_path, l.cutout_path].filter((p): p is string => Boolean(p))))];
  const { data: signed } = paths.length ? await db.storage.from("licenses").createSignedUrls(paths, PHOTO_SECONDS) : { data: [] };
  const urls = new Map((signed ?? []).flatMap((s) => (s.path && s.signedUrl ? [[s.path, s.signedUrl] as const] : [])));
  return Object.fromEntries(
    list.map((l) => [l.id, { photo: l.photo_path ? urls.get(l.photo_path) ?? null : null, cutout: l.cutout_path ? urls.get(l.cutout_path) ?? null : null }]),
  );
}

/** Fotografije igrača liga saveza; zove je samo kod koji je prijavu već provjerio */
export async function licensePhotos() {
  return licensePhotoRows();
}

// ───────── Statistika (box score završenih utakmica u bazi: fiba_player_games, fiba_team_games) ─────────

const LINE = "pts, fgm, fga, tpm, tpa, ftm, fta, oreb, dreb, reb, ast, stl, blk, tov, pf, eff" as const;
const TEAM_GAME = `game_id, side, team_name, club_key, coach, score, periods, ${LINE}, paint, fast_break, second_chance, from_turnovers, bench, biggest_lead, biggest_run, lead_changes, times_tied` as const;
const PLAYER_GAME = `game_id, side, player_id, team_name, first_name, family_name, number, position, starter, captain, seconds, ${LINE}, fd, plus_minus, license_id` as const;

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

/** Igrači kategorije u sezoni (prosjeci) s logom ekipe i fotografijom s licence */
export async function getFibaSeason(category: string, seasonKey: string) {
  await getCurrentUser();
  const [season, logos, photos] = await Promise.all([seasonRows(category, seasonKey), clubLogos(), licensePhotos()]);
  return season.map((p) => ({ ...p, logo: logoOf(logos, p.team_name ?? "") ?? null, photo: p.license_id ? photos[p.license_id]?.photo ?? null : null }));
}

export async function getFibaAliases() {
  await getCurrentUser();
  return teamAliases();
}

/** Igrač: sve njegove utakmice (s rezultatom i protivnikom) i fotografija s licence */
export async function getFibaPlayer(playerId: string) {
  await getCurrentUser();
  const [lines, logos, photos] = await Promise.all([playerLines(playerId), clubLogos(), licensePhotos()]);
  const license = lines.find((l) => l.license_id)?.license_id;
  return { lines: lines.map((l) => ({ ...l, game: withClubLogos(l.game, logos) })), photo: license ? photos[license]?.photo ?? null : null };
}

/** Igrači ekipe u kategoriji (po utakmici), s fotografijom s licence */
export async function getFibaTeamPlayers(category: string, teamName: string) {
  await getCurrentUser();
  const [lines, photos] = await Promise.all([teamPlayerLines(category, teamName), licensePhotos()]);
  return lines.map((l) => ({ ...l, photo: l.license_id ? photos[l.license_id]?.photo ?? null : null }));
}

/** Logo FIBA ekipe po nazivu */
export async function getFibaLogo(name: string) {
  await getCurrentUser();
  return logoOf(await clubLogos(), name) ?? null;
}

import { cacheLife, cacheTag } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser, homeFor, requireRole } from "@/lib/auth";
import { LIFE, TAG } from "@/lib/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { rows } from "./db";

// Licence (admin): takmičenje → klub (folder iz license_folders) → igrači i službena lica.
// Omladinska liga KS (juniori, kadeti, pioniri, minibasket, unobasket) je jedan folder s kategorijama; u kategoriji
// tekuće sezone je svaki klub koji u njoj ima ekipu, bez ručnog pravljenja foldera. Klub s više ekipa u kategoriji
// (npr. Realway Plavi, Bijeli i Akademija) ima folder po ekipi: id foldera je tada id ekipe, a licence imaju team_id.
// ŽOL, WABA i srednje škole nisu dio lige.
// Fotografije su u privatnom bucketu "licenses"; link za pregled se pravi po zahtjevu, izvan keša.

export const LICENSE_BUCKET = "licenses";

/** Koliko dugo važi link za fotografiju */
const VIEW_SECONDS = 60 * 60;

const COMPETITION = "competition:competitions!license_folders_competition_id_fkey ( id, name, category, sort, season:seasons!competitions_season_id_fkey ( name ) )";
const CLUB = "club:clubs!license_folders_club_id_fkey ( id, name, short_name, logo_url )";
const TEAM_COMPETITION = "competition:competitions!teams_competition_id_fkey!inner ( id, name, category, sort, parent_id, season:seasons!competitions_season_id_fkey!inner ( name, is_current ) )";
const TEAM_CLUB = "club:clubs!teams_club_id_fkey ( id, name, short_name, logo_url )";

/** Kategorije Omladinske lige KS, redom kako stoje u folderu */
const YOUTH_ORDER = ["juniori", "kadeti", "pioniri", "minibasket", "unobasket"];
const isYouth = (category: string) => YOUTH_ORDER.includes(category);
/** Drugi red foldera: grupe 2 i unobasket */
const youthTier = (name: string, category: string) => (category === "unobasket" || /\b(?:grupa|g)\s*2\b/i.test(name) ? 2 : 1);

/** Folderi: napravljeni (license_folders) + klub sa ekipom u omladinskom takmičenju tekuće sezone (ekipa, ako ih klub ima više) */
async function folderRows() {
  "use cache: remote";
  cacheLife(LIFE.reference);
  cacheTag(TAG.licenses, TAG.clubs, TAG.competitions, TAG.teams);
  const db = createAdminClient();
  const [saved, teams] = await Promise.all([
    db.from("license_folders").select(`competition_id, club_id, name, ${COMPETITION}, ${CLUB}`).order("created_at"),
    db
      .from("teams")
      .select(`id, name, competition_id, club_id, ${TEAM_COMPETITION}, ${TEAM_CLUB}`)
      .eq("competition.season.is_current", true)
      .is("competition.parent_id", null),
  ]);
  const youthTeams = rows(teams).filter((t) => isYouth(t.competition.category));
  const teamCount = new Map<string, number>();
  for (const t of youthTeams) {
    const key = `${t.competition_id}/${t.club_id}`;
    teamCount.set(key, (teamCount.get(key) ?? 0) + 1);
  }
  const perTeam = (key: string) => (teamCount.get(key) ?? 0) > 1;

  const folders = rows(saved)
    .filter((f) => !perTeam(`${f.competition_id}/${f.club_id}`))
    .map((f) => ({ ...f, team_id: null as string | null }));
  const keys = new Set(folders.map((f) => `${f.competition_id}/${f.club_id}`));
  for (const t of youthTeams) {
    const key = `${t.competition_id}/${t.club_id}`;
    const team = perTeam(key);
    if (!team && keys.has(key)) continue;
    keys.add(key);
    folders.push({ competition_id: t.competition_id, club_id: t.club_id, team_id: team ? t.id : null, name: team ? t.name : null, competition: t.competition, club: t.club });
  }
  return folders;
}

async function licenseRows() {
  "use cache: remote";
  cacheLife(LIFE.reference);
  cacheTag(TAG.licenses);
  return rows(
    await createAdminClient()
      .from("licenses")
      .select("id, competition_id, club_id, team_id, kind, role, last_name, first_name, birth_date, birth_place, height_cm, position, license_no, photo_path, sort")
      .order("sort"),
  );
}

type FolderRow = Awaited<ReturnType<typeof folderRows>>[number];
type LicenseRow = Awaited<ReturnType<typeof licenseRows>>[number];

/** Id foldera u linku: ekipa kad klub ima više ekipa u takmičenju, inače klub */
const folderId = (f: FolderRow) => f.team_id ?? f.club_id;

/** Licence foldera: po ekipi ili svi iz kluba u takmičenju */
const inFolder = (l: LicenseRow, f: FolderRow) =>
  l.competition_id === f.competition_id && (f.team_id ? l.team_id === f.team_id : l.club_id === f.club_id);

function competitionOf(r: FolderRow) {
  const c = r.competition;
  return { id: c.id, name: c.name, category: c.category, sort: c.sort, season: c.season?.name ?? null, youth: isYouth(c.category), tier: youthTier(c.name, c.category) };
}

function clubOf(r: FolderRow) {
  // Folder može imati svoje ime (ekipa nastupa pod drugim imenom u tom takmičenju, ili folder ekipe)
  return { id: folderId(r), clubId: r.club.id, name: r.name ?? r.club.name, shortName: r.name ? null : r.club.short_name, logoUrl: r.club.logo_url };
}

/** Folderi: takmičenja koja imaju bar jedan folder kluba, s brojem klubova i licenci; omladinska odvojeno (jedan folder) */
export async function getLicenseCompetitions() {
  await requireRole("admin");
  return licenseCompetitions();
}

async function licenseCompetitions() {
  const [folders, licenses] = await Promise.all([folderRows(), licenseRows()]);
  const byCompetition = new Map<string, ReturnType<typeof competitionOf> & { clubCount: number; count: number }>();
  for (const f of folders) {
    const c = byCompetition.get(f.competition_id) ?? { ...competitionOf(f), clubCount: 0, count: 0 };
    c.clubCount++;
    byCompetition.set(c.id, c);
  }
  for (const l of licenses) {
    const c = byCompetition.get(l.competition_id);
    if (c) c.count++;
  }
  const all = [...byCompetition.values()].sort((a, b) => a.sort - b.sort || a.name.localeCompare(b.name, "bs"));
  const youth = all
    .filter((c) => c.youth)
    .sort((a, b) => a.tier - b.tier || YOUTH_ORDER.indexOf(a.category) - YOUTH_ORDER.indexOf(b.category) || a.name.localeCompare(b.name, "bs"));
  return { youth, others: all.filter((c) => !c.youth) };
}

/** Folder u takmičenju po id-u iz linka (napravljen, omladinski klub ili ekipa); klub i ekipa za novu licencu */
export async function licenseFolder(competitionId: string, id: string) {
  const f = (await folderRows()).find((f) => f.competition_id === competitionId && folderId(f) === id);
  return f ? { clubId: f.club_id, teamId: f.team_id } : null;
}

/** Folderi klubova u takmičenju, s brojem igrača i službenih lica */
export async function getLicenseClubs(competitionId: string) {
  await requireRole("admin");
  return licenseClubs(competitionId);
}

async function licenseClubs(competitionId: string) {
  const [folders, licenses] = await Promise.all([folderRows(), licenseRows()]);
  const list = folders.filter((f) => f.competition_id === competitionId);
  if (list.length === 0) return null;
  const clubs = list.map((f) => {
    const own = licenses.filter((l) => inFolder(l, f));
    return { ...clubOf(f), players: own.filter((l) => l.kind === "player").length, officials: own.filter((l) => l.kind !== "player").length };
  });
  return {
    competition: competitionOf(list[0]),
    clubs: clubs.sort((a, b) => a.name.localeCompare(b.name, "bs")),
  };
}

/** Licence jednog foldera (klub ili ekipa) u takmičenju (folder može biti prazan), s privremenim linkom za fotografiju */
export async function getClubLicenses(competitionId: string, id: string) {
  await requireRole("admin");
  return clubLicenses(competitionId, id);
}

async function clubLicenses(competitionId: string, id: string) {
  const [folders, all] = await Promise.all([folderRows(), licenseRows()]);
  const folder = folders.find((f) => f.competition_id === competitionId && folderId(f) === id);
  if (!folder) return null;
  const list = all.filter((l) => inFolder(l, folder));

  const paths = [...new Set(list.flatMap((r) => (r.photo_path ? [r.photo_path] : [])))];
  const { data: signed } = paths.length
    ? await createAdminClient().storage.from(LICENSE_BUCKET).createSignedUrls(paths, VIEW_SECONDS)
    : { data: [] };
  const urls = new Map((signed ?? []).flatMap((s) => (s.path && s.signedUrl ? [[s.path, s.signedUrl] as const] : [])));

  const licenses = list.map((r) => ({
    id: r.id,
    kind: r.kind,
    role: r.role,
    lastName: r.last_name,
    firstName: r.first_name,
    birthDate: r.birth_date,
    birthPlace: r.birth_place,
    heightCm: r.height_cm,
    position: r.position,
    licenseNo: r.license_no,
    sort: r.sort,
    photoUrl: r.photo_path ? (urls.get(r.photo_path) ?? null) : null,
  }));

  return {
    competition: competitionOf(folder),
    club: clubOf(folder),
    players: licenses.filter((l) => l.kind === "player"),
    officials: licenses.filter((l) => l.kind !== "player"),
  };
}

/** Komesar (uloga ili oznaka na profilu) samo gleda licence Omladinske lige KS; savez ide na svoje stranice */
async function requireYouthViewer() {
  const user = await getCurrentUser();
  if (user.role === "admin") redirect("/admin/licence");
  if (user.role !== "commissioner" && !user.isCommissioner) redirect(homeFor(user.role));
}

/** Komesar: kategorije Omladinske lige KS */
export async function getYouthLicenseCompetitions() {
  await requireYouthViewer();
  return (await licenseCompetitions()).youth;
}

/** Komesar: klubovi u kategoriji Omladinske lige KS (druga takmičenja = nema) */
export async function getYouthLicenseClubs(competitionId: string) {
  await requireYouthViewer();
  const data = await licenseClubs(competitionId);
  return data?.competition.youth ? data : null;
}

/** Komesar: licence kluba u kategoriji Omladinske lige KS */
export async function getYouthClubLicenses(competitionId: string, id: string) {
  await requireYouthViewer();
  const data = await clubLicenses(competitionId, id);
  return data?.competition.youth ? data : null;
}

export type ClubLicenses = NonNullable<Awaited<ReturnType<typeof getClubLicenses>>>;
export type License = ClubLicenses["players"][number];

async function folderOptionRows() {
  "use cache: remote";
  cacheLife(LIFE.reference);
  cacheTag(TAG.competitions, TAG.teams, TAG.clubs);
  const db = createAdminClient();
  const [competitions, clubs] = await Promise.all([
    db
      .from("competitions")
      .select("id, name, season:seasons!competitions_season_id_fkey!inner ( is_current ), teams ( club_id )")
      .eq("season.is_current", true)
      .is("parent_id", null)
      .order("sort")
      .order("name"),
    db.from("clubs").select("id, name, logo_url").eq("active", true).order("name"),
  ]);
  return { competitions: rows(competitions), clubs: rows(clubs) };
}

/** Za novi folder: takmičenja tekuće sezone (s klubovima koji u njima imaju ekipu) i svi aktivni klubovi */
export async function getLicenseFolderOptions() {
  await requireRole("admin");
  const { competitions, clubs } = await folderOptionRows();
  return {
    competitions: competitions.map((c) => ({
      id: c.id,
      name: c.name,
      clubIds: [...new Set(c.teams.map((t) => t.club_id))],
    })),
    clubs: clubs.map((c) => ({ id: c.id, name: c.name, logoUrl: c.logo_url })),
  };
}

export type LicenseFolderOptions = Awaited<ReturnType<typeof getLicenseFolderOptions>>;

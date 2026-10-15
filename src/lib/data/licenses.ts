import { cacheLife, cacheTag } from "next/cache";
import { requireRole } from "@/lib/auth";
import { LIFE, TAG } from "@/lib/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { rows } from "./db";

// Licence (admin): takmičenje → klub (folder iz license_folders) → igrači i službena lica.
// Fotografije su u privatnom bucketu "licenses"; link za pregled se pravi po zahtjevu, izvan keša.

export const LICENSE_BUCKET = "licenses";

/** Koliko dugo važi link za fotografiju */
const VIEW_SECONDS = 60 * 60;

const COMPETITION = "competition:competitions!license_folders_competition_id_fkey ( id, name, category, season:seasons!competitions_season_id_fkey ( name ) )";
const CLUB = "club:clubs!license_folders_club_id_fkey ( id, name, short_name, logo_url )";

async function folderRows() {
  "use cache: remote";
  cacheLife(LIFE.reference);
  cacheTag(TAG.licenses, TAG.clubs, TAG.competitions);
  return rows(await createAdminClient().from("license_folders").select(`competition_id, club_id, created_at, ${COMPETITION}, ${CLUB}`).order("created_at"));
}

async function licenseRows() {
  "use cache: remote";
  cacheLife(LIFE.reference);
  cacheTag(TAG.licenses);
  return rows(
    await createAdminClient()
      .from("licenses")
      .select("id, competition_id, club_id, kind, role, last_name, first_name, birth_date, birth_place, height_cm, position, license_no, photo_path, sort")
      .order("sort"),
  );
}

type FolderRow = Awaited<ReturnType<typeof folderRows>>[number];

function competitionOf(r: FolderRow) {
  return { id: r.competition.id, name: r.competition.name, category: r.competition.category, season: r.competition.season?.name ?? null };
}

function clubOf(r: FolderRow) {
  return { id: r.club.id, name: r.club.name, shortName: r.club.short_name, logoUrl: r.club.logo_url };
}

/** Folderi: takmičenja koja imaju bar jedan folder kluba, s brojem klubova i licenci */
export async function getLicenseCompetitions() {
  await requireRole("admin");
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
  return [...byCompetition.values()];
}

/** Folderi klubova u takmičenju, s brojem igrača i službenih lica */
export async function getLicenseClubs(competitionId: string) {
  await requireRole("admin");
  const [folders, licenses] = await Promise.all([folderRows(), licenseRows()]);
  const list = folders.filter((f) => f.competition_id === competitionId);
  if (list.length === 0) return null;
  const clubs = list.map((f) => {
    const own = licenses.filter((l) => l.competition_id === competitionId && l.club_id === f.club_id);
    return { ...clubOf(f), players: own.filter((l) => l.kind === "player").length, officials: own.filter((l) => l.kind !== "player").length };
  });
  return {
    competition: competitionOf(list[0]),
    clubs: clubs.sort((a, b) => a.name.localeCompare(b.name, "bs")),
  };
}

/** Licence jednog kluba u takmičenju (folder može biti prazan), s privremenim linkom za fotografiju */
export async function getClubLicenses(competitionId: string, clubId: string) {
  await requireRole("admin");
  const [folders, all] = await Promise.all([folderRows(), licenseRows()]);
  const folder = folders.find((f) => f.competition_id === competitionId && f.club_id === clubId);
  if (!folder) return null;
  const list = all.filter((l) => l.competition_id === competitionId && l.club_id === clubId);

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

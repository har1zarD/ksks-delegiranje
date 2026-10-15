import { cacheLife, cacheTag } from "next/cache";
import { requireRole } from "@/lib/auth";
import { LIFE, TAG } from "@/lib/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { rows } from "./db";

// Licence (admin): takmičenje → klub → igrači i službena lica.
// Fotografije su u privatnom bucketu "licenses"; link za pregled se pravi po zahtjevu, izvan keša.

export const LICENSE_BUCKET = "licenses";

/** Koliko dugo važi link za fotografiju */
const VIEW_SECONDS = 60 * 60;

async function licenseRows() {
  "use cache: remote";
  cacheLife(LIFE.reference);
  cacheTag(TAG.licenses, TAG.clubs, TAG.competitions);
  return rows(
    await createAdminClient()
      .from("licenses")
      .select("id, kind, role, last_name, first_name, birth_date, birth_place, height_cm, position, license_no, photo_path, sort, competition:competitions!licenses_competition_id_fkey ( id, name, category, season:seasons!competitions_season_id_fkey ( name ) ), club:clubs!licenses_club_id_fkey ( id, name, short_name, logo_url )")
      .order("sort"),
  );
}

type LicenseRow = Awaited<ReturnType<typeof licenseRows>>[number];

function competitionOf(r: LicenseRow) {
  return { id: r.competition.id, name: r.competition.name, category: r.competition.category, season: r.competition.season?.name ?? null };
}

function clubOf(r: LicenseRow) {
  return { id: r.club.id, name: r.club.name, shortName: r.club.short_name, logoUrl: r.club.logo_url };
}

/** Folderi: takmičenja koja imaju licence, s brojem klubova i licenci */
export async function getLicenseCompetitions() {
  await requireRole("admin");
  const byCompetition = new Map<string, ReturnType<typeof competitionOf> & { clubs: Set<string>; count: number }>();
  for (const r of await licenseRows()) {
    const c = byCompetition.get(r.competition.id) ?? { ...competitionOf(r), clubs: new Set<string>(), count: 0 };
    c.clubs.add(r.club.id);
    c.count++;
    byCompetition.set(c.id, c);
  }
  return [...byCompetition.values()].map(({ clubs, ...c }) => ({ ...c, clubCount: clubs.size }));
}

/** Folderi klubova u takmičenju, s brojem igrača i službenih lica */
export async function getLicenseClubs(competitionId: string) {
  await requireRole("admin");
  const list = (await licenseRows()).filter((r) => r.competition.id === competitionId);
  if (list.length === 0) return null;
  const byClub = new Map<string, ReturnType<typeof clubOf> & { players: number; officials: number }>();
  for (const r of list) {
    const c = byClub.get(r.club.id) ?? { ...clubOf(r), players: 0, officials: 0 };
    if (r.kind === "player") c.players++;
    else c.officials++;
    byClub.set(c.id, c);
  }
  return {
    competition: competitionOf(list[0]),
    clubs: [...byClub.values()].sort((a, b) => a.name.localeCompare(b.name, "bs")),
  };
}

/** Licence jednog kluba u takmičenju, s privremenim linkom za fotografiju */
export async function getClubLicenses(competitionId: string, clubId: string) {
  await requireRole("admin");
  const list = (await licenseRows()).filter((r) => r.competition.id === competitionId && r.club.id === clubId);
  if (list.length === 0) return null;

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
    competition: competitionOf(list[0]),
    club: clubOf(list[0]),
    players: licenses.filter((l) => l.kind === "player"),
    officials: licenses.filter((l) => l.kind !== "player"),
  };
}

export type ClubLicenses = NonNullable<Awaited<ReturnType<typeof getClubLicenses>>>;
export type License = ClubLicenses["players"][number];

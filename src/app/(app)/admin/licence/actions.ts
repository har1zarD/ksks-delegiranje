"use server";

import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { invalidate } from "@/lib/cache";
import { LICENSE_BUCKET, licenseFolder } from "@/lib/data/licenses";
import { createAdminClient } from "@/lib/supabase/admin";
import { LICENSE_POSITIONS, LICENSE_ROLES } from "./options";

export type LicenseState = { error?: string; ok?: number };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const text = (f: FormData, k: string, max = 80) => String(f.get(k) ?? "").trim().slice(0, max);

/** "11.02.1996", "11. 2. 1996." ili "1996-02-11" → "1996-02-11"; null ako nije ispravan datum */
function parseBirthDate(s: string) {
  const m = /^(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})\.?$/.exec(s) ?? /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const [y, mo, d] = s.includes("-") ? [m[1], m[2], m[3]] : [m[3], m[2], m[1]];
  const iso = `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
  const date = new Date(`${iso}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(iso) && Number(y) >= 1900 ? iso : null;
}

/** Novi folder (klub u takmičenju); ako već postoji, samo ga otvori */
export async function createLicenseFolder(_prev: LicenseState, f: FormData): Promise<LicenseState> {
  await requireRole("admin");
  const competitionId = text(f, "competition_id");
  const clubId = text(f, "club_id");
  if (!UUID.test(competitionId)) return { error: "Izaberi takmičenje." };
  if (!UUID.test(clubId)) return { error: "Izaberi klub." };

  const { error } = await createAdminClient()
    .from("license_folders")
    .upsert({ competition_id: competitionId, club_id: clubId }, { onConflict: "competition_id,club_id", ignoreDuplicates: true });
  if (error) return { error: error.code === "23503" ? "Takmičenje ili klub ne postoji." : "Folder nije napravljen. Pokušaj ponovo." };

  invalidate("license_folders");
  redirect(`/admin/licence/${competitionId}/${clubId}`);
}

const PHOTO_EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

/** Link za upload fotografije direktno u Storage (zaobilazi ograničenje veličine Server Action zahtjeva) */
export async function createLicensePhotoUpload(clubId: string, contentType: string): Promise<{ error?: string; path?: string; token?: string }> {
  await requireRole("admin");
  if (!UUID.test(clubId)) return { error: "Klub nije pronađen." };
  const ext = PHOTO_EXT[contentType];
  if (!ext) return { error: "Fotografija mora biti JPG, PNG ili WEBP." };

  const path = `${clubId}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
  const { data, error } = await createAdminClient().storage.from(LICENSE_BUCKET).createSignedUploadUrl(path);
  if (error) return { error: "Upload fotografije nije pripremljen. Pokušaj ponovo." };
  return { path: data.path, token: data.token };
}

/** Nova licenca u folderu (klub ili ekipa): igrač (datum i mjesto rođenja, visina, pozicija) ili službeno lice (funkcija) */
export async function addLicense(prev: LicenseState, f: FormData): Promise<LicenseState> {
  await requireRole("admin");
  const competitionId = text(f, "competition_id");
  const folderId = text(f, "folder_id");
  const kind = text(f, "kind");
  const lastName = text(f, "last_name");
  const firstName = text(f, "first_name");
  const birth = text(f, "birth_date", 20);
  const height = text(f, "height_cm", 5);
  const position = text(f, "position", 5);
  const role = text(f, "role");
  const photoPath = text(f, "photo_path", 200);

  if (!UUID.test(competitionId) || !UUID.test(folderId)) return { error: "Folder nije pronađen." };
  const folder = await licenseFolder(competitionId, folderId);
  if (!folder) return { error: "Folder nije pronađen." };
  const { clubId, teamId } = folder;
  if (kind !== "player" && kind !== "official") return { error: "Izaberi igrač ili službeno lice." };
  if (!lastName || !firstName) return { error: "Upiši prezime i ime." };

  const player = kind === "player";
  const birthDate = player && birth ? parseBirthDate(birth) : null;
  if (player && birth && !birthDate) return { error: "Datum rođenja upiši kao 11.02.1996." };
  const heightCm = player && height ? Number(height) : null;
  if (heightCm !== null && (!Number.isInteger(heightCm) || heightCm < 100 || heightCm > 250)) return { error: "Visina je u centimetrima (100–250)." };
  if (player && position && !(LICENSE_POSITIONS as readonly string[]).includes(position)) return { error: "Nepoznata pozicija." };
  if (!player && !(LICENSE_ROLES as readonly string[]).includes(role)) return { error: "Izaberi funkciju." };
  // Fotografija samo iz foldera ovog kluba (bez podfoldera i "..")
  if (photoPath && (!new RegExp(`^${clubId}/[\\w.-]+$`).test(photoPath) || photoPath.includes(".."))) return { error: "Nepoznata fotografija." };

  const db = createAdminClient();
  const inFolder = db.from("licenses").select("sort").eq("competition_id", competitionId).eq("kind", kind);
  const { data: last } = await (teamId ? inFolder.eq("team_id", teamId) : inFolder.eq("club_id", clubId)).order("sort", { ascending: false }).limit(1).maybeSingle();

  const { error } = await db.from("licenses").insert({
    competition_id: competitionId,
    club_id: clubId,
    team_id: teamId,
    kind,
    role: player ? null : role,
    last_name: lastName,
    first_name: firstName,
    birth_date: birthDate,
    birth_place: player ? text(f, "birth_place") || null : null,
    height_cm: heightCm,
    position: player ? position || null : null,
    license_no: text(f, "license_no", 40) || null,
    photo_path: photoPath || null,
    sort: (last?.sort ?? 0) + 1,
  });
  if (error) return { error: "Licenca nije sačuvana. Pokušaj ponovo." };

  invalidate("licenses");
  return { ok: (prev.ok ?? 0) + 1 };
}

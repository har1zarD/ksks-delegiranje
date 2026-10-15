// Slike zapisnika u privatnom bucketu "scoresheets" (putanja <match_id>/<ime>).
// Bucket nema storage politike: sve ide servisnim klijentom, NAKON provjere pristupa ovdje.
import type { CurrentUser } from "@/lib/auth";
import { nominationGroupOf } from "@/lib/crew";
import { createAdminClient } from "@/lib/supabase/admin";

export const SCORESHEET_BUCKET = "scoresheets";

/** Koliko dugo važi link za pregled slike */
const VIEW_SECONDS = 60 * 60;

export type MatchRole = "admin" | "commissioner" | "table" | null;

/** Uloga korisnika na utakmici: admin, prihvaćeni komesar ili prihvaćeni pomoćni sudija (sto, statistika) */
export async function matchRoleOf(user: CurrentUser, matchId: string): Promise<MatchRole> {
  if (user.role === "admin") return "admin";
  const { data } = await createAdminClient()
    .from("assignments")
    .select("position")
    .eq("match_id", matchId)
    .eq("profile_id", user.id)
    .eq("status", "accepted")
    .not("notified_at", "is", null);
  const positions = (data ?? []).map((a) => a.position);
  if (positions.includes("commissioner")) return "commissioner";
  if (positions.some((p) => nominationGroupOf(p) === "table")) return "table";
  return null;
}

export type Scoresheet = { path: string; url: string; uploadedAt: string | null };

/** Slike zapisnika utakmice, najstarija prva, s privremenim linkom za pregled */
export async function listScoresheets(matchId: string): Promise<Scoresheet[]> {
  const storage = createAdminClient().storage.from(SCORESHEET_BUCKET);
  const { data: files } = await storage.list(matchId, { sortBy: { column: "created_at", order: "asc" } });
  const images = (files ?? []).filter((f) => f.id);
  if (images.length === 0) return [];
  const paths = images.map((f) => `${matchId}/${f.name}`);
  const { data: signed } = await storage.createSignedUrls(paths, VIEW_SECONDS);
  return images.flatMap((f, i) => {
    const url = signed?.[i]?.signedUrl;
    return url ? [{ path: paths[i], url, uploadedAt: f.created_at ?? null }] : [];
  });
}

/** Id-evi utakmica koje imaju bar jednu sliku zapisnika (jedan upit: folderi u korijenu bucketa) */
export async function matchesWithScoresheets(): Promise<Set<string>> {
  const { data } = await createAdminClient().storage.from(SCORESHEET_BUCKET).list("", { limit: 1000 });
  return new Set((data ?? []).filter((f) => !f.id).map((f) => f.name));
}

"use server";

import { requireRole } from "@/lib/auth";
import { invalidate } from "@/lib/cache";
import { assignPerson, DelegationError, removeAssignment, replaceAssignment } from "@/lib/delegation";
import { POSITION_ORDER, type Position } from "@/lib/format";
import { createAdminClient } from "@/lib/supabase/admin";

export type AssignState = { error?: string };

export async function assign(_prev: AssignState, formData: FormData): Promise<AssignState> {
  const admin = await requireRole("admin");
  const matchId = String(formData.get("match_id") ?? "");
  const profileId = String(formData.get("profile_id") ?? "");
  const position = String(formData.get("position") ?? "") as Position;
  if (!profileId) return { error: "Izaberi osobu." };
  if (!POSITION_ORDER.includes(position)) return { error: "Nepoznata pozicija." };

  try {
    await assignPerson(createAdminClient(), { matchId, profileId, position, createdBy: admin.id });
  } catch (e) {
    return { error: e instanceof DelegationError ? e.message : "Delegiranje nije sačuvano. Pokušaj ponovo." };
  } finally {
    // I neuspjeli pokušaj je mogao obrisati odbijene/otkazane nominacije
    invalidate({ table: "assignments", match: matchId });
  }
  return {};
}

/** Neposlana nominacija se briše; poslana se otkazuje i osoba dobije email. */
export async function unassign(formData: FormData) {
  await requireRole("admin");
  try {
    const { matchId } = await removeAssignment(createAdminClient(), String(formData.get("id") ?? ""));
    invalidate({ table: "assignments", match: matchId });
  } catch (e) {
    if (!(e instanceof DelegationError)) throw e;
  }
}

export type ReplaceState = { error?: string; done?: string };

/** Zamjena osobe; nova dobija nominaciju utakmice emailom ako je stara već bila poslana */
export async function replace(_prev: ReplaceState, formData: FormData): Promise<ReplaceState> {
  const admin = await requireRole("admin");
  const assignmentId = String(formData.get("assignment_id") ?? "");
  const profileId = String(formData.get("profile_id") ?? "");
  if (!profileId) return { error: "Izaberi osobu." };
  try {
    const r = await replaceAssignment(createAdminClient(), { assignmentId, profileId, createdBy: admin.id });
    invalidate({ table: "assignments", match: r.matchId });
    return { done: r.emailed ? `Zamijenjeno: ${r.name}. Nominacija je poslana emailom.` : `Zamijenjeno: ${r.name}.` };
  } catch (e) {
    return { error: e instanceof DelegationError ? e.message : "Zamjena nije sačuvana. Pokušaj ponovo." };
  }
}

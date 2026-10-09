"use server";

import { refresh } from "next/cache";
import { requireRole } from "@/lib/auth";
import { assignPerson, DelegationError, removeAssignment, sendMatchNominations } from "@/lib/delegation";
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
  }
  refresh();
  return {};
}

/** Neposlana nominacija se briše; poslana se otkazuje i osoba dobije email. */
export async function unassign(formData: FormData) {
  await requireRole("admin");
  try {
    await removeAssignment(createAdminClient(), String(formData.get("id") ?? ""));
  } catch (e) {
    if (!(e instanceof DelegationError)) throw e;
  }
  refresh();
}

export type SendState = { error?: string; sent?: number };

export async function sendNominations(_prev: SendState, formData: FormData): Promise<SendState> {
  await requireRole("admin");
  let results;
  try {
    results = await sendMatchNominations(createAdminClient(), String(formData.get("match_id") ?? ""));
  } catch {
    return { error: "Nominacije nisu učitane." };
  }
  refresh();
  const sent = results.filter((r) => r.sent).length;
  const failed = results.length - sent;
  return failed > 0 ? { sent, error: `${failed} emailova nije poslano. Provjeri podešavanje emaila.` } : { sent };
}

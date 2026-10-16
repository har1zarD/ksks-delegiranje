"use server";

import { requireRole } from "@/lib/auth";
import { invalidate } from "@/lib/cache";
import { CREW_COLUMNS, crewOf, crewPositions, crewToRow, crewWithout, crewWithPosition } from "@/lib/crew";
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

const positionFrom = (formData: FormData) => {
  const matchId = String(formData.get("match_id") ?? "");
  const position = String(formData.get("position") ?? "") as Position;
  return /^[0-9a-f-]{36}$/i.test(matchId) && POSITION_ORDER.includes(position) ? { matchId, position } : null;
};

/**
 * Uklanja praznu poziciju sa utakmice (npr. bez stola, samo sudije). Pozicije koje bi nestale (kod sudija i statistike
 * nestaje zadnja u grupi) moraju biti bez osobe; stranica dugme i prikazuje samo tada. Vraćanje: "Dodaj poziciju".
 */
export async function removePosition(formData: FormData) {
  await requireRole("admin");
  const input = positionFrom(formData);
  if (!input) return;
  const { matchId, position } = input;

  const db = createAdminClient();
  const { data: match } = await db.from("matches").select(CREW_COLUMNS).eq("id", matchId).maybeSingle();
  if (!match) return;
  const crew = crewOf(match);
  const next = crewWithout(crew, position);
  const kept = crewPositions(next);
  const gone = crewPositions(crew).filter((p) => !kept.includes(p));
  if (gone.length === 0) return;

  const { count } = await db.from("assignments").select("id", { count: "exact", head: true }).eq("match_id", matchId).in("position", gone).in("status", ["pending", "accepted"]);
  if (count) return; // pozicija nije prazna

  const { error } = await db.from("matches").update(crewToRow(next)).eq("id", matchId);
  if (error) throw new Error(error.message);
  invalidate({ table: "matches", match: matchId });
}

/** Dodaje poziciju na utakmicu ("Dodaj poziciju" ispod delegiranja): 3. sudija, zapisnik, semafor, statistika… */
export async function addPosition(formData: FormData) {
  await requireRole("admin");
  const input = positionFrom(formData);
  if (!input) return;
  const { matchId, position } = input;

  const db = createAdminClient();
  const { data: match } = await db.from("matches").select(CREW_COLUMNS).eq("id", matchId).maybeSingle();
  if (!match) return;
  const crew = crewOf(match);
  const next = crewWithPosition(crew, position);
  if (crewPositions(next).length === crewPositions(crew).length) return;

  const { error } = await db.from("matches").update(crewToRow(next)).eq("id", matchId);
  if (error) throw new Error(error.message);
  invalidate({ table: "matches", match: matchId });
}

export type ReplaceState = { error?: string; done?: string };

/** Zamjena osobe; ako je stara nominacija već bila poslana, izmijenjena nominacija ide ekipi utakmice i staroj osobi */
export async function replace(_prev: ReplaceState, formData: FormData): Promise<ReplaceState> {
  const admin = await requireRole("admin");
  const assignmentId = String(formData.get("assignment_id") ?? "");
  const profileId = String(formData.get("profile_id") ?? "");
  if (!profileId) return { error: "Izaberi osobu." };
  try {
    const r = await replaceAssignment(createAdminClient(), { assignmentId, profileId, createdBy: admin.id });
    invalidate({ table: "assignments", match: r.matchId }, { table: "matches", match: r.matchId });
    return { done: r.emailed ? `Zamijenjeno: ${r.name}. Izmijenjena nominacija je poslana emailom.` : `Zamijenjeno: ${r.name}.` };
  } catch (e) {
    return { error: e instanceof DelegationError ? e.message : "Zamjena nije sačuvana. Pokušaj ponovo." };
  }
}

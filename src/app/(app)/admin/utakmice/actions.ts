"use server";

import { redirect } from "next/navigation";
import { after } from "next/server";
import { requireRole } from "@/lib/auth";
import { invalidate } from "@/lib/cache";
import { crewFromForm, crewToRow } from "@/lib/crew";
import { candidateFits, getDelegation, type Candidate } from "@/lib/data/admin";
import { assignPerson, DelegationError, removeAssignment, replaceAssignment } from "@/lib/delegation";
import { notifyMatchChanged, publishMatches, type PublishResult } from "@/lib/publish";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { MATCH_KIND_LABEL, POSITION_ORDER, sarajevoToISO, type MatchKind, type MatchStatus, type Position } from "@/lib/format";

export type MatchFormState = { error?: string };

const STATUSES: MatchStatus[] = ["scheduled", "live", "finished", "postponed", "cancelled"];

export async function saveMatch(_prev: MatchFormState, formData: FormData): Promise<MatchFormState> {
  await requireRole("admin");
  const get = (k: string) => String(formData.get(k) ?? "").trim();

  const id = get("id");
  const date = get("date");
  const time = get("time");
  const round = get("round");
  const number = get("number");
  const status = get("status") as MatchStatus;
  const kind = (get("kind") in MATCH_KIND_LABEL ? get("kind") : "league") as MatchKind;
  const kindLabel = get("kind_label");
  const match = {
    competition_id: get("competition_id"),
    home_team_id: get("home_team_id"),
    away_team_id: get("away_team_id"),
    hall_id: get("hall_id") || null,
    round: round ? Number(round) : null,
    ...(number ? { number: Number(number) } : {}),
    ...crewToRow(crewFromForm(formData)),
    notes: get("notes") || null,
    kind,
    kind_label: kind === "custom" ? kindLabel : null,
    ...(STATUSES.includes(status) ? { status } : {}),
  };

  if (!match.competition_id || !match.home_team_id || !match.away_team_id) return { error: "Izaberi takmičenje i obje ekipe." };
  if (match.home_team_id === match.away_team_id) return { error: "Domaćin i gost moraju biti različite ekipe." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return { error: "Upiši datum i vrijeme." };
  if (match.round !== null && (!Number.isInteger(match.round) || match.round < 1)) return { error: "Kolo mora biti pozitivan broj." };
  if (kind === "custom" && !kindLabel) return { error: "Upiši naziv za utakmicu vrste Ostalo." };
  if (number && (!Number.isInteger(Number(number)) || Number(number) < 1)) return { error: "Broj utakmice mora biti pozitivan broj." };

  const supabase = await createClient();
  const row = { ...match, starts_at: sarajevoToISO(date, time) };
  // Aktivirana utakmica: stari termin, dvorana i status, da se izmjena javi službenim licima i klubovima
  const before = id ? (await supabase.from("matches").select("starts_at, hall_id, status, published_at").eq("id", id).maybeSingle()).data : null;
  const { data, error } = id
    ? await supabase.from("matches").update(row).eq("id", id).select("id").single()
    : await supabase.from("matches").insert(row).select("id").single();
  if (error?.code === "23505") return { error: `Utakmica ${number} već postoji u ovom takmičenju. Upiši drugi broj ili ostavi prazno.` };
  if (error) return { error: "Utakmica nije sačuvana. Pokušaj ponovo." };

  // Prije redirecta: redirect prekida izvršavanje
  invalidate({ table: "matches", match: data.id });
  if (
    id &&
    before?.published_at &&
    (new Date(before.starts_at).getTime() !== new Date(row.starts_at).getTime() || before.hall_id !== row.hall_id || (row.status && before.status !== row.status))
  ) {
    const snapshot = { starts_at: before.starts_at, hall_id: before.hall_id, status: before.status };
    after(() => notifyMatchChanged(createAdminClient(), id, snapshot));
  }
  // Nova utakmica → odmah na delegiranje
  if (!id) redirect(`/admin/utakmice/${data.id}`);
  return {};
}

/** Termin i dvorana iz liste utakmica; kod aktivirane utakmice izmjena ide mailom službenim licima i klubovima */
export async function updateSchedule(id: string, date: string, time: string, hallId: string | null): Promise<{ error?: string }> {
  await requireRole("admin");
  if (!UUID.test(id) || (hallId !== null && typeof hallId !== "string")) return { error: "Utakmica nije pronađena." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return { error: "Upiši datum i vrijeme." };

  const supabase = await createClient();
  const { data: before } = await supabase.from("matches").select("starts_at, hall_id, status, published_at").eq("id", id).maybeSingle();
  if (!before) return { error: "Utakmica nije pronađena." };
  const row = { starts_at: sarajevoToISO(date, time), hall_id: hallId || null };
  const { error } = await supabase.from("matches").update(row).eq("id", id);
  if (error) return { error: "Izmjena nije sačuvana. Pokušaj ponovo." };

  invalidate({ table: "matches", match: id });
  if (before.published_at && (new Date(before.starts_at).getTime() !== new Date(row.starts_at).getTime() || before.hall_id !== row.hall_id)) {
    const snapshot = { starts_at: before.starts_at, hall_id: before.hall_id, status: before.status };
    after(() => notifyMatchChanged(createAdminClient(), id, snapshot));
  }
  return {};
}

export async function deleteMatch(formData: FormData) {
  await requireRole("admin");
  const id = String(formData.get("id"));
  const supabase = await createClient();
  await supabase.from("matches").delete().eq("id", id);
  // Brisanje utakmice kaskadno briše delegiranja, četvrtine i bilten
  invalidate(
    { table: "matches", match: id },
    { table: "assignments", match: id },
    { table: "match_periods", match: id },
    { table: "match_reports", match: id },
  );
  redirect("/admin/utakmice");
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type PublishState = { error?: string; result?: PublishResult };

/** Aktiviraj utakmice: nominacija postaje vidljiva i šalje se emailom (vidi lib/publish.ts) */
export async function publish(ids: string[]): Promise<PublishState> {
  await requireRole("admin");
  if (!Array.isArray(ids) || ids.length === 0 || ids.length > 100 || !ids.every((id) => UUID.test(id))) {
    return { error: "Označi bar jednu utakmicu." };
  }
  try {
    return { result: await publishMatches(createAdminClient(), ids) };
  } catch {
    return { error: "Objava nije uspjela. Pokušaj ponovo." };
  } finally {
    invalidate(...ids.flatMap((match) => [{ table: "matches" as const, match }, { table: "assignments" as const, match }]));
  }
}

/** Plaćanje utakmica (lista odigranih): sva prihvaćena delegiranja izabranih utakmica postaju isplaćena ili neisplaćena */
export async function setMatchesPaid(matchIds: string[], paid: boolean): Promise<{ error?: string; matches?: number }> {
  const admin = await requireRole("admin");
  if (!Array.isArray(matchIds) || matchIds.length === 0 || matchIds.length > 500 || !matchIds.every((id) => UUID.test(id))) {
    return { error: "Nije izabrana nijedna utakmica." };
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("assignments")
    .update(paid ? { paid_at: new Date().toISOString(), paid_by: admin.id } : { paid_at: null, paid_by: null })
    .in("match_id", matchIds)
    .eq("status", "accepted")
    .select("match_id");
  if (error) return { error: "Plaćanje nije sačuvano. Pokušaj ponovo." };
  const touched = [...new Set(data.map((a) => a.match_id))];
  invalidate(...touched.map((match) => ({ table: "assignments" as const, match })));
  return { matches: touched.length };
}

// ───────── Brzo delegiranje iz liste utakmica ─────────

export type QuickPick = { current: { id: string; name: string } | null; candidates: Candidate[] };

/** Ko je na poziciji i ko može na nju (bez već delegiranih na utakmici; odsutne izbacuje izbor) */
export async function quickCandidates(matchId: string, position: Position): Promise<QuickPick | null> {
  await requireRole("admin");
  if (!UUID.test(matchId) || !POSITION_ORDER.includes(position)) return null;
  const data = await getDelegation(matchId);
  if (!data) return null;
  const active = data.assignments.filter((a) => a.status === "pending" || a.status === "accepted");
  const onMatch = new Set(active.map((a) => a.profile!.id));
  const current = active.find((a) => a.position === position);
  return {
    current: current ? { id: current.id, name: current.profile!.full_name } : null,
    candidates: data.candidates.filter((c) => candidateFits(position, c) && !onMatch.has(c.id)),
  };
}

/** Delegira osobu na poziciju; ako je neko već na njoj (`replaceId`), zamjenjuje ga */
export async function quickAssign(matchId: string, position: Position, profileId: string, replaceId: string | null): Promise<{ error?: string }> {
  const admin = await requireRole("admin");
  if (!UUID.test(matchId) || !UUID.test(profileId) || (replaceId !== null && !UUID.test(replaceId))) return { error: "Utakmica ili osoba nije pronađena." };
  if (!POSITION_ORDER.includes(position)) return { error: "Nepoznata pozicija." };
  const db = createAdminClient();
  try {
    if (replaceId) await replaceAssignment(db, { assignmentId: replaceId, profileId, createdBy: admin.id });
    else await assignPerson(db, { matchId, profileId, position, createdBy: admin.id });
  } catch (e) {
    return { error: e instanceof DelegationError ? e.message : "Delegiranje nije sačuvano. Pokušaj ponovo." };
  } finally {
    // I neuspjeli pokušaj je mogao obrisati odbijene/otkazane nominacije
    invalidate({ table: "assignments", match: matchId });
  }
  return {};
}

export async function quickUnassign(matchId: string, assignmentId: string): Promise<{ error?: string }> {
  await requireRole("admin");
  if (!UUID.test(matchId) || !UUID.test(assignmentId)) return { error: "Delegiranje nije pronađeno." };
  try {
    await removeAssignment(createAdminClient(), assignmentId);
  } catch (e) {
    return { error: e instanceof DelegationError ? e.message : "Uklanjanje nije uspjelo. Pokušaj ponovo." };
  } finally {
    invalidate({ table: "assignments", match: matchId });
  }
  return {};
}

"use server";

import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { invalidate } from "@/lib/cache";
import { crewFromForm, crewToRow } from "@/lib/crew";
import { createClient } from "@/lib/supabase/server";
import { MATCH_KIND_LABEL, sarajevoToISO, type MatchKind, type MatchStatus } from "@/lib/format";

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
  const { data, error } = id
    ? await supabase.from("matches").update(row).eq("id", id).select("id").single()
    : await supabase.from("matches").insert(row).select("id").single();
  if (error?.code === "23505") return { error: `Utakmica ${number} već postoji u ovom takmičenju. Upiši drugi broj ili ostavi prazno.` };
  if (error) return { error: "Utakmica nije sačuvana. Pokušaj ponovo." };

  // Prije redirecta: redirect prekida izvršavanje
  invalidate({ table: "matches", match: data.id });
  // Nova utakmica → odmah na delegiranje
  if (!id) redirect(`/admin/utakmice/${data.id}`);
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

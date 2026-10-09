"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { sarajevoToISO, type MatchStatus } from "@/lib/format";

export type MatchFormState = { error?: string };

const STATUSES: MatchStatus[] = ["scheduled", "live", "finished", "postponed", "cancelled"];

export async function saveMatch(_prev: MatchFormState, formData: FormData): Promise<MatchFormState> {
  await requireRole("admin");
  const get = (k: string) => String(formData.get(k) ?? "").trim();

  const id = get("id");
  const date = get("date");
  const time = get("time");
  const round = get("round");
  const status = get("status") as MatchStatus;
  const match = {
    competition_id: get("competition_id"),
    home_team_id: get("home_team_id"),
    away_team_id: get("away_team_id"),
    hall_id: get("hall_id") || null,
    round: round ? Number(round) : null,
    referee_count: get("referee_count") === "3" ? 3 : 2,
    table_count: get("table_count") === "3" ? 3 : 2,
    notes: get("notes") || null,
    ...(STATUSES.includes(status) ? { status } : {}),
  };

  if (!match.competition_id || !match.home_team_id || !match.away_team_id) return { error: "Izaberi takmičenje i obje ekipe." };
  if (match.home_team_id === match.away_team_id) return { error: "Domaćin i gost moraju biti različite ekipe." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return { error: "Upiši datum i vrijeme." };
  if (match.round !== null && (!Number.isInteger(match.round) || match.round < 1)) return { error: "Kolo mora biti pozitivan broj." };

  const supabase = await createClient();
  const row = { ...match, starts_at: sarajevoToISO(date, time) };
  const { data, error } = id
    ? await supabase.from("matches").update(row).eq("id", id).select("id").single()
    : await supabase.from("matches").insert(row).select("id").single();
  if (error) return { error: "Utakmica nije sačuvana. Pokušaj ponovo." };

  // Nova utakmica → odmah na delegiranje
  if (!id) redirect(`/admin/utakmice/${data.id}`);
  refresh();
  return {};
}

export async function deleteMatch(formData: FormData) {
  await requireRole("admin");
  const supabase = await createClient();
  await supabase.from("matches").delete().eq("id", String(formData.get("id")));
  redirect("/admin/utakmice");
}

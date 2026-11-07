"use server";

import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { ScheduleDraft } from "@/lib/social-image";

export type SaveSocialScheduleResult = { id: string; updatedAt: string } | { error: string };

/** Sačuva raspored (novi kad nema id-a): naslov iz polja "Naslov" na slici, stanje bildera */
export async function saveSocialSchedule(id: string | null, draft: ScheduleDraft, title: string): Promise<SaveSocialScheduleResult> {
  const user = await requireRole("admin");
  if (JSON.stringify(draft).length > 500_000) return { error: "Raspored je prevelik za čuvanje." };
  const values = {
    title: String(title ?? "").trim().slice(0, 200) || "Raspored utakmica",
    state: draft,
    updated_by: user.id,
    updated_at: new Date().toISOString(),
  };
  const supabase = await createClient();
  const { data, error } = id
    ? await supabase.from("social_schedules").update(values).eq("id", id).select("id, updated_at").maybeSingle()
    : await supabase.from("social_schedules").insert({ ...values, created_by: user.id }).select("id, updated_at").single();
  if (error) return { error: "Raspored nije sačuvan." };
  if (!data) return { error: "Raspored više ne postoji (obrisan je)." };
  return { id: data.id, updatedAt: data.updated_at };
}

/** Briše sačuvan raspored */
export async function deleteSocialSchedule(id: string): Promise<{ error?: string }> {
  await requireRole("admin");
  const supabase = await createClient();
  const { error } = await supabase.from("social_schedules").delete().eq("id", id);
  return error ? { error: "Raspored nije obrisan." } : {};
}

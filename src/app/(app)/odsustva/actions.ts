"use server";

import { getCurrentUser } from "@/lib/auth";
import { invalidate } from "@/lib/cache";
import { createClient } from "@/lib/supabase/server";

export type AbsenceState = { error?: string; ok?: number };

export async function addAbsence(prev: AbsenceState, formData: FormData): Promise<AbsenceState> {
  const user = await getCurrentUser();
  const from = String(formData.get("from") ?? "");
  const to = String(formData.get("to") ?? "") || from;
  const reason = String(formData.get("reason") ?? "").trim() || null;

  if (!from) return { error: "Izaberi datum." };
  if (to < from) return { error: "Kraj ne može biti prije početka." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("unavailability")
    .insert({ profile_id: user.id, from_date: from, to_date: to, reason });
  if (error) return { error: "Odsustvo nije sačuvano. Pokušaj ponovo." };

  invalidate("unavailability");
  return { ok: (prev.ok ?? 0) + 1 };
}

export async function deleteAbsence(formData: FormData) {
  const user = await getCurrentUser();
  const supabase = await createClient();
  await supabase
    .from("unavailability")
    .delete()
    .eq("id", String(formData.get("id")))
    .eq("profile_id", user.id);
  invalidate("unavailability");
}

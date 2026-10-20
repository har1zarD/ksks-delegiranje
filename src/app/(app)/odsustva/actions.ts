"use server";

import { after } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { invalidate } from "@/lib/cache";
import { notifyAbsence } from "@/lib/emails";
import { absenceRange } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export type AbsenceState = { error?: string; ok?: number };

export async function addAbsence(prev: AbsenceState, formData: FormData): Promise<AbsenceState> {
  const user = await getCurrentUser();
  const get = (k: string) => String(formData.get(k) ?? "").trim();
  const range = absenceRange({ from: get("from"), fromTime: get("from_time"), to: get("to"), toTime: get("to_time") });
  if ("error" in range) return { error: range.error };
  const reason = get("reason") || null;

  const supabase = await createClient();
  const { error } = await supabase
    .from("unavailability")
    .insert({ profile_id: user.id, starts_at: range.startsAt, ends_at: range.endsAt, reason });
  if (error) return { error: "Odsustvo nije sačuvano. Pokušaj ponovo." };

  invalidate("unavailability");
  after(() => notifyAbsence({ profileId: user.id, startsAt: range.startsAt, endsAt: range.endsAt, reason }));
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

"use server";

import { requireRole } from "@/lib/auth";
import { invalidate } from "@/lib/cache";
import { crewFromForm, crewToDefaults } from "@/lib/crew";
import { createClient } from "@/lib/supabase/server";

export type RulesState = { error?: string; saved?: number };

/** Prazno = nije određeno; inače KM ≥ 0 sa zarezom ili tačkom */
function amount(raw: FormDataEntryValue | null): number | null | "invalid" {
  const v = String(raw ?? "").trim().replace(",", ".");
  if (v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 && n <= 10000 ? Math.round(n * 100) / 100 : "invalid";
}

/** Pravila naknada jednog takmičenja + podrazumijevani broj sudija i ljudi za stolom */
export async function saveFeeRules(prev: RulesState, formData: FormData): Promise<RulesState> {
  await requireRole("admin");
  const id = String(formData.get("competition_id") ?? "");
  const fees = {
    fee_referee_2_km: amount(formData.get("fee_referee_2_km")),
    fee_referee_3_km: amount(formData.get("fee_referee_3_km")),
    fee_table_km: amount(formData.get("fee_table_km")),
    fee_stats_km: amount(formData.get("fee_stats_km")),
    fee_commissioner_km: amount(formData.get("fee_commissioner_km")),
  };
  if (Object.values(fees).includes("invalid")) return { error: "Iznosi moraju biti brojevi od 0 do 10.000 KM." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("competitions")
    .update({
      ...(fees as Record<keyof typeof fees, number | null>),
      ...crewToDefaults(crewFromForm(formData)),
      split_nominations: formData.get("split_nominations") === "1",
    })
    .eq("id", id);
  if (error) return { error: "Pravila nisu sačuvana. Pokušaj ponovo." };

  invalidate("competitions");
  return { saved: (prev.saved ?? 0) + 1 };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Isplata naknade: označi delegiranja (prihvaćena) kao isplaćena ili vrati na neisplaćeno */
export async function setPaid(ids: string[], paid: boolean): Promise<{ error?: string }> {
  const admin = await requireRole("admin");
  if (!Array.isArray(ids) || ids.length === 0 || ids.length > 1000 || !ids.every((id) => UUID.test(id))) {
    return { error: "Nije izabrana nijedna utakmica." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("assignments")
    .update(paid ? { paid_at: new Date().toISOString(), paid_by: admin.id } : { paid_at: null, paid_by: null })
    .in("id", ids)
    .eq("status", "accepted")
    .select("match_id");
  if (error) return { error: "Isplata nije sačuvana. Pokušaj ponovo." };

  invalidate(...[...new Set(data.map((a) => a.match_id))].map((match) => ({ table: "assignments" as const, match })));
  return {};
}

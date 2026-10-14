"use server";

import { requireRole } from "@/lib/auth";
import { invalidate } from "@/lib/cache";
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
    fee_commissioner_km: amount(formData.get("fee_commissioner_km")),
  };
  if (Object.values(fees).includes("invalid")) return { error: "Iznosi moraju biti brojevi od 0 do 10.000 KM." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("competitions")
    .update({
      ...(fees as Record<keyof typeof fees, number | null>),
      referee_count_default: formData.get("referee_count_default") === "3" ? 3 : 2,
      table_count_default: formData.get("table_count_default") === "3" ? 3 : 2,
    })
    .eq("id", id);
  if (error) return { error: "Pravila nisu sačuvana. Pokušaj ponovo." };

  invalidate("competitions");
  return { saved: (prev.saved ?? 0) + 1 };
}

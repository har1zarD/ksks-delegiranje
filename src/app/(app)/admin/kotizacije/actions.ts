"use server";

import { requireRole } from "@/lib/auth";
import { invalidate } from "@/lib/cache";
import { createClient } from "@/lib/supabase/server";

export type PaymentState = { error?: string; ok?: number };

export async function addPayment(prev: PaymentState, formData: FormData): Promise<PaymentState> {
  const admin = await requireRole("admin");
  const teamId = String(formData.get("team_id") ?? "");
  const amount = Number(String(formData.get("amount") ?? "").replace(",", "."));
  const paidOn = String(formData.get("paid_on") ?? "");
  const note = String(formData.get("note") ?? "").trim() || null;

  if (!Number.isFinite(amount) || amount <= 0) return { error: "Upiši iznos veći od nule." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(paidOn)) return { error: "Izaberi datum uplate." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("fee_payments")
    .insert({ team_id: teamId, amount_km: Math.round(amount * 100) / 100, paid_on: paidOn, note, created_by: admin.id });
  if (error) return { error: "Uplata nije sačuvana. Pokušaj ponovo." };

  invalidate("fee_payments");
  return { ok: (prev.ok ?? 0) + 1 };
}

export async function deletePayment(formData: FormData) {
  await requireRole("admin");
  const supabase = await createClient();
  await supabase.from("fee_payments").delete().eq("id", String(formData.get("id") ?? ""));
  invalidate("fee_payments");
}

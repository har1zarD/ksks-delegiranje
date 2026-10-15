"use server";

import { requireRole } from "@/lib/auth";
import { invalidate } from "@/lib/cache";
import { createClient } from "@/lib/supabase/server";

export type ClubState = { error?: string; saved?: number };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** Kontakti kluba: email (više adresa odvojenih zarezom: klub, trener) i telefon */
export async function saveClubContacts(prev: ClubState, formData: FormData): Promise<ClubState> {
  await requireRole("admin");
  const id = String(formData.get("club_id") ?? "");
  if (!UUID.test(id)) return { error: "Klub nije pronađen." };

  const emails = String(formData.get("email") ?? "")
    .split(/[,;\s]+/)
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  const bad = emails.find((e) => !EMAIL.test(e));
  if (bad) return { error: `Neispravna adresa: ${bad}` };
  const phone = String(formData.get("phone") ?? "").trim().slice(0, 40);
  const youth = formData.get("youth") === "1";

  const supabase = await createClient();
  const { error } = await supabase
    .from("clubs")
    .update({ email: emails.length ? emails.join(", ") : null, phone: phone || null, youth })
    .eq("id", id);
  if (error) return { error: "Kontakti nisu sačuvani. Pokušaj ponovo." };

  invalidate("clubs");
  return { saved: (prev.saved ?? 0) + 1 };
}

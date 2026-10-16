"use server";

import { requireRole } from "@/lib/auth";
import { pingPending } from "@/lib/publish";
import { createAdminClient } from "@/lib/supabase/admin";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type PingState = { error?: string; people?: number; sent?: number };

/** "Pingaj" (Pregled): podsjetnik izabranim osobama koje nisu odgovorile na nominaciju; ne mijenja podatke, samo šalje mail */
export async function ping(ids: string[]): Promise<PingState> {
  await requireRole("admin");
  if (!Array.isArray(ids) || ids.length === 0 || ids.length > 200 || !ids.every((id) => UUID.test(id))) return { error: "Izaberi bar jednu osobu." };
  try {
    return await pingPending(createAdminClient(), ids);
  } catch {
    return { error: "Podsjetnik nije poslan. Pokušaj ponovo." };
  }
}

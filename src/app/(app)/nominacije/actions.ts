"use server";

import { after } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { invalidate } from "@/lib/cache";
import { DelegationError, respondToNomination } from "@/lib/delegation";
import { createAdminClient } from "@/lib/supabase/admin";

export type RespondState = { error?: string };

export async function respond(_prev: RespondState, formData: FormData): Promise<RespondState> {
  const user = await getCurrentUser();
  const accept = formData.get("accept") === "1";
  const reason = String(formData.get("reason") ?? "").trim();
  if (!accept && !reason) return { error: "Napiši razlog odbijanja." };

  let matchId: string;
  try {
    // Vlasništvo (profileId) i stanje nominacije provjerava respondToNomination
    const result = await respondToNomination(createAdminClient(), {
      assignmentId: String(formData.get("id") ?? ""),
      profileId: user.id,
      accept,
      reason,
    });
    // Odbijanje javlja savezu, nakon odgovora korisniku
    after(result.notifyAdmins);
    matchId = result.matchId;
  } catch (e) {
    return { error: e instanceof DelegationError ? e.message : "Odgovor nije sačuvan. Pokušaj ponovo." };
  }

  invalidate({ table: "assignments", match: matchId });
  return {};
}

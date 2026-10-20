"use server";

import { requireRole } from "@/lib/auth";
import { invalidate } from "@/lib/cache";
import { fetchFibaGame, parseFibaMatchId } from "@/lib/fiba";
import { createAdminClient } from "@/lib/supabase/admin";

export type AddFibaState = { error?: string; added?: number };

const STATUS = { scheduled: "SCHEDULED", live: "IN_PROGRESS", finished: "COMPLETE" } as const;

/** Admin: dodaj FIBA utakmicu linkom (ili brojem) s FIBA LiveStats */
export async function addFibaGame(prev: AddFibaState, formData: FormData): Promise<AddFibaState> {
  await requireRole("admin");
  const matchId = parseFibaMatchId(String(formData.get("link") ?? ""));
  if (!matchId) return { error: "Zalijepi FIBA LiveStats link utakmice (…/u/BIH/2939998/) ili njen broj." };
  const competitionId = Number(formData.get("competition_id")) || null;

  const game = await fetchFibaGame(matchId);
  if (!game) return { error: "FIBA LiveStats nema podatke za tu utakmicu (provjeri link)." };

  const { error } = await createAdminClient()
    .from("fiba_games")
    .upsert({
      id: matchId,
      ...(competitionId ? { competition_id: competitionId } : {}),
      status: STATUS[game.state],
      live: game.state === "live",
      home_name: game.home.name,
      away_name: game.away.name,
      home_logo: game.home.logo,
      away_logo: game.away.logo,
      home_score: game.state === "scheduled" ? null : game.home.score,
      away_score: game.state === "scheduled" ? null : game.away.score,
      updated_at: new Date().toISOString(),
    });
  if (error) return { error: error.message };
  invalidate("fiba_games");
  return { added: matchId };
}

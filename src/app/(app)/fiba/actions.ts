"use server";

import { getCurrentUser, requireRole } from "@/lib/auth";
import { invalidate } from "@/lib/cache";
import { fetchFibaGame, parseFibaMatchId } from "@/lib/fiba";
import { matchRoleOf } from "@/lib/scoresheets";
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

export type FibaLinkState = { error?: string; saved?: number };

/** FIBA takmičenje po kategoriji (seniori); omladinska liga KS 2026/27 je 50399 */
const FIBA_COMPETITION: Record<string, number> = { plbih: 50128, plbih_z: 50228, a1: 50201 };

/** FIBA kategorija naše utakmice: seniorska liga po nazivu takmičenja, omladinska liga po kategoriji (ženske varijante) */
function categoryOf(competition: { name: string; category: string; gender: string } | null | undefined) {
  const { name = "", category, gender } = competition ?? {};
  if (name.startsWith("Premijer liga BiH")) return gender === "Ž" ? "plbih_z" : "plbih";
  if (name.startsWith("A1 liga")) return "a1";
  if (name.startsWith("A2 liga")) return "a2";
  if (category === "pioniri") return gender === "Ž" ? "pionirke" : "pioniri";
  if (category === "kadeti") return gender === "Ž" ? "kadetkinje" : "kadeti";
  if (category === "juniori") return "juniori";
  return null;
}

/**
 * Veza naše utakmice s FIBA LiveStats utakmicom i pristupni kod (Stream Key) za zapisničara.
 * Admin mijenja oboje (prazan link = bez FIBA utakmice). Sudije, pomoćne sudije i komesar utakmice
 * samo upisuju ono čega još nema; već upisano ne mogu promijeniti ni obrisati.
 * FIBA utakmica koje još nema u spisku se doda (podaci s FIBA LiveStats).
 */
export async function saveFibaLink(prev: FibaLinkState, formData: FormData): Promise<FibaLinkState> {
  const matchId = String(formData.get("match_id") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(matchId)) return { error: "Nepoznata utakmica." };
  const role = await matchRoleOf(await getCurrentUser(), matchId);
  if (!role) return { error: "FIBA podatke upisuju savez i delegirani na utakmici." };
  const rawLink = String(formData.get("link") ?? "").trim();
  let streamKey = String(formData.get("stream_key") ?? "").trim().toUpperCase() || null;
  if (streamKey && !/^[A-Z0-9]{6,40}$/.test(streamKey)) return { error: "Pristupni kod (Stream Key) ima samo slova i brojeve, npr. 1SYA3ZV64M476WEVRFW1." };
  let fibaId = rawLink ? parseFibaMatchId(rawLink) : null;
  if (rawLink && !fibaId) return { error: "Zalijepi FIBA LiveStats link utakmice (…/u/BIH/2939998/) ili njen broj." };

  const db = createAdminClient();
  if (role !== "admin") {
    const { data: current } = await db.from("matches").select("fiba_game_id, fiba_stream_key").eq("id", matchId).maybeSingle();
    if (!current) return { error: "Nepoznata utakmica." };
    if (current.fiba_game_id != null && current.fiba_stream_key) return { error: "FIBA podaci su već upisani. Za izmjenu se javi savezu." };
    fibaId = current.fiba_game_id ?? fibaId;
    streamKey = current.fiba_stream_key ?? streamKey;
    if (!fibaId && !streamKey) return { error: "Upiši FIBA LiveStats link ili pristupni kod." };
  }
  let key = streamKey;
  let game: Awaited<ReturnType<typeof fetchFibaGame>> = null;
  if (fibaId) {
    const { data: known } = await db.from("fiba_games").select("id, stream_key").eq("id", fibaId).maybeSingle();
    // Pristupni kod iz tabele KSBiH (uvezen uz FIBA utakmicu) se preuzima kad ga admin nije upisao
    key ??= known?.stream_key ?? null;
    if (!known) {
      const [fetched, { data: match }] = await Promise.all([
        fetchFibaGame(fibaId),
        db
          .from("matches")
          .select("starts_at, competition:competitions!matches_competition_id_fkey ( name, category, gender ), home:teams!matches_home_team_id_fkey ( name ), away:teams!matches_away_team_id_fkey ( name )")
          .eq("id", matchId)
          .maybeSingle(),
      ]);
      game = fetched;
      // Utakmica kreirana u FIBA Organizer-u, a još nepokrenuta, nema podataka; tada ekipe i termin uzimamo s naše utakmice
      const category = categoryOf(match?.competition);
      const { error } = await db.from("fiba_games").insert({
        id: fibaId,
        competition_id: FIBA_COMPETITION[category ?? ""] ?? 50399,
        category,
        starts_at: match?.starts_at ?? null,
        status: game ? STATUS[game.state] : "SCHEDULED",
        live: game?.state === "live",
        home_name: game?.home.name ?? match?.home?.name ?? "Domaćin",
        away_name: game?.away.name ?? match?.away?.name ?? "Gost",
        home_logo: game?.home.logo ?? null,
        away_logo: game?.away.logo ?? null,
        home_score: game && game.state !== "scheduled" ? game.home.score : null,
        away_score: game && game.state !== "scheduled" ? game.away.score : null,
      });
      if (error) return { error: error.message };
    }
  }

  const { error } = await db.from("matches").update({ fiba_game_id: fibaId, fiba_stream_key: key }).eq("id", matchId);
  if (error) return { error: error.code === "23505" ? "Ta FIBA utakmica je već povezana s drugom utakmicom." : error.message };

  // Rezultat odmah (i za već odigranu utakmicu); dalje ga svake minute prepisuje sync_fiba_periods
  if (fibaId) {
    game ??= await fetchFibaGame(fibaId);
    if (game && game.state !== "scheduled") {
      const periods = game.home.periods
        .map((h, i) => ({ match_id: matchId, period: i + 1, home_points: h, away_points: game!.away.periods[i] ?? 0 }))
        .filter((p) => p.period <= Math.max(game!.period, 1));
      if (periods.length) await db.from("match_periods").upsert(periods);
      if (game.state === "live") await db.from("matches").update({ status: "live" }).eq("id", matchId).eq("status", "scheduled");
    }
  }
  invalidate({ table: "matches", match: matchId }, { table: "match_periods", match: matchId }, "fiba_games");
  return { saved: Date.now() };
}

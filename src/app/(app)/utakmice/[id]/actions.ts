"use server";

import { refresh } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { MatchStatus } from "@/lib/format";
import type { TechnicalFoul } from "@/lib/data/report-selects";

/** Admin ili prihvaćeni komesar utakmice. RLS i tako provjerava; ovo daje jasnu poruku. */
async function authorize(matchId: string) {
  const user = await getCurrentUser();
  const supabase = await createClient();
  if (user.role === "admin") return { user, supabase, isAdmin: true };
  const { data } = await supabase.rpc("is_match_commissioner", { m: matchId });
  return data ? { user, supabase, isAdmin: false } : null;
}

export type PeriodState = { error?: string; savedAt?: number };

function points(v: FormDataEntryValue | null) {
  const n = Number(String(v ?? "").trim() || "0");
  return Number.isInteger(n) && n >= 0 && n <= 200 ? n : null;
}

export async function savePeriod(matchId: string, period: number, home: string, away: string): Promise<PeriodState> {
  const auth = await authorize(matchId);
  if (!auth) return { error: "Samo komesar utakmice unosi rezultat." };
  const h = points(home);
  const a = points(away);
  if (h === null || a === null) return { error: "Poeni moraju biti cijeli broj od 0 do 200." };
  if (!Number.isInteger(period) || period < 1 || period > 12) return { error: "Nepoznata četvrtina." };

  const { error } = await auth.supabase
    .from("match_periods")
    .upsert({ match_id: matchId, period, home_points: h, away_points: a, updated_by: auth.user.id });
  if (error) return { error: "Rezultat nije sačuvan. Pokušaj ponovo." };

  refresh();
  return { savedAt: period };
}

/** Briše posljednji produžetak (npr. dodan greškom) */
export async function removePeriod(matchId: string, period: number): Promise<PeriodState> {
  const auth = await authorize(matchId);
  if (!auth) return { error: "Samo komesar utakmice unosi rezultat." };
  if (period <= 4) return { error: "Regularne četvrtine se ne brišu." };
  const { error } = await auth.supabase.from("match_periods").delete().eq("match_id", matchId).eq("period", period);
  if (error) return { error: "Produžetak nije obrisan." };
  refresh();
  return {};
}

export async function setStatus(formData: FormData) {
  const matchId = String(formData.get("match_id") ?? "");
  const status = String(formData.get("status") ?? "") as MatchStatus;
  if (status !== "live" && status !== "finished") return;
  const auth = await authorize(matchId);
  if (!auth) return;
  await auth.supabase.rpc("set_match_status", { m: matchId, s: status });
  refresh();
}

export type ReportState = { error?: string; saved?: "draft" | "submitted" | "unlocked" };

const TIME = /^\d{2}:\d{2}$/;

function intOrNull(v: FormDataEntryValue | null, max: number) {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isInteger(n) && n >= 0 && n <= max ? n : NaN;
}

export async function saveReport(_prev: ReportState, formData: FormData): Promise<ReportState> {
  const matchId = String(formData.get("match_id") ?? "");
  const intent = String(formData.get("intent") ?? "draft");
  const auth = await authorize(matchId);
  if (!auth) return { error: "Bilten piše komesar utakmice." };
  const { supabase, user, isAdmin } = auth;

  const { data: existing } = await supabase
    .from("match_reports")
    .select("submitted_at, commissioner")
    .eq("match_id", matchId)
    .maybeSingle();

  if (intent === "unlock") {
    if (!isAdmin) return { error: "Samo savez može vratiti bilten na doradu." };
    const { error } = await supabase.from("match_reports").update({ submitted_at: null }).eq("match_id", matchId);
    if (error) return { error: "Bilten nije otključan." };
    refresh();
    return { saved: "unlocked" };
  }
  if (existing?.submitted_at && !isAdmin) return { error: "Bilten je već poslan. Za izmjene se javi savezu." };

  const get = (k: string) => String(formData.get(k) ?? "").trim();
  const spectators = intOrNull(formData.get("spectators"), 100_000);
  const homeFouls = intOrNull(formData.get("home_fouls"), 99);
  const awayFouls = intOrNull(formData.get("away_fouls"), 99);
  if ([spectators, homeFouls, awayFouls].some((n) => Number.isNaN(n))) return { error: "Gledaoci i greške moraju biti cijeli brojevi." };
  const startedAt = get("started_at");
  const endedAt = get("ended_at");
  if ((startedAt && !TIME.test(startedAt)) || (endedAt && !TIME.test(endedAt))) return { error: "Vrijeme upiši kao SS:MM." };

  let technicals: TechnicalFoul[] = [];
  try {
    const raw = JSON.parse(get("technicals") || "[]") as TechnicalFoul[];
    technicals = raw
      .filter((t) => t.player.trim())
      .map((t) => ({
        team: t.team === "away" ? "away" : "home",
        player: t.player.trim().slice(0, 80),
        minute: t.minute && Number.isInteger(t.minute) && t.minute >= 1 && t.minute <= 60 ? t.minute : null,
        type: t.type === "U" || t.type === "D" ? t.type : "T",
      }));
  } catch {
    return { error: "Lista grešaka nije ispravna." };
  }

  const submit = intent === "submit";
  // Komesar se upisuje kao autor; admin zadržava postojećeg komesara
  const commissioner = isAdmin ? (existing?.commissioner ?? null) : user.id;

  const { error } = await supabase.from("match_reports").upsert({
    match_id: matchId,
    commissioner,
    spectators,
    started_at: startedAt || null,
    ended_at: endedAt || null,
    home_fouls: homeFouls,
    away_fouls: awayFouls,
    technicals,
    incidents: get("incidents") || null,
    remarks: get("remarks") || null,
    updated_at: new Date().toISOString(),
    ...(submit ? { submitted_at: new Date().toISOString() } : {}),
  });
  if (error) return { error: "Bilten nije sačuvan. Pokušaj ponovo." };

  refresh();
  return { saved: submit ? "submitted" : "draft" };
}

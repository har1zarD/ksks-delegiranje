"use server";

import { getCurrentUser } from "@/lib/auth";
import { invalidate } from "@/lib/cache";
import { matchPositionsOf, matchRoleOf, SCORESHEET_BUCKET } from "@/lib/scoresheets";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { SCORE_UNDO_HOURS, scoreUndoUntil, type MatchStatus } from "@/lib/format";
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

  invalidate({ table: "match_periods", match: matchId });
  return { savedAt: period };
}

/** Briše posljednji produžetak (npr. dodan greškom) */
export async function removePeriod(matchId: string, period: number): Promise<PeriodState> {
  const auth = await authorize(matchId);
  if (!auth) return { error: "Samo komesar utakmice unosi rezultat." };
  if (period <= 4) return { error: "Regularne četvrtine se ne brišu." };
  const { error } = await auth.supabase.from("match_periods").delete().eq("match_id", matchId).eq("period", period);
  if (error) return { error: "Produžetak nije obrisan." };
  invalidate({ table: "match_periods", match: matchId });
  return {};
}

export async function setStatus(formData: FormData) {
  const matchId = String(formData.get("match_id") ?? "");
  const status = String(formData.get("status") ?? "") as MatchStatus;
  if (status !== "live" && status !== "finished") return;
  const auth = await authorize(matchId);
  if (!auth) return;
  await auth.supabase.rpc("set_match_status", { m: matchId, s: status });
  invalidate({ table: "matches", match: matchId });
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
    invalidate({ table: "match_reports", match: matchId });
    return { saved: "unlocked" };
  }
  if (existing?.submitted_at && !isAdmin) return { error: "Bilten je već poslan. Za izmjene se javi savezu." };

  const get = (k: string) => String(formData.get(k) ?? "").trim();
  const spectators = intOrNull(formData.get("spectators"), 100_000);
  if (Number.isNaN(spectators)) return { error: "Broj gledalaca mora biti cijeli broj." };
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
        // Četvrtina 1–4 ili produžetak (5+); minuta unutar nje (10 u četvrtini, 5 u produžetku)
        period: t.period && Number.isInteger(t.period) && t.period >= 1 && t.period <= 10 ? t.period : null,
        minute: t.minute && Number.isInteger(t.minute) && t.minute >= 1 && t.minute <= (t.period && t.period > 4 ? 5 : 10) ? t.minute : null,
        type: t.type === "U" || t.type === "D" ? t.type : "T",
      }));
  } catch {
    return { error: "Lista grešaka nije ispravna." };
  }

  const submit = intent === "submit";
  // Komesar se upisuje kao autor; admin zadržava postojećeg komesara, osim ako je sam komesar utakmice
  const ownMatch = isAdmin && !existing?.commissioner && (await supabase.rpc("is_match_commissioner", { m: matchId })).data;
  const commissioner = isAdmin ? (existing?.commissioner ?? (ownMatch ? user.id : null)) : user.id;

  const { error } = await supabase.from("match_reports").upsert({
    match_id: matchId,
    commissioner,
    spectators,
    started_at: startedAt || null,
    ended_at: endedAt || null,
    technicals,
    incidents: get("incidents") || null,
    remarks: get("remarks") || null,
    updated_at: new Date().toISOString(),
    ...(submit ? { submitted_at: new Date().toISOString() } : {}),
  });
  if (error) return { error: "Bilten nije sačuvan. Pokušaj ponovo." };

  invalidate({ table: "match_reports", match: matchId });
  return { saved: submit ? "submitted" : "draft" };
}

export type FinalScoreState = { error?: string; saved?: number };

/**
 * Konačni rezultat bez četvrtina: prihvaćeni pomoćni sudija (kad utakmica nema komesara) ili admin.
 * Utakmica postaje završena. Piše servisni klijent jer matches mijenja samo admin (RLS); pristup je provjeren ovdje.
 */
export async function saveFinalScore(prev: FinalScoreState, formData: FormData): Promise<FinalScoreState> {
  const matchId = String(formData.get("match_id") ?? "");
  const user = await getCurrentUser();
  const role = await matchRoleOf(user, matchId);
  if (role !== "admin" && role !== "table") return { error: "Konačni rezultat upisuje pomoćni sudija za stolom." };

  const db = createAdminClient();
  const { data: match } = await db.from("matches").select("status, has_commissioner, score_entered_at, home_score").eq("id", matchId).maybeSingle();
  if (!match) return { error: "Utakmica nije pronađena." };
  if (match.status === "cancelled" || match.status === "postponed") return { error: "Utakmica je otkazana ili odgođena." };
  // Ispravka = rezultat već upisan (utakmica može biti završena i bez rezultata, kad je sudija označi odigranom)
  const correction = match.home_score != null;
  if (role === "table") {
    if (match.has_commissioner) return { error: "Na ovoj utakmici rezultat unosi komesar." };
    if (correction && !scoreUndoUntil(match.score_entered_at)) {
      return { error: `Rok od ${SCORE_UNDO_HOURS} sata za ispravku je prošao. Za ispravku se javi savezu.` };
    }
  }

  const home = String(formData.get("home") ?? "").trim();
  const away = String(formData.get("away") ?? "").trim();
  const h = points(home);
  const a = points(away);
  if (!home || !away || h === null || a === null) return { error: "Upiši poene obje ekipe (cijeli broj od 0 do 200)." };

  // Rok stola teče od prvog upisa (ispravka ga ne produžava); rezultat koji upiše savez sto više ne mijenja
  const enteredAt = role === "table" ? (correction ? match.score_entered_at : new Date().toISOString()) : null;
  const { error } = await db
    .from("matches")
    .update({ home_score: h, away_score: a, status: "finished", score_entered_at: enteredAt })
    .eq("id", matchId);
  if (error) return { error: "Rezultat nije sačuvan. Pokušaj ponovo." };

  invalidate({ table: "matches", match: matchId });
  return { saved: (prev.saved ?? 0) + 1 };
}

export type UndoScoreState = { error?: string };

/** Pomoćni sudija poništava pogrešno upisan konačni rezultat u roku: utakmica se vraća na zakazanu, bez rezultata */
export async function undoFinalScore(_prev: UndoScoreState, formData: FormData): Promise<UndoScoreState> {
  const matchId = String(formData.get("match_id") ?? "");
  const user = await getCurrentUser();
  if ((await matchRoleOf(user, matchId)) !== "table") return { error: "Rezultat poništava pomoćni sudija za stolom." };

  const db = createAdminClient();
  const { data: match } = await db.from("matches").select("status, has_commissioner, score_entered_at").eq("id", matchId).maybeSingle();
  if (!match) return { error: "Utakmica nije pronađena." };
  if (match.has_commissioner || match.status !== "finished") return { error: "Nema upisanog rezultata za poništavanje." };
  if (!scoreUndoUntil(match.score_entered_at)) return { error: `Rok od ${SCORE_UNDO_HOURS} sata je prošao. Za ispravku se javi savezu.` };

  const { error } = await db
    .from("matches")
    .update({ home_score: null, away_score: null, status: "scheduled", score_entered_at: null })
    .eq("id", matchId)
    .eq("status", "finished");
  if (error) return { error: "Rezultat nije poništen. Pokušaj ponovo." };

  invalidate({ table: "matches", match: matchId });
  return {};
}

const SCORESHEET_EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

/** Link za upload jedne slike zapisnika direktno u Storage (zaobilazi ograničenje veličine Server Action zahtjeva) */
export async function createScoresheetUpload(matchId: string, contentType: string): Promise<{ error?: string; path?: string; token?: string }> {
  const user = await getCurrentUser();
  if (!(await matchRoleOf(user, matchId))) return { error: "Slike dodaju sudije, komesar, pomoćne sudije ili savez." };
  const ext = SCORESHEET_EXT[contentType];
  if (!ext) return { error: "Dozvoljene su slike (JPG, PNG, WEBP)." };

  const path = `${matchId}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
  const { data, error } = await createAdminClient().storage.from(SCORESHEET_BUCKET).createSignedUploadUrl(path);
  if (error) return { error: "Upload nije pripremljen. Pokušaj ponovo." };
  return { path: data.path, token: data.token };
}

export async function deleteScoresheet(matchId: string, path: string): Promise<{ error?: string }> {
  const user = await getCurrentUser();
  if (!(await matchRoleOf(user, matchId))) return { error: "Nemaš pravo brisati slike ove utakmice." };
  // Samo slika ove utakmice (bez podfoldera i "..")
  if (!new RegExp(`^${matchId}/[\\w.-]+$`).test(path) || path.includes("..")) return { error: "Nepoznata slika." };
  const { error } = await createAdminClient().storage.from(SCORESHEET_BUCKET).remove([path]);
  if (error) return { error: "Slika nije obrisana." };
  return {};
}

/**
 * Isplata utakmice: prvi sudija utakmice (ili savez) označi da je klub isplatio službena lica (korisnik, 2026-10-17).
 * Isto što i isplata u Naknadama: paid_at na svim prihvaćenim delegiranjima utakmice. Podrazumijevano nije isplaćeno.
 */
export async function setMatchPaid(matchId: string, paid: boolean): Promise<{ error?: string }> {
  const user = await getCurrentUser();
  const allowed = user.role === "admin" || (await matchPositionsOf(user, matchId)).includes("referee_1");
  if (!allowed) return { error: "Isplatu označava prvi sudija utakmice ili savez." };

  const { error } = await createAdminClient()
    .from("assignments")
    .update(paid ? { paid_at: new Date().toISOString(), paid_by: user.id } : { paid_at: null, paid_by: null })
    .eq("match_id", matchId)
    .eq("status", "accepted");
  if (error) return { error: "Plaćanje nije sačuvano. Pokušaj ponovo." };

  invalidate({ table: "assignments", match: matchId });
  return {};
}

/**
 * Zaključi utakmicu: sudija, pomoćni sudija, komesar ili savez označi da je odigrana (status završena, ulazi u obračun naknada), bez unosa rezultata.
 * Utakmicu u toku završava komesar po četvrtinama; savez može sve. Natrag na zakazanu vraća savez kroz "Uredi utakmicu".
 */
export async function lockMatch(matchId: string): Promise<{ error?: string }> {
  const user = await getCurrentUser();
  const role = await matchRoleOf(user, matchId);
  if (!role) return { error: "Utakmicu zaključuju delegirani na njoj ili savez." };

  const db = createAdminClient();
  const { data: match } = await db.from("matches").select("status").eq("id", matchId).maybeSingle();
  if (!match) return { error: "Utakmica nije pronađena." };
  if (match.status === "finished") return {};
  if (match.status === "cancelled" || match.status === "postponed") return { error: "Utakmica je otkazana ili odgođena." };
  if (role !== "admin" && match.status === "live") return { error: "Utakmicu u toku završava komesar." };

  const { error } = await db.from("matches").update({ status: "finished" }).eq("id", matchId);
  if (error) return { error: "Utakmica nije zaključena. Pokušaj ponovo." };

  invalidate({ table: "matches", match: matchId });
  return {};
}

import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { addDays, addMonths, isoToSarajevo, requiredPositions, sarajevoToISO, type AssignmentStatus, type Position } from "@/lib/format";
import {
  ADMIN_MATCH_SELECT,
  ASSIGNMENT_WITH_TIME_SELECT,
  COMPETITION_SELECT,
  DELEGATION_ASSIGNMENT_SELECT,
  DELEGATION_MATCH_SELECT,
} from "./selects";

// Svaka funkcija sama provjerava ulogu (DAL), ne oslanja se na layout.
async function adminClient() {
  await requireRole("admin");
  return createClient();
}

export async function getCompetitions() {
  const supabase = await adminClient();
  const { data, error } = await supabase
    .from("competitions")
    .select(COMPETITION_SELECT)
    .eq("season.is_current", true)
    .order("sort");
  if (error) throw error;
  return (data ?? []).map((c) => ({
    ...c,
    teams: c.teams.sort((a, b) => a.name.localeCompare(b.name, "bs")),
  }));
}

export async function getHalls() {
  const supabase = await adminClient();
  const { data, error } = await supabase.from("halls").select("id, name").order("name");
  if (error) throw error;
  return data ?? [];
}

/** Sljedeći slobodan broj utakmice u tekućoj sezoni (prijedlog na formi; baza ga dodijeli i sama) */
export async function getNextMatchNumber() {
  const supabase = await adminClient();
  const { data, error } = await supabase
    .from("matches")
    .select("number, competition:competitions!matches_competition_id_fkey!inner ( season:seasons!competitions_season_id_fkey!inner ( is_current ) )")
    .eq("competition.season.is_current", true)
    .order("number", { ascending: false })
    .limit(1);
  if (error) throw error;
  return (data?.[0]?.number ?? 0) + 1;
}

export type StaffingSummary = { missing: Position[]; pending: number };

function staffing(refereeCount: number, tableCount: number, assignments: { position: Position; status: AssignmentStatus }[]): StaffingSummary {
  const active = assignments.filter((a) => a.status === "pending" || a.status === "accepted");
  return {
    missing: requiredPositions(refereeCount, tableCount).filter((p) => !active.some((a) => a.position === p)),
    pending: active.filter((a) => a.status === "pending").length,
  };
}

/** Predstojeće (opcionalno narednih `days` dana) ili odigrane utakmice, najbliže prve */
export async function getAdminMatches(opts: { when: "upcoming" | "past"; competitionId?: string; days?: number }) {
  const supabase = await adminClient();
  const now = Date.now();
  let q = supabase.from("matches").select(ADMIN_MATCH_SELECT);
  if (opts.competitionId) q = q.eq("competition_id", opts.competitionId);
  const nowIso = new Date(now).toISOString();
  // Utakmica uživo je "predstoji" i kad je prošlo vrijeme početka
  if (opts.when === "upcoming") {
    q = q.or(`starts_at.gte.${nowIso},status.eq.live`);
    if (opts.days) q = q.lt("starts_at", new Date(now + opts.days * 86_400_000).toISOString());
  } else {
    q = q.lt("starts_at", nowIso).neq("status", "live");
  }
  const { data, error } = await q.order("starts_at", { ascending: opts.when === "upcoming" }).limit(300);
  if (error) throw error;
  return (data ?? []).map(({ assignments, ...m }) => ({
    ...m,
    staffing: staffing(m.referee_count, m.table_count, assignments),
  }));
}

export type Candidate = {
  id: string;
  name: string;
  /** Može li osoba na ovu vrstu pozicije */
  canReferee: boolean;
  canTable: boolean;
  isCommissioner: boolean;
  /** Najavljeno odsustvo na dan utakmice */
  absence: string | null;
  /** Druge utakmice istog dana (vrijeme početka) */
  sameDay: string[];
  /** Broj utakmica (prihvaćeno ili čeka) u mjesecu utakmice */
  monthLoad: number;
};

/** Sve što treba za delegiranje jedne utakmice */
export async function getDelegation(matchId: string) {
  const supabase = await adminClient();

  const { data: match, error } = await supabase
    .from("matches")
    .select(DELEGATION_MATCH_SELECT)
    .eq("id", matchId)
    .maybeSingle();
  if (error) throw error;
  if (!match) return null;

  const { date } = isoToSarajevo(match.starts_at);
  const dayStart = sarajevoToISO(date, "00:00");
  const dayEnd = sarajevoToISO(addDays(date, 1), "00:00");
  const monthStart = sarajevoToISO(`${date.slice(0, 7)}-01`, "00:00");
  const monthEnd = sarajevoToISO(addMonths(`${date.slice(0, 7)}-01`, 1), "00:00");

  const [assignments, people, absences, sameDay, month] = await Promise.all([
    supabase
      .from("assignments")
      .select(DELEGATION_ASSIGNMENT_SELECT)
      .eq("match_id", matchId),
    supabase
      .from("profiles")
      .select("id, full_name, role, is_referee, is_table")
      .eq("active", true)
      .neq("role", "admin")
      .order("full_name"),
    supabase.from("unavailability").select("profile_id, reason").lte("from_date", date).gte("to_date", date),
    supabase
      .from("assignments")
      .select(ASSIGNMENT_WITH_TIME_SELECT)
      .in("status", ["pending", "accepted"])
      .neq("match_id", matchId)
      .gte("match.starts_at", dayStart)
      .lt("match.starts_at", dayEnd),
    supabase
      .from("assignments")
      .select(ASSIGNMENT_WITH_TIME_SELECT)
      .in("status", ["pending", "accepted"])
      .gte("match.starts_at", monthStart)
      .lt("match.starts_at", monthEnd),
  ]);
  for (const r of [assignments, people, absences, sameDay, month]) if (r.error) throw r.error;

  const candidates: Candidate[] = (people.data ?? []).map((p) => {
    const absence = absences.data?.find((a) => a.profile_id === p.id);
    return {
    id: p.id,
    name: p.full_name,
    canReferee: p.role === "official" && p.is_referee,
    canTable: p.role === "official" && p.is_table,
    isCommissioner: p.role === "commissioner",
    absence: absence ? (absence.reason ?? "") : null,
    sameDay: (sameDay.data ?? []).filter((a) => a.profile_id === p.id).map((a) => a.match.starts_at),
    monthLoad: (month.data ?? []).filter((a) => a.profile_id === p.id).length,
    };
  });

  return {
    match,
    assignments: (assignments.data ?? []).filter((a) => a.profile),
    candidates,
  };
}



export async function getPeople() {
  const supabase = await adminClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, phone, role, is_referee, is_table, license, city, active")
    .order("full_name");
  if (error) throw error;
  return data ?? [];
}

import { cacheLife, cacheTag } from "next/cache";
import { requireRole } from "@/lib/auth";
import { crewOf, crewPositions, type Crew } from "@/lib/crew";
import { LIFE, TAG, tag } from "@/lib/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { addDays, addMonths, isoToSarajevo, sarajevoToISO, todayISO, type AssignmentStatus, type Position } from "@/lib/format";
import { row, rows } from "./db";
import {
  ADMIN_MATCH_SELECT,
  ASSIGNMENT_WITH_TIME_SELECT,
  COMPETITION_SELECT,
  DELEGATION_ASSIGNMENT_SELECT,
  DELEGATION_MATCH_SELECT,
} from "./selects";

// Svaka izvezena funkcija sama provjerava ulogu (DAL), ne oslanja se na layout.
// Keširani čitači (ispod) koriste servisni klijent, pa provjera uloge mora ostati u izvezenoj funkciji.

async function competitionRows() {
  "use cache: remote";
  cacheLife(LIFE.reference); // šifarnik: mijenja ga samo admin, tag ga invalidira
  cacheTag(TAG.competitions, TAG.teams, TAG.clubs);
  return rows(await createAdminClient().from("competitions").select(COMPETITION_SELECT).eq("season.is_current", true).order("sort"));
}

export async function getCompetitions() {
  await requireRole("admin");
  return (await competitionRows()).map((c) => ({
    ...c,
    teams: [...c.teams].sort((a, b) => a.name.localeCompare(b.name, "bs")),
  }));
}

async function hallRows() {
  "use cache: remote";
  cacheLife(LIFE.reference);
  cacheTag(TAG.halls);
  return rows(await createAdminClient().from("halls").select("id, name").order("name"));
}

export async function getHalls() {
  await requireRole("admin");
  return hallRows();
}

/** Najveći broj utakmice po takmičenju tekuće sezone */
async function maxMatchNumbers() {
  "use cache: remote";
  cacheLife(LIFE.live);
  cacheTag(TAG.matches, TAG.competitions);
  const data = rows(
    await createAdminClient()
      .from("matches")
      .select("competition_id, number, competition:competitions!matches_competition_id_fkey!inner ( season:seasons!competitions_season_id_fkey!inner ( is_current ) )")
      .eq("competition.season.is_current", true),
  );
  const max: Record<string, number> = {};
  for (const m of data) max[m.competition_id] = Math.max(max[m.competition_id] ?? 0, m.number);
  return max;
}

/** Sljedeći slobodan broj utakmice po takmičenju (prijedlog na formi; baza ga dodijeli i sama) */
export async function getNextMatchNumbers(): Promise<Record<string, number>> {
  await requireRole("admin");
  const max = await maxMatchNumbers();
  // Takmičenje bez utakmica nema ključ: forma tada predlaže 1
  return Object.fromEntries(Object.entries(max).map(([k, v]) => [k, v + 1]));
}

export type StaffingSummary = { missing: Position[]; pending: number };

function staffing(crew: Crew, assignments: { position: Position; status: AssignmentStatus }[]): StaffingSummary {
  const active = assignments.filter((a) => a.status === "pending" || a.status === "accepted");
  return {
    missing: crewPositions(crew).filter((p) => !active.some((a) => a.position === p)),
    pending: active.filter((a) => a.status === "pending").length,
  };
}

/** Najviše utakmica koje čitač vraća (+ rezerva za one koje vanjski filter po vremenu izbaci) */
const MATCH_LIMIT = 300;
const POOL_LIMIT = 400;

/**
 * Širi skup utakmica za listu. Ključ je samo DAN (ne trenutak), pa se isti zapis dijeli cijeli dan;
 * tačno "sada" filtrira vanjska funkcija. Predstojeće = od početka današnjeg dana (+ uživo), odigrane = do kraja današnjeg dana.
 */
async function matchPool(when: "upcoming" | "past", competitionId: string | null, day: string) {
  "use cache: remote";
  cacheLife(LIFE.live);
  cacheTag(TAG.matches, TAG.competitions, TAG.teams, TAG.halls, TAG.assignments, TAG.periods);
  let q = createAdminClient().from("matches").select(ADMIN_MATCH_SELECT);
  if (competitionId) q = q.eq("competition_id", competitionId);
  if (when === "upcoming") q = q.or(`starts_at.gte.${sarajevoToISO(day, "00:00")},status.eq.live`);
  else q = q.lt("starts_at", sarajevoToISO(addDays(day, 1), "00:00")).neq("status", "live");
  return rows(await q.order("starts_at", { ascending: when === "upcoming" }).limit(POOL_LIMIT));
}

/** Predstojeće (opcionalno narednih `days` dana) ili odigrane utakmice, najbliže prve */
export async function getAdminMatches(opts: { when: "upcoming" | "past"; competitionId?: string; days?: number }) {
  await requireRole("admin");
  const now = Date.now();
  const nowIso = new Date(now).toISOString();
  const pool = await matchPool(opts.when, opts.competitionId ?? null, todayISO());
  const windowEnd = opts.days ? new Date(now + opts.days * 86_400_000).toISOString() : null;
  return pool
    // Utakmica uživo je "predstoji" i kad je prošlo vrijeme početka
    .filter((m) => (opts.when === "upcoming" ? m.starts_at >= nowIso || m.status === "live" : m.starts_at < nowIso))
    .filter((m) => !windowEnd || m.starts_at < windowEnd)
    .slice(0, MATCH_LIMIT)
    .map(({ assignments, ...m }) => ({
      ...m,
      crew: crewOf(m),
      staffing: staffing(crewOf(m), assignments),
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

async function delegationMatch(matchId: string) {
  "use cache: remote";
  cacheLife(LIFE.live);
  cacheTag(tag.match(matchId), TAG.competitions, TAG.teams, TAG.halls);
  return row(await createAdminClient().from("matches").select(DELEGATION_MATCH_SELECT).eq("id", matchId).maybeSingle());
}

async function delegationAssignments(matchId: string) {
  "use cache: remote";
  cacheLife(LIFE.live);
  cacheTag(tag.match(matchId), TAG.profiles);
  return rows(await createAdminClient().from("assignments").select(DELEGATION_ASSIGNMENT_SELECT).eq("match_id", matchId));
}

/** Aktivni delegati (bez admina) */
async function activePeople() {
  "use cache: remote";
  cacheLife(LIFE.people);
  cacheTag(TAG.profiles);
  return rows(
    await createAdminClient().from("profiles").select("id, full_name, role, is_referee, is_table").eq("active", true).neq("role", "admin").order("full_name"),
  );
}

async function absencesOn(date: string) {
  "use cache: remote";
  cacheLife(LIFE.live);
  cacheTag(TAG.unavailability);
  return rows(await createAdminClient().from("unavailability").select("profile_id, reason").lte("from_date", date).gte("to_date", date));
}

/** Aktivna delegiranja (čeka/prihvaćeno) na utakmicama u danu, po osobi */
async function busyOn(date: string) {
  "use cache: remote";
  cacheLife(LIFE.live);
  cacheTag(TAG.assignments, TAG.matches);
  return rows(
    await createAdminClient()
      .from("assignments")
      .select(ASSIGNMENT_WITH_TIME_SELECT)
      .in("status", ["pending", "accepted"])
      .gte("match.starts_at", sarajevoToISO(date, "00:00"))
      .lt("match.starts_at", sarajevoToISO(addDays(date, 1), "00:00")),
  ).map((a) => ({ profileId: a.profile_id, matchId: a.match.id, startsAt: a.match.starts_at }));
}

/** Broj aktivnih delegiranja po osobi u mjesecu (monthStart = "YYYY-MM-01") */
async function monthLoadOf(monthStart: string) {
  "use cache: remote";
  cacheLife(LIFE.live);
  cacheTag(TAG.assignments, TAG.matches);
  const data = rows(
    await createAdminClient()
      .from("assignments")
      .select(ASSIGNMENT_WITH_TIME_SELECT)
      .in("status", ["pending", "accepted"])
      .gte("match.starts_at", sarajevoToISO(monthStart, "00:00"))
      .lt("match.starts_at", sarajevoToISO(addMonths(monthStart, 1), "00:00")),
  );
  const load: Record<string, number> = {};
  for (const a of data) load[a.profile_id] = (load[a.profile_id] ?? 0) + 1;
  return load;
}

/** Sve što treba za delegiranje jedne utakmice */
export async function getDelegation(matchId: string) {
  await requireRole("admin");

  const match = await delegationMatch(matchId);
  if (!match) return null;

  const { date } = isoToSarajevo(match.starts_at);
  const [assignments, people, absences, sameDay, load] = await Promise.all([
    delegationAssignments(matchId),
    activePeople(),
    absencesOn(date),
    busyOn(date),
    monthLoadOf(`${date.slice(0, 7)}-01`),
  ]);

  const candidates: Candidate[] = people.map((p) => {
    const absence = absences.find((a) => a.profile_id === p.id);
    return {
      id: p.id,
      name: p.full_name,
      canReferee: p.role === "official" && p.is_referee,
      canTable: p.role === "official" && p.is_table,
      isCommissioner: p.role === "commissioner",
      absence: absence ? (absence.reason ?? "") : null,
      sameDay: sameDay.filter((a) => a.profileId === p.id && a.matchId !== matchId).map((a) => a.startsAt),
      monthLoad: load[p.id] ?? 0,
    };
  });

  return {
    match,
    assignments: assignments.filter((a) => a.profile),
    candidates,
  };
}

async function peopleRows() {
  "use cache: remote";
  cacheLife(LIFE.people);
  cacheTag(TAG.profiles);
  return rows(
    await createAdminClient()
      .from("profiles")
      .select("id, email, full_name, phone, role, is_referee, is_table, license, city, active")
      .order("full_name"),
  );
}

export async function getPeople() {
  await requireRole("admin");
  return peopleRows();
}

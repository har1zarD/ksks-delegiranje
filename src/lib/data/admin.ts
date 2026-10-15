import { cacheLife, cacheTag } from "next/cache";
import { requireRole } from "@/lib/auth";
import { crewOf, crewPositions, type Crew } from "@/lib/crew";
import { LIFE, TAG, tag } from "@/lib/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { addDays, addMonths, formatAbsence, isoToSarajevo, matchWindow, POSITION_ORDER, sarajevoToISO, todayISO, type AssignmentStatus, type Position } from "@/lib/format";
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

/** Plaćanje utakmice: isplata svim prihvaćenim delegiranjima (paid_at), kako je vodi obračun naknada */
export type MatchPayment = { state: "paid" | "partial" | "unpaid" | "none"; paid: number; total: number };

function paymentOf(assignments: { status: AssignmentStatus; paid_at: string | null }[]): MatchPayment {
  const accepted = assignments.filter((a) => a.status === "accepted");
  const paid = accepted.filter((a) => a.paid_at).length;
  const state = accepted.length === 0 ? "none" : paid === accepted.length ? "paid" : paid === 0 ? "unpaid" : "partial";
  return { state, paid, total: accepted.length };
}

/** `people` = delegirani (prihvatili ili čekaju), redom pozicija; `unnotified` = delegirani koji još nisu obaviješteni (izmjene nakon aktiviranja) */
export type StaffingSummary = {
  missing: Position[];
  pending: number;
  unnotified: number;
  people: { position: Position; profileId: string | null; name: string; accepted: boolean }[];
};

function staffing(
  crew: Crew,
  assignments: { position: Position; status: AssignmentStatus; notified_at: string | null; profile: { id: string; full_name: string } | null }[],
): StaffingSummary {
  const active = assignments.filter((a) => a.status === "pending" || a.status === "accepted");
  return {
    missing: crewPositions(crew).filter((p) => !active.some((a) => a.position === p)),
    pending: active.filter((a) => a.status === "pending").length,
    unnotified: active.filter((a) => !a.notified_at).length,
    people: active
      .sort((a, b) => POSITION_ORDER.indexOf(a.position) - POSITION_ORDER.indexOf(b.position))
      .map((a) => ({ position: a.position, profileId: a.profile?.id ?? null, name: a.profile?.full_name ?? "—", accepted: a.status === "accepted" })),
  };
}

/** Pozicija utakmice s delegiranom osobom (ili bez nje): linija ekipe u listi */
export type CrewSlot = { position: Position; name: string | null; status: AssignmentStatus | null };

type SlotAssignment = { position: Position; status: AssignmentStatus; profile: { full_name: string } | null };

/**
 * Svaka pozicija koju utakmica traži (i dodatne na kojima neko aktivno jeste): aktivno delegiranje (čeka/prihvaćeno),
 * inače odbijeno da admin vidi ko je otpao, inače prazno = nedostaje. Otkazana se ne prikazuju (mjesto je slobodno).
 */
function crewSlots(crew: Crew, assignments: SlotAssignment[]): CrewSlot[] {
  const active = (a: SlotAssignment) => a.status === "pending" || a.status === "accepted";
  const positions = [...new Set([...crewPositions(crew), ...assignments.filter(active).map((a) => a.position)])].sort(
    (a, b) => POSITION_ORDER.indexOf(a) - POSITION_ORDER.indexOf(b),
  );
  return positions.map((position) => {
    const here = assignments.filter((a) => a.position === position && a.profile);
    const a = here.find(active) ?? here.find((x) => x.status === "declined");
    return { position, name: a?.profile?.full_name ?? null, status: a?.status ?? null };
  });
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
  // i profili: imena delegiranih u liniji ekipe
  cacheTag(TAG.matches, TAG.competitions, TAG.teams, TAG.clubs, TAG.halls, TAG.assignments, TAG.periods, TAG.profiles);
  let q = createAdminClient().from("matches").select(ADMIN_MATCH_SELECT);
  if (competitionId) q = q.eq("competition_id", competitionId);
  // Završena utakmica je odigrana čim je neko označi završenom, i kad je datum u budućnosti
  if (when === "upcoming") q = q.or(`starts_at.gte.${sarajevoToISO(day, "00:00")},status.eq.live`).neq("status", "finished");
  else q = q.or(`starts_at.lt.${sarajevoToISO(addDays(day, 1), "00:00")},status.eq.finished`).neq("status", "live");
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
    // Utakmica uživo je "predstoji" i kad je prošlo vrijeme početka; završena je odigrana i kad je datum u budućnosti
    .filter((m) => (opts.when === "upcoming" ? (m.starts_at >= nowIso || m.status === "live") && m.status !== "finished" : m.starts_at < nowIso || m.status === "finished"))
    .filter((m) => !windowEnd || m.starts_at < windowEnd)
    .slice(0, MATCH_LIMIT)
    .map(({ assignments, ...m }) => ({
      ...m,
      crew: crewOf(m),
      staffing: staffing(crewOf(m), assignments),
      slots: crewSlots(crewOf(m), assignments),
      payment: paymentOf(assignments),
    }));
}

/**
 * Aktivirane utakmice bez rezultata (Pregled): nominacija je poslana, a rezultat još nije upisan.
 * Ostaju i kad je vrijeme početka prošlo; upisan rezultat ih završava (status finished), poništen vraća.
 */
export async function getActivatedMatches() {
  await requireRole("admin");
  return (await activatedPool()).map(({ assignments, ...m }) => ({
    ...m,
    crew: crewOf(m),
    staffing: staffing(crewOf(m), assignments),
    slots: crewSlots(crewOf(m), assignments),
  }));
}

async function activatedPool() {
  "use cache: remote";
  cacheLife(LIFE.live);
  cacheTag(TAG.matches, TAG.competitions, TAG.teams, TAG.clubs, TAG.halls, TAG.assignments, TAG.periods, TAG.profiles);
  const q = createAdminClient().from("matches").select(ADMIN_MATCH_SELECT).eq("status", "scheduled").not("published_at", "is", null);
  return rows(await q.order("starts_at").limit(MATCH_LIMIT));
}

export type Candidate = {
  id: string;
  name: string;
  /** Može li osoba na ovu vrstu pozicije */
  canReferee: boolean;
  canTable: boolean;
  /** Šta zna za stolom (zapisnik, glavno vrijeme, 24/14, statistika) */
  tableSkills: string[];
  isCommissioner: boolean;
  /** Najavljeno odsustvo u vrijeme utakmice (period i razlog); takva osoba se ne nudi za delegiranje */
  absence: string | null;
  /** Druge utakmice istog dana (vrijeme početka) */
  sameDay: string[];
  /** Broj utakmica (prihvaćeno ili čeka) u mjesecu utakmice */
  monthLoad: number;
};

async function delegationMatch(matchId: string) {
  "use cache: remote";
  cacheLife(LIFE.live);
  cacheTag(tag.match(matchId), TAG.competitions, TAG.teams, TAG.clubs, TAG.halls);
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
    await createAdminClient().from("profiles").select("id, full_name, role, is_referee, is_table, is_commissioner, table_skills").eq("active", true).or("role.neq.admin,is_referee.eq.true,is_table.eq.true,is_commissioner.eq.true").order("full_name"),
  );
}

/** Odsustva koja se preklapaju s vremenom utakmice (početak + MATCH_MINUTES) */
async function absencesDuring(startsAt: string) {
  "use cache: remote";
  cacheLife(LIFE.live);
  cacheTag(TAG.unavailability);
  const { start, end } = matchWindow(startsAt);
  return rows(
    await createAdminClient().from("unavailability").select("profile_id, reason, starts_at, ends_at").lt("starts_at", end).gt("ends_at", start),
  );
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
    absencesDuring(match.starts_at),
    busyOn(date),
    monthLoadOf(`${date.slice(0, 7)}-01`),
  ]);

  const candidates: Candidate[] = people.map((p) => {
    const absence = absences.find((a) => a.profile_id === p.id);
    return {
      id: p.id,
      name: p.full_name,
      canReferee: (p.role === "official" || p.role === "admin") && p.is_referee,
      canTable: (p.role === "official" || p.role === "admin") && p.is_table,
      tableSkills: (p.role === "official" || p.role === "admin") && p.is_table ? p.table_skills : [],
      isCommissioner: p.role === "commissioner" || (p.role === "admin" && p.is_commissioner),
      absence: absence ? [formatAbsence(absence.starts_at, absence.ends_at), absence.reason].filter(Boolean).join(", ") : null,
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
      .select("id, email, full_name, phone, role, is_referee, is_table, is_commissioner, table_skills, license, city, active")
      .order("full_name"),
  );
}

export async function getPeople() {
  await requireRole("admin");
  return peopleRows();
}

/** `today` je dio ključa: keš se sam smjenjuje po danu */
async function absenceRows() {
  "use cache: remote";
  cacheLife(LIFE.live);
  cacheTag(TAG.unavailability, TAG.profiles);
  return rows(
    await createAdminClient()
      .from("unavailability")
      .select("id, starts_at, ends_at, reason, profile:profiles!unavailability_profile_id_fkey ( id, full_name )")
      .order("starts_at"),
  );
}

/** Sva odsustva svih osoba (prošla, tekuća i buduća) */
export async function getAllAbsences() {
  await requireRole("admin");
  return (await absenceRows()).filter((a) => a.profile);
}

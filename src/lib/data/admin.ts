import { cacheLife, cacheTag } from "next/cache";
import { requireRole } from "@/lib/auth";
import { crewOf, crewPositions, nominationGroupOf, skillsFor, type Crew } from "@/lib/crew";
import { LIFE, TAG, tag } from "@/lib/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { BULLETIN_FIXTURES, type BulletinDraft, type SavedBulletin } from "@/lib/bulletin";
import type { ScheduleDraft } from "@/lib/social-image";
import { usesQuarterPoints } from "@/lib/quarter-points";
import { addDays, addMonths, formatAbsence, isoToSarajevo, matchWindow, POSITION_ORDER, sarajevoToISO, todayISO, type AssignmentStatus, type Position } from "@/lib/format";
import { row, rows } from "./db";
import { getLeagueFibaResults } from "./social";
import { FIBA_RESULT_PREFIX } from "@/lib/league-fiba";
import {
  ADMIN_MATCH_SELECT,
  ASSIGNMENT_WITH_TIME_SELECT,
  COMPETITION_SELECT,
  DELEGATION_ASSIGNMENT_SELECT,
  DELEGATION_MATCH_SELECT,
  BULLETIN_MATCH_SELECT,
  SCHEDULE_COMPETITION_SELECT,
  SCHEDULE_MATCH_SELECT,
} from "./selects";
import { parseTechnicals } from "./report-selects";
import { BULLETIN_CATEGORIES } from "./report";
import { A1_ZENE_ID } from "@/lib/a1-zene-raspored";
import { A2_JUG_ID } from "@/lib/a2-jug-raspored";

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

async function competitionMatchRows(competitionId: string) {
  "use cache: remote";
  cacheLife(LIFE.live);
  cacheTag(TAG.matches);
  return rows(
    await createAdminClient()
      .from("matches")
      .select("id, number, round, home_team_id, away_team_id, starts_at, hall_id")
      .eq("competition_id", competitionId),
  );
}

/** Utakmice jednog takmičenja (raspored A2 lige jug: koji parovi su već napravljeni) */
export async function getCompetitionMatches(competitionId: string) {
  await requireRole("admin");
  return competitionMatchRows(competitionId);
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

/**
 * `people` = delegirani (prihvatili ili čekaju), redom pozicija; `notified` = nominacija im je poslana;
 * `unnotified` = delegirani koji još nisu obaviješteni (izmjene nakon aktiviranja)
 */
export type StaffingSummary = {
  missing: Position[];
  pending: number;
  unnotified: number;
  people: { assignmentId: string; position: Position; profileId: string | null; name: string; accepted: boolean; notified: boolean }[];
};

function staffing(
  crew: Crew,
  assignments: { id: string; position: Position; status: AssignmentStatus; notified_at: string | null; profile: { id: string; full_name: string } | null }[],
): StaffingSummary {
  const active = assignments.filter((a) => a.status === "pending" || a.status === "accepted");
  return {
    missing: crewPositions(crew).filter((p) => !active.some((a) => a.position === p)),
    pending: active.filter((a) => a.status === "pending").length,
    unnotified: active.filter((a) => !a.notified_at).length,
    people: active
      .sort((a, b) => POSITION_ORDER.indexOf(a.position) - POSITION_ORDER.indexOf(b.position))
      .map((a) => ({
        assignmentId: a.id,
        position: a.position,
        profileId: a.profile?.id ?? null,
        name: a.profile?.full_name ?? "—",
        accepted: a.status === "accepted",
        notified: Boolean(a.notified_at),
      })),
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
  // Završena utakmica je odigrana čim je neko označi završenom, i kad je datum u budućnosti; odgođena predstoji
  // (čeka novi termin) i kad je prvobitni datum prošao
  if (when === "upcoming") q = q.or(`starts_at.gte.${sarajevoToISO(day, "00:00")},status.in.(live,postponed)`).neq("status", "finished");
  else q = q.or(`starts_at.lt.${sarajevoToISO(addDays(day, 1), "00:00")},status.eq.finished`).not("status", "in", "(live,postponed)");
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
    // Utakmica uživo i odgođena "predstoje" i kad je prošlo vrijeme početka; završena je odigrana i kad je datum u budućnosti
    .filter((m) =>
      opts.when === "upcoming"
        ? (m.starts_at >= nowIso || m.status === "live" || m.status === "postponed") && m.status !== "finished"
        : (m.starts_at < nowIso || m.status === "finished") && m.status !== "postponed",
    )
    .filter((m) => !windowEnd || m.starts_at < windowEnd)
    .slice(0, MATCH_LIMIT)
    .map(({ assignments, ...m }) => ({
      ...m,
      crew: crewOf(m),
      staffing: staffing(crewOf(m), assignments),
      slots: crewSlots(crewOf(m), assignments),
      payment: paymentOf(assignments),
      // Ručne naknade delegiranja (trošak utakmice)
      fees: Object.fromEntries(
        assignments.filter((a) => (a.status === "pending" || a.status === "accepted") && a.fee_km != null).map((a) => [a.position, Number(a.fee_km)]),
      ) as Partial<Record<Position, number>>,
    }));
}

/** Pregled prikazuje utakmice narednih toliko dana; aktivirane kasnije ostaju u Utakmicama */
export const OVERVIEW_DAYS = 7;

/** Gradovi Kantona Sarajevo (grad dvorane) */
const KS_CITIES = new Set(["Sarajevo", "Ilidža", "Vogošća", "Hadžići", "Ilijaš"]);

/** Lige saveza BiH: KSKS delegira samo domaće utakmice sarajevskih ekipa (team id) */
const SARAJEVO_HOME_TEAMS: Record<string, Set<string>> = {
  // Hrasnica, Ilidža, Mladost, Point - Richmond Park, Realway
  [A2_JUG_ID]: new Set([
    "a363895b-2c09-4151-8178-b25240524b81",
    "0e314b72-24a3-4557-bc49-91a1d7819cd2",
    "274476bb-268f-416c-8b22-63c4041bf4d3",
    "8840a236-eb54-4dea-875c-1ec6a43afde1",
    "9083bf35-a5b3-44da-a70a-18fa68f734ab",
  ]),
  // Play Off, Faze
  [A1_ZENE_ID]: new Set(["4a3cebd2-658f-46ba-aee0-7260697f5aac", "7747444b-2113-4058-afd6-f4091fc6b219"]),
};

/**
 * KSKS delegira samo utakmice u Sarajevu: u A2 ligi jug i A1 ženama domaćin je sarajevska ekipa,
 * inače dvorana u Kantonu Sarajevo (bez dvorane ili grada utakmica ostaje)
 */
export function delegatedHere(m: { competition: { id: string } | null; home: { id: string } | null; hall: { city: string | null } | null }) {
  const home = m.competition && SARAJEVO_HOME_TEAMS[m.competition.id];
  if (home) return !!m.home && home.has(m.home.id);
  return !m.hall?.city || KS_CITIES.has(m.hall.city);
}

/** Kraj prozora Pregleda (ISO): utakmica počinje prije njega */
export function overviewEnd(now = Date.now()) {
  return new Date(now + OVERVIEW_DAYS * 86_400_000).toISOString();
}

/**
 * Aktivirane utakmice bez rezultata (Pregled): nominacija je poslana, a rezultat još nije upisan.
 * Ostaju i kad je vrijeme početka prošlo; upisan rezultat ih završava (status finished), poništen vraća.
 * Samo one koje počinju u narednih OVERVIEW_DAYS dana (i prošle bez rezultata).
 */
export async function getActivatedMatches() {
  await requireRole("admin");
  const end = overviewEnd();
  return (await activatedPool()).filter((m) => m.starts_at < end).map(({ assignments, ...m }) => ({
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

/** Može li kandidat na poziciju (komesar, sudija, ili pomoćni sudija koji zna sve što pozicija traži) */
export function candidateFits(position: Position, c: Candidate) {
  if (position === "commissioner") return c.isCommissioner;
  if (nominationGroupOf(position) === "table") return c.canTable && skillsFor(position).every((s) => c.tableSkills.includes(s));
  return c.canReferee;
}

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

// ───────── Satnice kola (PDF za klubove) ─────────

/** Koliko dana unazad satnice nude kola (ponovno štampanje nedavnog kola) */
const SCHEDULE_PAST_DAYS = 30;

/** Utakmice tekuće sezone s kolom, od `from` nadalje; `from` je dan, pa se zapis dijeli cijeli dan */
async function scheduleRows(from: string) {
  "use cache: remote";
  cacheLife(LIFE.live);
  cacheTag(TAG.matches, TAG.competitions, TAG.teams, TAG.halls, TAG.assignments, TAG.profiles);
  const db = createAdminClient();
  const competitions = rows(await db.from("competitions").select(SCHEDULE_COMPETITION_SELECT).eq("season.is_current", true).order("sort").order("name"));
  if (competitions.length === 0) return { competitions, matches: [] };
  const matches = rows(
    await db
      .from("matches")
      .select(SCHEDULE_MATCH_SELECT)
      .in("competition_id", competitions.map((c) => c.id))
      .not("round", "is", null)
      .gte("starts_at", sarajevoToISO(from, "00:00"))
      .order("starts_at")
      .order("number"),
  );
  return { competitions, matches };
}

/** Omladinska kategorija (naslov "PIONIRI – 1. KOLO", zaglavlje "Omladinska liga Kantona Sarajevo") */
const youthLabel = (category: string) => BULLETIN_CATEGORIES.find((c) => c.key === category)?.label ?? null;

/**
 * Satnice kola: takmičenja (s ekipama) i njihove utakmice po kolu, s terminom, dvoranom i delegiranim
 * sudijama i komesarom (zapisnički sto klubovima ne treba). `suggested` = takmičenje najbliže utakmice koja tek dolazi.
 */
export async function getRoundSchedules() {
  await requireRole("admin");
  const data = await scheduleRows(addDays(todayISO(), -SCHEDULE_PAST_DAYS));
  const matches = data.matches.map((m) => ({
    id: m.id,
    number: m.number,
    round: m.round!,
    startsAt: m.starts_at,
    status: m.status,
    competitionId: m.competition_id,
    homeId: m.home_team_id,
    awayId: m.away_team_id,
    home: m.home?.name ?? "—",
    away: m.away?.name ?? "—",
    hall: m.hall?.name ?? null,
    officials: crewSlots(crewOf(m), m.assignments)
      .filter((s) => nominationGroupOf(s.position) === "officials")
      .map((s) => ({ position: s.position, name: s.status === "pending" || s.status === "accepted" ? s.name : null })),
  }));
  const nowIso = new Date().toISOString();
  /** Kolo najbliže zakazane utakmice (inače zadnje): takmičenje se otvara na njemu */
  const nextRound = (list: typeof matches) => (list.find((m) => m.startsAt >= nowIso && m.status === "scheduled") ?? list.at(-1))?.round ?? null;
  const competitions = data.competitions
    .filter((c) => matches.some((m) => m.competitionId === c.id))
    .map((c) => ({
      id: c.id,
      name: c.name,
      shortName: c.short_name ?? c.name,
      /** Naziv u naslovu satnice: kategorija omladinske lige, inače kratki naziv */
      label: youthLabel(c.category) ?? c.short_name ?? c.name,
      youth: youthLabel(c.category) !== null,
      season: c.season?.name ?? null,
      teams: [...c.teams].sort((a, b) => a.name.localeCompare(b.name, "bs")),
      nextRound: nextRound(matches.filter((m) => m.competitionId === c.id))!,
    }));
  const next = matches.find((m) => m.startsAt >= nowIso && m.status === "scheduled") ?? matches.at(-1);
  return { competitions, matches, suggested: next?.competitionId ?? null };
}

export type RoundSchedules = Awaited<ReturnType<typeof getRoundSchedules>>;
export type ScheduleCompetition = RoundSchedules["competitions"][number];
export type ScheduleMatch = RoundSchedules["matches"][number];

// ───────── Bilten (admin): registracija odigranih utakmica, tabela i nominacija narednog kola ─────────

async function bulletinRows() {
  "use cache: remote";
  cacheLife(LIFE.live);
  cacheTag(TAG.matches, TAG.competitions, TAG.teams, TAG.halls, TAG.assignments, TAG.profiles, TAG.periods, TAG.reports);
  const db = createAdminClient();
  const competitions = rows(await db.from("competitions").select(SCHEDULE_COMPETITION_SELECT).eq("season.is_current", true).order("sort").order("name"));
  if (competitions.length === 0) return { competitions, matches: [] };
  const matches = rows(
    await db
      .from("matches")
      .select(BULLETIN_MATCH_SELECT)
      .in("competition_id", competitions.map((c) => c.id))
      .not("round", "is", null)
      .order("starts_at")
      .order("number"),
  );
  return { competitions, matches };
}

/**
 * Bilten: takmičenja tekuće sezone s kolima i sve njihove utakmice s rezultatom, četvrtinama, komesarom i sudijama
 * i biltenom komesara (greške, incidenti, napomene). `suggested` = takmičenje i kolo zadnje odigrane utakmice.
 */
export async function getBulletinData() {
  await requireRole("admin");
  const [data, fiba] = await Promise.all([bulletinRows(), getLeagueFibaResults()]);
  // Minibasket: rezultat utakmice su bodovi četvrtina (upisuje ih okidač u matches), četvrtine su koševi
  const quarterIds = new Set(data.competitions.filter((c) => usesQuarterPoints(c.category)).map((c) => c.id));
  const own = data.matches.map((m) => {
    // match_reports je 1:1 (PK = match_id), ali PostgREST ga može vratiti i kao listu
    const raw = m.match_reports;
    const report = Array.isArray(raw) ? (raw[0] ?? null) : raw;
    const periods = [...m.match_periods].sort((a, b) => a.period - b.period);
    const sum = periods.reduce((t, p) => ({ home: t.home + p.home_points, away: t.away + p.away_points }), { home: 0, away: 0 });
    const quarters = quarterIds.has(m.competition_id);
    return {
      id: m.id,
      number: m.number,
      round: m.round!,
      startsAt: m.starts_at,
      status: m.status,
      competitionId: m.competition_id,
      homeId: m.home_team_id,
      awayId: m.away_team_id,
      home: m.home?.name ?? "—",
      away: m.away?.name ?? "—",
      hall: m.hall?.name ?? null,
      /** FIBA utakmica (rezultat i, kad nema delegiranja, komesar i sudije iz statistike) */
      fibaGameId: m.fiba_game_id,
      /** Rezultat utakmice su bodovi četvrtina (Minibasket), ne zbir koševa */
      quarters,
      /** Konačni rezultat: zbir četvrtina, inače rezultat upisan na utakmici; kod bodova četvrtina uvijek rezultat utakmice */
      score: periods.length > 0 && !quarters ? sum : m.home_score != null && m.away_score != null ? { home: m.home_score, away: m.away_score } : null,
      periods: periods.map((p) => ({ home: p.home_points, away: p.away_points })),
      officials: crewSlots(crewOf(m), m.assignments)
        .filter((s) => nominationGroupOf(s.position) === "officials")
        .map((s) => ({ position: s.position, name: s.status === "pending" || s.status === "accepted" ? s.name : null })),
      report: report
        ? { technicals: parseTechnicals(report.technicals), incidents: report.incidents, remarks: report.remarks, submitted: report.submitted_at !== null }
        : null,
    };
  });
  // Lige saveza (A2 jug, A1 žene): utakmice kola koje nisu napravljene u aplikaciji, a odigrane su po FIBA statistici,
  // ulaze u bilten kao i ostale (rezultat i četvrtine sa statistike; komesar i sudije preko fibaGameId)
  // Broj utakmice: broj para iz rasporeda saveza (kao u nominaciji saveza); samo kad ga je utakmica u aplikaciji već zauzela,
  // prvi slobodan broj tog kola
  const fibaNumber = new Map<number, number>();
  for (const key of new Set(fiba.map((r) => `${r.competitionId}|${r.round}`))) {
    const results = fiba.filter((r) => `${r.competitionId}|${r.round}` === key);
    const { competitionId, round } = results[0];
    const taken = new Set(own.filter((m) => m.competitionId === competitionId && m.round === round).map((m) => m.number));
    const free = (BULLETIN_FIXTURES[competitionId] ?? []).filter((f) => f.round === round && !taken.has(f.number)).map((f) => f.number);
    const keeps = results.filter((r) => free.includes(r.number));
    for (const r of keeps) fibaNumber.set(r.gameId, r.number);
    const rest = free.filter((n) => !keeps.some((r) => r.number === n));
    for (const r of results.filter((r) => !keeps.includes(r))) fibaNumber.set(r.gameId, rest.shift() ?? r.number);
  }
  const numberOf = (r: (typeof fiba)[number]) => fibaNumber.get(r.gameId) ?? r.number;
  const played: typeof own = fiba
    .filter((r) => data.competitions.some((c) => c.id === r.competitionId))
    .map((r) => ({
      id: `${FIBA_RESULT_PREFIX}${r.gameId}`,
      number: numberOf(r),
      round: r.round,
      startsAt: r.startsAt,
      status: "finished",
      competitionId: r.competitionId,
      homeId: "",
      awayId: "",
      home: r.home,
      away: r.away,
      hall: r.hall,
      fibaGameId: r.gameId,
      quarters: false,
      score: { home: r.homeScore, away: r.awayScore },
      periods: r.periods,
      officials: [],
      report: null,
    }));
  const matches = played.length ? [...own, ...played].sort((a, b) => a.startsAt.localeCompare(b.startsAt)) : own;
  const competitions = data.competitions
    .filter((c) => matches.some((m) => m.competitionId === c.id))
    .map((c) => ({
      id: c.id,
      name: c.name,
      shortName: c.short_name ?? c.name,
      label: youthLabel(c.category) ?? c.short_name ?? c.name,
      youth: youthLabel(c.category) !== null,
      quarters: quarterIds.has(c.id),
      season: c.season?.name ?? null,
    }));
  const last = own.filter((m) => m.status === "finished").at(-1) ?? matches[0];
  return { competitions, matches, suggested: last ? { competitionId: last.competitionId, round: last.round } : null };
}

export type BulletinData = Awaited<ReturnType<typeof getBulletinData>>;
export type BulletinMatch = BulletinData["matches"][number];

// ───────── Sačuvani bilteni (admin) ─────────

/** Sačuvani bilteni, zadnje mijenjani prvi (bez keša: lista se mijenja samo kroz bilder) */
export async function getSavedBulletins(): Promise<SavedBulletin[]> {
  await requireRole("admin");
  const supabase = await createClient();
  const list = rows(
    await supabase
      .from("bulletins")
      .select("id, number, title, round, competition_ids, updated_at, editor:profiles!bulletins_updated_by_fkey ( full_name )")
      .order("updated_at", { ascending: false })
      .limit(200),
  );
  return list.map((b) => ({ id: b.id, number: b.number, title: b.title, round: b.round, competitionIds: b.competition_ids, updatedAt: b.updated_at, updatedBy: b.editor?.full_name ?? null }));
}

/** Stanje jednog sačuvanog biltena; null kad ne postoji */
export async function getSavedBulletin(id: string): Promise<{ id: string; draft: BulletinDraft; updatedAt: string } | null> {
  await requireRole("admin");
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("bulletins").select("id, state, updated_at").eq("id", id).maybeSingle();
  return data ? { id: data.id, draft: data.state as BulletinDraft, updatedAt: data.updated_at } : null;
}

// ───────── Sačuvani rasporedi (admin, "Slike za objavu") ─────────

export type SavedSocialSchedule = { id: string; title: string; updatedAt: string; updatedBy: string | null };

/** Sačuvani rasporedi, zadnje mijenjani prvi (bez keša: lista se mijenja samo kroz bilder) */
export async function getSavedSocialSchedules(): Promise<SavedSocialSchedule[]> {
  await requireRole("admin");
  const supabase = await createClient();
  const list = rows(
    await supabase
      .from("social_schedules")
      .select("id, title, updated_at, editor:profiles!social_schedules_updated_by_fkey ( full_name )")
      .order("updated_at", { ascending: false })
      .limit(200),
  );
  return list.map((s) => ({ id: s.id, title: s.title, updatedAt: s.updated_at, updatedBy: s.editor?.full_name ?? null }));
}

/** Stanje jednog sačuvanog rasporeda; null kad ne postoji */
export async function getSavedSocialSchedule(id: string): Promise<{ id: string; draft: ScheduleDraft; updatedAt: string } | null> {
  await requireRole("admin");
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("social_schedules").select("id, state, updated_at").eq("id", id).maybeSingle();
  return data ? { id: data.id, draft: data.state as ScheduleDraft, updatedAt: data.updated_at } : null;
}

import { cacheLife, cacheTag } from "next/cache";
import { getCurrentUser, requireRole } from "@/lib/auth";
import { LIFE, TAG } from "@/lib/cache";
import { CREW_DEFAULT_COLUMNS, SENIOR_CATEGORIES, crewDefaultsOf } from "@/lib/crew";
import { createAdminClient } from "@/lib/supabase/admin";
import { rows } from "./db";
import { todayISO } from "@/lib/format";
import { computePayroll, feeStatus, filterPayroll, monthBounds, parseMonth, payrollTotals, round2, type PayrollFilter } from "@/lib/finance";

// Selecti za finansije (selects.ts drži selecte utakmica i delegiranja)
const FEE_COMPETITION_SELECT = `
  id, name, short_name, fee_km, fee_first_km, fee_due_on,
  season:seasons!competitions_season_id_fkey!inner ( is_current ),
  teams ( id, name, club:clubs!teams_club_id_fkey ( id, name, logo_url ),
    fee_payments ( id, amount_km, paid_on, note ) )
` as const;

const FEE_RULES = "fee_referee_2_km, fee_referee_3_km, fee_table_km, fee_stats_km, fee_commissioner_km, fee_digital_km" as const;

const RULES_COMPETITION_SELECT =
  `id, name, short_name, ${CREW_DEFAULT_COLUMNS}, ${FEE_RULES}, season:seasons!competitions_season_id_fkey!inner ( is_current )` as const;

const PAYROLL_SELECT = `
  id, position, paid_at, fee_km,
  profile:profiles!assignments_profile_id_fkey!inner ( id, full_name ),
  match:matches!assignments_match_id_fkey!inner ( id, number, kind, kind_label, starts_at, status, referee_count, digital_scoresheet,
    competition:competitions!matches_competition_id_fkey ( name, short_name, ${FEE_RULES} ),
    home:teams!matches_home_team_id_fkey ( name, club:clubs!teams_club_id_fkey ( logo_url ) ),
    away:teams!matches_away_team_id_fkey ( name, club:clubs!teams_club_id_fkey ( logo_url ) ) )
` as const;

// ───────── Kotizacije ─────────

async function feeRows() {
  "use cache: remote";
  cacheLife(LIFE.live);
  cacheTag(TAG.competitions, TAG.teams, TAG.clubs, TAG.payments);
  return rows(
    await createAdminClient()
      .from("competitions")
      .select(FEE_COMPETITION_SELECT)
      .eq("season.is_current", true)
      // Kotizacije plaćaju samo ekipe omladinskih liga KSKS
      .not("category", "in", `(${SENIOR_CATEGORIES.join(",")})`)
      .order("sort"),
  );
}

export async function getFeeOverview() {
  await requireRole("admin");
  const data = await feeRows();
  // Današnji datum (kašnjenje) računa se izvan keša
  const today = todayISO();

  const competitions = data.map((c) => ({
    id: c.id,
    name: c.name,
    shortName: c.short_name,
    fee: c.fee_km == null ? null : Number(c.fee_km),
    firstPart: c.fee_first_km == null ? null : Number(c.fee_first_km),
    dueOn: c.fee_due_on,
    teams: c.teams
      .map((t) => {
        const payments = [...t.fee_payments]
          .map((p) => ({ ...p, amount_km: Number(p.amount_km) }))
          .sort((a, b) => a.paid_on.localeCompare(b.paid_on));
        const paid = round2(payments.reduce((s, p) => s + p.amount_km, 0));
        return {
          id: t.id,
          name: t.name,
          club: t.club,
          payments,
          paid,
          ...feeStatus({
            fee: c.fee_km == null ? null : Number(c.fee_km),
            firstPart: c.fee_first_km == null ? null : Number(c.fee_first_km),
            dueOn: c.fee_due_on,
            paid,
            today,
          }),
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name, "bs")),
  }));

  // Zbir po klubu (klub plaća za sve svoje ekipe)
  const clubs = new Map<string, { id: string; name: string; logo_url: string | null; due: number; paid: number; late: number }>();
  for (const c of competitions) {
    for (const t of c.teams) {
      if (!t.club) continue;
      const club = clubs.get(t.club.id) ?? { id: t.club.id, name: t.club.name, logo_url: t.club.logo_url, due: 0, paid: 0, late: 0 };
      club.due = round2(club.due + (c.fee ?? 0));
      club.paid = round2(club.paid + t.paid);
      if (t.state === "late") club.late++;
      clubs.set(t.club.id, club);
    }
  }

  return {
    today,
    competitions,
    clubs: [...clubs.values()].sort((a, b) => a.name.localeCompare(b.name, "bs")),
  };
}

// ───────── Naknade ─────────

async function feeRuleRows() {
  "use cache: remote";
  cacheLife(LIFE.reference);
  cacheTag(TAG.competitions);
  return rows(
    await createAdminClient().from("competitions").select(RULES_COMPETITION_SELECT).eq("season.is_current", true).order("sort"),
  );
}

/** Pravila naknada i podrazumijevani broj sudija/stola po takmičenju tekuće sezone */
export async function getFeeRules() {
  await requireRole("admin");
  const data = await feeRuleRows();
  const num = (v: number | null) => (v == null ? null : Number(v));
  return data.map((c) => ({
    id: c.id,
    name: c.name,
    shortName: c.short_name ?? c.name,
    crew: crewDefaultsOf(c),
    split: c.split_nominations,
    rules: {
      fee_referee_2_km: num(c.fee_referee_2_km),
      fee_referee_3_km: num(c.fee_referee_3_km),
      fee_table_km: num(c.fee_table_km),
      fee_stats_km: num(c.fee_stats_km),
      fee_commissioner_km: num(c.fee_commissioner_km),
      fee_digital_km: num(c.fee_digital_km),
    },
  }));
}

/** Mjesec iz URL-a ili tekući mjesec (Sarajevo) */
export function resolveMonth(value: unknown) {
  return parseMonth(value) ?? todayISO().slice(0, 7);
}

/** Period obračuna: mjesec ("2026-10") ili "sve" (cijela evidencija, npr. sve što se još duguje) */
export type PayrollPeriod = string | "sve";

export function resolvePeriod(value: unknown): PayrollPeriod {
  return value === "sve" ? "sve" : resolveMonth(value);
}

/** Prihvaćena delegiranja na završenim utakmicama u periodu (profileId = samo jedna osoba, inače sve); koristi i statistika */
export async function payrollRows(period: PayrollPeriod, profileId: string | null) {
  "use cache: remote";
  cacheLife(LIFE.live);
  cacheTag(TAG.assignments, TAG.matches, TAG.competitions, TAG.teams, TAG.clubs, TAG.profiles);
  const db = createAdminClient();

  // PostgREST vraća najviše 1000 redova po upitu, pa se čita po stranicama
  const PAGE = 1000;
  const all = [];
  for (let offset = 0; ; offset += PAGE) {
    let q = db.from("assignments").select(PAYROLL_SELECT).eq("status", "accepted").eq("match.status", "finished");
    if (period !== "sve") {
      const { from, to } = monthBounds(period);
      q = q.gte("match.starts_at", from).lt("match.starts_at", to);
    }
    if (profileId) q = q.eq("profile_id", profileId);
    const data = rows(await q.order("id").range(offset, offset + PAGE - 1));
    all.push(...data);
    if (data.length < PAGE) break;
  }
  return all;
}

/** Obračun svih osoba (admin), s filterima (grupa, isplata, pretraga) i zbirom */
export async function getPayroll(period: PayrollPeriod, filter: PayrollFilter = {}) {
  await requireRole("admin");
  const people = computePayroll(filterPayroll(await payrollRows(period, null), filter));
  return { people, totals: payrollTotals(people) };
}

/** Obračun jedne osobe (admin) */
export async function getPersonPayroll(profileId: string, period: PayrollPeriod, filter: PayrollFilter = {}) {
  await requireRole("admin");
  const all = await payrollRows(period, profileId);
  const [person] = computePayroll(filterPayroll(all, filter));
  // Zbir bez filtera: stanje osobe se ne mijenja kad se filtrira lista
  const [summary] = computePayroll(all);
  return { person: person ?? null, summary: summary ?? null };
}

export async function getMyPayroll(period: PayrollPeriod) {
  const user = await getCurrentUser();
  return computePayroll(await payrollRows(period, user.id))[0] ?? null;
}

import { cacheLife, cacheTag } from "next/cache";
import { getCurrentUser, requireRole } from "@/lib/auth";
import { LIFE, TAG } from "@/lib/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { rows } from "./db";
import { todayISO } from "@/lib/format";
import { computePayroll, feeStatus, monthBounds, parseMonth, round2 } from "@/lib/finance";

// Selecti za finansije (selects.ts drži selecte utakmica i delegiranja)
const FEE_COMPETITION_SELECT = `
  id, name, short_name, fee_km, fee_first_km, fee_due_on,
  season:seasons!competitions_season_id_fkey!inner ( is_current ),
  teams ( id, name, club:clubs!teams_club_id_fkey ( id, name ),
    fee_payments ( id, amount_km, paid_on, note ) )
` as const;

const FEE_RULES = "fee_referee_2_km, fee_referee_3_km, fee_table_km, fee_commissioner_km" as const;

const RULES_COMPETITION_SELECT =
  `id, name, short_name, referee_count_default, table_count_default, ${FEE_RULES}, season:seasons!competitions_season_id_fkey!inner ( is_current )` as const;

const PAYROLL_SELECT = `
  position,
  profile:profiles!assignments_profile_id_fkey!inner ( id, full_name ),
  match:matches!assignments_match_id_fkey!inner ( id, number, starts_at, status, referee_count,
    competition:competitions!matches_competition_id_fkey ( name, short_name, ${FEE_RULES} ),
    home:teams!matches_home_team_id_fkey ( name ),
    away:teams!matches_away_team_id_fkey ( name ) )
` as const;

// ───────── Kotizacije ─────────

async function feeRows() {
  "use cache: remote";
  cacheLife(LIFE.live);
  cacheTag(TAG.competitions, TAG.teams, TAG.clubs, TAG.payments);
  return rows(
    await createAdminClient().from("competitions").select(FEE_COMPETITION_SELECT).eq("season.is_current", true).order("sort"),
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
  const clubs = new Map<string, { id: string; name: string; due: number; paid: number; late: number }>();
  for (const c of competitions) {
    for (const t of c.teams) {
      if (!t.club) continue;
      const club = clubs.get(t.club.id) ?? { id: t.club.id, name: t.club.name, due: 0, paid: 0, late: 0 };
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
    refereeCountDefault: c.referee_count_default,
    tableCountDefault: c.table_count_default,
    rules: {
      fee_referee_2_km: num(c.fee_referee_2_km),
      fee_referee_3_km: num(c.fee_referee_3_km),
      fee_table_km: num(c.fee_table_km),
      fee_commissioner_km: num(c.fee_commissioner_km),
    },
  }));
}

/** Mjesec iz URL-a ili tekući mjesec (Sarajevo) */
export function resolveMonth(value: unknown) {
  return parseMonth(value) ?? todayISO().slice(0, 7);
}

/** Prihvaćena delegiranja na završenim utakmicama u mjesecu (profileId = samo jedna osoba, inače sve) */
async function payrollRows(month: string, profileId: string | null) {
  "use cache: remote";
  cacheLife(LIFE.live);
  cacheTag(TAG.assignments, TAG.matches, TAG.competitions, TAG.teams, TAG.profiles);
  const db = createAdminClient();
  const { from, to } = monthBounds(month);

  // PostgREST vraća najviše 1000 redova po upitu, pa se čita po stranicama
  const PAGE = 1000;
  const all = [];
  for (let offset = 0; ; offset += PAGE) {
    let q = db
      .from("assignments")
      .select(PAYROLL_SELECT)
      .eq("status", "accepted")
      .eq("match.status", "finished")
      .gte("match.starts_at", from)
      .lt("match.starts_at", to);
    if (profileId) q = q.eq("profile_id", profileId);
    const data = rows(await q.order("id").range(offset, offset + PAGE - 1));
    all.push(...data);
    if (data.length < PAGE) break;
  }
  return all;
}

export async function getPayroll(month: string) {
  await requireRole("admin");
  return computePayroll(await payrollRows(month, null));
}

export async function getMyPayroll(month: string) {
  const user = await getCurrentUser();
  return computePayroll(await payrollRows(month, user.id))[0] ?? null;
}

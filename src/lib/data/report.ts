import { cacheLife, cacheTag } from "next/cache";
import { getCurrentUser, requireRole } from "@/lib/auth";
import { LIFE, TAG, tag } from "@/lib/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { nominationGroupOf } from "@/lib/crew";
import { POSITION_ORDER } from "@/lib/format";
import { row, rows } from "./db";
import {
  MATCH_CREW_SELECT,
  MATCH_PAGE_SELECT,
  parseTechnicals,
  PERIODS_SELECT,
  REPORT_SELECT,
} from "./report-selects";

/** Sve o utakmici u jednom zapisu (isti za sve korisnike); pristup odlučuje getMatchPage, ne keš */
async function matchPageRows(matchId: string) {
  "use cache: remote";
  cacheLife(LIFE.live);
  cacheTag(tag.match(matchId), TAG.competitions, TAG.teams, TAG.clubs, TAG.halls, TAG.profiles);
  const db = createAdminClient();

  const [match, crew, periods, report] = await Promise.all([
    db.from("matches").select(MATCH_PAGE_SELECT).eq("id", matchId).maybeSingle(),
    db.from("assignments").select(MATCH_CREW_SELECT).eq("match_id", matchId).in("status", ["pending", "accepted"]),
    db.from("match_periods").select(PERIODS_SELECT).eq("match_id", matchId).order("period"),
    db.from("match_reports").select(REPORT_SELECT).eq("match_id", matchId).maybeSingle(),
  ]);
  return { match: row(match), crew: rows(crew), periods: rows(periods), report: row(report) };
}

/**
 * Utakmica za osobu koja je na njoj delegirana (ili admina): ekipa, četvrtine, bilten.
 * null = utakmica ne postoji ili korisnik nema pristup.
 */
export async function getMatchPage(matchId: string) {
  const user = await getCurrentUser();
  const data = await matchPageRows(matchId);
  if (!data.match) return null;

  const isAdmin = user.role === "admin";
  // Kao RLS: delegirani vide samo poslane nominacije (admin i neposlane)
  const visible = isAdmin ? data.crew : data.crew.filter((a) => a.notified_at);
  const mine = visible.find((a) => a.profile_id === user.id);
  if (!isAdmin && !mine) return null;

  const sortedCrew = visible
    .filter((a) => a.profile)
    .sort((a, b) => POSITION_ORDER.indexOf(a.position) - POSITION_ORDER.indexOf(b.position));

  return {
    user,
    match: data.match,
    crew: sortedCrew,
    periods: data.periods,
    report: data.report
      ? {
          ...data.report,
          technicals: parseTechnicals(data.report.technicals),
        }
      : null,
    isAdmin,
    /** Prihvaćeni komesar ove utakmice: unosi rezultat i piše bilten */
    isCommissioner: mine?.position === "commissioner" && mine.status === "accepted",
    /** Prihvaćeni pomoćni sudija (sto, statistika): konačni rezultat i slika zapisnika */
    isTable: mine?.status === "accepted" && nominationGroupOf(mine.position) === "table",
    /** Prihvaćeni sudija: slika zapisnika */
    isReferee: mine?.status === "accepted" && mine.position.startsWith("referee"),
    /** Prihvaćeni prvi sudija: označava isplatu utakmice */
    isFirstReferee: mine?.status === "accepted" && mine.position === "referee_1",
  };
}

export type MatchPage = NonNullable<Awaited<ReturnType<typeof getMatchPage>>>;

// ───────── Bilten kola (admin): sve utakmice jednog kola jedne kategorije, npr. svi pioniri ─────────

/** Omladinske kategorije za bilten kola */
export const BULLETIN_CATEGORIES = [
  { key: "pioniri", label: "Pioniri" },
  { key: "kadeti", label: "Kadeti" },
  { key: "juniori", label: "Juniori" },
  { key: "minibasket", label: "Minibasket" },
  { key: "unobasket", label: "Unobasket" },
] as const;

export type BulletinCategory = (typeof BULLETIN_CATEGORIES)[number]["key"];

const ROUND_MATCH_SELECT =
  `${MATCH_PAGE_SELECT}, competition_id, assignments ( ${MATCH_CREW_SELECT} ), match_periods ( ${PERIODS_SELECT} ), match_reports ( ${REPORT_SELECT} )` as const;

async function roundBulletinRows(category: BulletinCategory, round: number) {
  "use cache: remote";
  cacheLife(LIFE.live);
  cacheTag(TAG.matches, TAG.assignments, TAG.periods, TAG.reports, TAG.competitions, TAG.teams, TAG.clubs, TAG.halls, TAG.profiles);
  const db = createAdminClient();
  const competitions = rows(
    await db
      .from("competitions")
      .select("id, name, short_name, sort, season:seasons!competitions_season_id_fkey!inner ( is_current )")
      .eq("season.is_current", true)
      .eq("category", category)
      .order("sort")
      .order("name"),
  );
  const ids = competitions.map((c) => c.id);
  if (ids.length === 0) return { competitions, matches: [], rounds: [] as number[] };
  const [matches, roundRows] = await Promise.all([
    rows(await db.from("matches").select(ROUND_MATCH_SELECT).in("competition_id", ids).eq("round", round).order("starts_at")),
    rows(await db.from("matches").select("round").in("competition_id", ids).not("round", "is", null)),
  ]);
  const rounds = [...new Set(roundRows.map((r) => r.round!))].sort((a, b) => a - b);
  return { competitions, matches, rounds };
}

/** Bilten kola: utakmice po takmičenju (Grupa 1, Grupa 2…) s ekipom, četvrtinama i biltenom komesara; `rounds` = kola koja postoje */
export async function getRoundBulletin(category: BulletinCategory, round: number) {
  await requireRole("admin");
  const data = await roundBulletinRows(category, round);
  return {
    rounds: data.rounds,
    competitions: data.competitions.map((c) => ({
      id: c.id,
      name: c.name,
      short_name: c.short_name,
      matches: data.matches
        .filter((m) => m.competition_id === c.id)
        .map((m) => {
          // match_reports je 1:1 (PK = match_id), ali PostgREST ga može vratiti i kao listu
          const raw = m.match_reports;
          const report = Array.isArray(raw) ? (raw[0] ?? null) : raw;
          return {
            match: m,
            crew: m.assignments.filter((a) => a.profile),
            periods: [...m.match_periods].sort((a, b) => a.period - b.period),
            report: report ? { ...report, technicals: parseTechnicals(report.technicals) } : null,
          };
        }),
    })),
  };
}

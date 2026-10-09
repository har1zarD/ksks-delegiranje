import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { POSITION_ORDER } from "@/lib/format";
import {
  MATCH_CREW_SELECT,
  MATCH_PAGE_SELECT,
  parseTechnicals,
  PERIODS_SELECT,
  REPORT_SELECT,
} from "./report-selects";

/**
 * Utakmica za osobu koja je na njoj delegirana (ili admina): ekipa, četvrtine, bilten.
 * null = utakmica ne postoji ili korisnik nema pristup.
 */
export async function getMatchPage(matchId: string) {
  const user = await getCurrentUser();
  const supabase = await createClient();

  const [match, crew, periods, report] = await Promise.all([
    supabase.from("matches").select(MATCH_PAGE_SELECT).eq("id", matchId).maybeSingle(),
    supabase.from("assignments").select(MATCH_CREW_SELECT).eq("match_id", matchId).in("status", ["pending", "accepted"]),
    supabase.from("match_periods").select(PERIODS_SELECT).eq("match_id", matchId).order("period"),
    supabase.from("match_reports").select(REPORT_SELECT).eq("match_id", matchId).maybeSingle(),
  ]);
  for (const r of [match, crew, periods, report]) if (r.error) throw r.error;
  if (!match.data) return null;

  const isAdmin = user.role === "admin";
  const mine = (crew.data ?? []).find((a) => a.profile_id === user.id);
  if (!isAdmin && !mine) return null;

  const sortedCrew = (crew.data ?? [])
    .filter((a) => a.profile)
    .sort((a, b) => POSITION_ORDER.indexOf(a.position) - POSITION_ORDER.indexOf(b.position));

  return {
    user,
    match: match.data,
    crew: sortedCrew,
    periods: periods.data ?? [],
    report: report.data
      ? {
          ...report.data,
          technicals: parseTechnicals(report.data.technicals),
        }
      : null,
    isAdmin,
    /** Prihvaćeni komesar ove utakmice: unosi rezultat i piše bilten */
    isCommissioner: mine?.position === "commissioner" && mine.status === "accepted",
  };
}

export type MatchPage = NonNullable<Awaited<ReturnType<typeof getMatchPage>>>;

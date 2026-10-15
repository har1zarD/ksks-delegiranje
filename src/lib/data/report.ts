import { cacheLife, cacheTag } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
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
  };
}

export type MatchPage = NonNullable<Awaited<ReturnType<typeof getMatchPage>>>;

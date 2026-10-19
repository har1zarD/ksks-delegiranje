import { cacheLife, cacheTag } from "next/cache";
import { requireRole } from "@/lib/auth";
import { LIFE, TAG } from "@/lib/cache";
import { dayKey, sarajevoToISO, todayISO } from "@/lib/format";
import { createAdminClient } from "@/lib/supabase/admin";
import { rows } from "./db";

async function socialRows(from: string) {
  "use cache: remote";
  cacheLife(LIFE.live);
  cacheTag(TAG.matches, TAG.competitions, TAG.teams, TAG.clubs, TAG.halls);
  const db = createAdminClient();
  const matches = [];
  const batchSize = 500;
  for (let offset = 0; ; offset += batchSize) {
    const batch = rows(await db.from("matches").select(`
      id, number, round, starts_at, status,
      competition:competitions!matches_competition_id_fkey!inner (
        id, name, short_name, season:seasons!competitions_season_id_fkey!inner ( is_current )
      ),
      home:teams!matches_home_team_id_fkey ( name, club:clubs!teams_club_id_fkey ( logo_url ) ),
      away:teams!matches_away_team_id_fkey ( name, club:clubs!teams_club_id_fkey ( logo_url ) ),
      hall:halls!matches_hall_id_fkey ( name )
    `).eq("competition.season.is_current", true)
      .eq("status", "scheduled")
      .gte("starts_at", sarajevoToISO(from, "00:00"))
      .order("starts_at").order("id").range(offset, offset + batchSize - 1));
    matches.push(...batch);
    if (batch.length < batchSize) break;
  }
  return matches.map((m) => ({
    id: m.id,
    startsAt: m.starts_at,
    date: dayKey(m.starts_at),
    round: m.round,
    competitionId: m.competition.id,
    competition: m.competition.short_name ?? m.competition.name,
    home: m.home?.name ?? "—",
    away: m.away?.name ?? "—",
    homeLogo: m.home?.club?.logo_url ?? null,
    awayLogo: m.away?.club?.logo_url ?? null,
    hall: m.hall?.name ?? null,
  }));
}

export async function getSocialSchedules() {
  await requireRole("admin");
  const today = todayISO();
  const matches = await socialRows(today);
  const now = Date.now();
  return { matches: matches.filter((match) => new Date(match.startsAt).getTime() > now), today, now };
}

export type SocialMatch = Awaited<ReturnType<typeof getSocialSchedules>>["matches"][number];

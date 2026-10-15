import { cacheLife, cacheTag } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { LIFE, TAG, tag } from "@/lib/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";
import { sarajevoToISO, todayISO } from "@/lib/format";
import { rows } from "./db";
import { CREW_SELECT, MY_ASSIGNMENT_SELECT } from "./selects";

// Keširani čitači koriste servisni klijent (zaobilazi RLS): id osobe dolazi ISKLJUČIVO iz getCurrentUser,
// a filter (vlastita, poslana, čeka/prihvaćeno) replicira ono što bi RLS dozvolio.

/** Vlastita delegiranja koja su poslana (neposlane nominacije sudija ne vidi) */
async function myAssignmentRows(profileId: string) {
  "use cache: remote";
  cacheLife(LIFE.live);
  cacheTag(TAG.assignments, TAG.matches, TAG.competitions, TAG.teams, TAG.clubs, TAG.halls);
  return rows(
    await createAdminClient()
      .from("assignments")
      .select(MY_ASSIGNMENT_SELECT)
      .eq("profile_id", profileId)
      .in("status", ["pending", "accepted"])
      .not("notified_at", "is", null),
  );
}

// Delegiranja prijavljenog korisnika.
export async function getMyAssignments() {
  const user = await getCurrentUser();
  const data = await myAssignmentRows(user.id);

  const now = new Date().toISOString();
  const all = data
    .filter((a) => a.match)
    .map((a) => ({ ...a, match: a.match! }))
    .sort((a, b) => a.match.starts_at.localeCompare(b.match.starts_at));
  return {
    upcoming: all.filter((a) => a.match.starts_at >= now),
    past: all.filter((a) => a.match.starts_at < now).reverse(),
  };
}

/** `today` je dio ključa: keš se sam smjenjuje po danu */
async function unavailabilityRows(profileId: string, today: string) {
  "use cache: remote";
  cacheLife(LIFE.live);
  cacheTag(TAG.unavailability);
  return rows(
    await createAdminClient()
      .from("unavailability")
      .select("id, starts_at, ends_at, reason")
      .eq("profile_id", profileId)
      .gt("ends_at", sarajevoToISO(today, "00:00"))
      .order("starts_at"),
  );
}

export async function getMyUnavailability() {
  const user = await getCurrentUser();
  return unavailabilityRows(user.id, todayISO());
}

/** Ekipa jedne utakmice (samo poslane nominacije). Dijeli se između svih koji su na utakmici. */
async function crewRows(matchId: string) {
  "use cache: remote";
  cacheLife(LIFE.live);
  cacheTag(tag.match(matchId), TAG.profiles);
  return rows(
    await createAdminClient()
      .from("assignments")
      .select(CREW_SELECT)
      .eq("match_id", matchId)
      .in("status", ["pending", "accepted"])
      .not("notified_at", "is", null),
  );
}

// Ko je još delegiran na utakmice. Kao RLS: samo utakmice na kojima je i sam korisnik (poslana nominacija).
export async function getCrews(matchIds: string[]) {
  const crews = new Map<string, Crew>();
  if (matchIds.length === 0) return crews;

  const user = await getCurrentUser();
  const mine = new Set((await myAssignmentRows(user.id)).flatMap((a) => (a.match ? [a.match.id] : [])));
  const allowed = [...new Set(matchIds)].filter((id) => mine.has(id));

  for (const data of await Promise.all(allowed.map((id) => crewRows(id)))) {
    for (const a of data) {
      if (!a.profile) continue;
      const crew = crews.get(a.match_id) ?? [];
      crew.push({ position: a.position, status: a.status, name: a.profile.full_name, phone: a.profile.phone });
      crews.set(a.match_id, crew);
    }
  }
  return crews;
}

export type Crew = {
  position: Database["public"]["Enums"]["assignment_position"];
  status: Database["public"]["Enums"]["assignment_status"];
  name: string;
  phone: string | null;
}[];

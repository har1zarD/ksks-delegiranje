import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";
import { todayISO } from "@/lib/format";
import { CREW_SELECT, MY_ASSIGNMENT_SELECT } from "./selects";

// Delegiranja prijavljenog korisnika. RLS ionako ograničava, ali filtriramo eksplicitno.
export async function getMyAssignments() {
  const user = await getCurrentUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("assignments")
    .select(MY_ASSIGNMENT_SELECT)
    .eq("profile_id", user.id)
    .in("status", ["pending", "accepted"])
    .not("notified_at", "is", null);
  if (error) throw error;

  const now = new Date().toISOString();
  const all = (data ?? [])
    .filter((a) => a.match)
    .map((a) => ({ ...a, match: a.match! }))
    .sort((a, b) => a.match.starts_at.localeCompare(b.match.starts_at));
  return {
    upcoming: all.filter((a) => a.match.starts_at >= now),
    past: all.filter((a) => a.match.starts_at < now).reverse(),
  };
}

export async function getMyUnavailability() {
  const user = await getCurrentUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("unavailability")
    .select("id, from_date, to_date, reason")
    .eq("profile_id", user.id)
    .gte("to_date", todayISO())
    .order("from_date");
  if (error) throw error;
  return data ?? [];
}

// Ko je još delegiran na utakmice (RLS: vidljivo samo onima koji su i sami na utakmici)
export async function getCrews(matchIds: string[]) {
  if (matchIds.length === 0) return new Map<string, Crew>();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("assignments")
    .select(CREW_SELECT)
    .in("match_id", matchIds)
    .in("status", ["pending", "accepted"])
    .not("notified_at", "is", null);
  if (error) throw error;

  const crews = new Map<string, Crew>();
  for (const a of data ?? []) {
    if (!a.profile) continue;
    const crew = crews.get(a.match_id) ?? [];
    crew.push({ position: a.position, status: a.status, name: a.profile.full_name, phone: a.profile.phone });
    crews.set(a.match_id, crew);
  }
  return crews;
}

export type Crew = {
  position: Database["public"]["Enums"]["assignment_position"];
  status: Database["public"]["Enums"]["assignment_status"];
  name: string;
  phone: string | null;
}[];

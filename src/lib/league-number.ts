// Broj utakmice u ligama saveza (A2 jug, A1 žene): broj para iz rasporeda saveza, kao u nominaciji i biltenu saveza.
// Okidač u bazi bez upisanog broja daje "zadnji + 1", pa su utakmice napravljene redom dobijale brojeve koji ne odgovaraju
// savezu (A2 jug 5. kolo: 19–21 umjesto 21–25). Zato SVAKO mjesto koje pravi utakmicu (forma, raspored saveza, MCP)
// prije upisa uzima broj odavde. Omladinske lige KSKS-a imaju svoju numeraciju u bazi i ovdje se ne diraju.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { BULLETIN_FIXTURES } from "@/lib/bulletin";

type NewMatch = { competition_id: string; round: number | null; home_team_id: string; away_team_id: string };

/** Broj para iz rasporeda saveza (domaćinstvo svejedno); null kad takmičenje nije liga saveza, par nije u kolu ili je broj zauzet */
export async function leagueMatchNumber(db: SupabaseClient<Database>, m: NewMatch): Promise<number | null> {
  const fixtures = BULLETIN_FIXTURES[m.competition_id];
  if (!fixtures || m.round === null) return null;
  const { data: teams } = await db.from("teams").select("id, name").in("id", [m.home_team_id, m.away_team_id]);
  const pair = [m.home_team_id, m.away_team_id].map((id) => teams?.find((t) => t.id === id)?.name).sort().join("|");
  const fixture = fixtures.find((f) => f.round === m.round && [f.home, f.away].sort().join("|") === pair);
  if (!fixture) return null;
  const { count } = await db.from("matches").select("id", { count: "exact", head: true }).eq("competition_id", m.competition_id).eq("number", fixture.number);
  return count === 0 ? fixture.number : null;
}

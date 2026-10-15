// Selecti i čisti pomoćnici za stranicu utakmice i bilten (bez Next-a; smije se koristiti i u klijentu).
import { MATCH_SELECT } from "./selects";

export const MATCH_PAGE_SELECT = `${MATCH_SELECT}, notes, score_entered_at` as const;

export const MATCH_CREW_SELECT =
  "id, position, status, notified_at, profile_id, profile:profiles!assignments_profile_id_fkey ( id, full_name, phone )" as const;

export const PERIODS_SELECT = "period, home_points, away_points" as const;

export const REPORT_SELECT =
  "match_id, commissioner, spectators, started_at, ended_at, home_fouls, away_fouls, technicals, incidents, remarks, submitted_at, updated_at" as const;

export type TechnicalFoul = { team: "home" | "away"; player: string; minute: number | null; type: "T" | "U" | "D" };

export const FOUL_TYPE_LABEL: Record<TechnicalFoul["type"], string> = {
  T: "Tehnička",
  U: "Nesportska",
  D: "Diskvalifikujuća",
};

/** Normalizuje JSON iz baze u listu tehničkih/nesportskih grešaka */
export function parseTechnicals(json: unknown): TechnicalFoul[] {
  if (!Array.isArray(json)) return [];
  return json.flatMap((t) => {
    if (!t || typeof t !== "object") return [];
    const r = t as Record<string, unknown>;
    const type = r.type === "U" || r.type === "D" ? r.type : "T";
    return [
      {
        team: r.team === "away" ? "away" : "home",
        player: typeof r.player === "string" ? r.player : "",
        minute: typeof r.minute === "number" ? r.minute : null,
        type,
      } satisfies TechnicalFoul,
    ];
  });
}

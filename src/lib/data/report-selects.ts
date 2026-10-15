// Selecti i čisti pomoćnici za stranicu utakmice i bilten (bez Next-a; smije se koristiti i u klijentu).
import { MATCH_SELECT } from "./selects";

export const MATCH_PAGE_SELECT = `${MATCH_SELECT}, notes, score_entered_at` as const;

export const MATCH_CREW_SELECT =
  "id, position, status, notified_at, paid_at, profile_id, profile:profiles!assignments_profile_id_fkey ( id, full_name, phone )" as const;

export const PERIODS_SELECT = "period, home_points, away_points" as const;

export const REPORT_SELECT =
  "match_id, commissioner, spectators, started_at, ended_at, technicals, incidents, remarks, submitted_at, updated_at" as const;

/** Tehnička/nesportska/diskvalifikujuća greška: četvrtina (1–4, 5+ = produžetak) i minuta u toj četvrtini */
export type TechnicalFoul = { team: "home" | "away"; player: string; period: number | null; minute: number | null; type: "T" | "U" | "D" };

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
        period: typeof r.period === "number" && r.period >= 1 ? r.period : null,
        minute: typeof r.minute === "number" ? r.minute : null,
        type,
      } satisfies TechnicalFoul,
    ];
  });
}

/** Četvrtine i produžeci za izbor u biltenu */
export const FOUL_PERIODS = [1, 2, 3, 4, 5, 6] as const;

/** "2. četvrtina" / "1. produžetak" */
export function periodLabel(period: number) {
  return period <= 4 ? `${period}. četvrtina` : `${period - 4}. produžetak`;
}

/** Kad se greška desila: "2. četvrtina, 7. min" (prazno ako nije upisano) */
export function foulTimeLabel(t: Pick<TechnicalFoul, "period" | "minute">) {
  const parts = [t.period != null && periodLabel(t.period), t.minute != null && `${t.minute}. min`].filter(Boolean);
  return parts.join(", ");
}

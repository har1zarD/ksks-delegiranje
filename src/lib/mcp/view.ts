import { isoToSarajevo, MATCH_STATUS_LABEL, POSITION_LABEL, type MatchStatus, type Position } from "@/lib/format";

type MatchRow = {
  id: string;
  starts_at: string;
  round: number | null;
  status: MatchStatus;
  referee_count: number;
  home_score: number | null;
  away_score: number | null;
  competition: { id: string; name: string } | null;
  home: { name: string } | null;
  away: { name: string } | null;
  hall: { name: string } | null;
};

/** Utakmica u obliku pogodnom za model: lokalno sarajevsko vrijeme, čitljiv status */
export function matchView(m: MatchRow) {
  const { date, time } = isoToSarajevo(m.starts_at);
  return {
    id: m.id,
    datum: date,
    vrijeme: time,
    takmicenje: m.competition?.name ?? null,
    takmicenje_id: m.competition?.id ?? null,
    kolo: m.round,
    domacin: m.home?.name ?? null,
    gost: m.away?.name ?? null,
    dvorana: m.hall?.name ?? null,
    broj_sudija: m.referee_count,
    status: MATCH_STATUS_LABEL[m.status],
    rezultat: m.home_score != null ? `${m.home_score}:${m.away_score}` : null,
  };
}

export function positionView(p: Position) {
  return { pozicija: p, pozicija_naziv: POSITION_LABEL[p] };
}

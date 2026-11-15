// Lige saveza (A2 jug, A1 žene): u aplikaciji se prave samo utakmice koje delegira KSKS, pa kolo može biti djelimično
// u bazi. Ostale utakmice kola se odigraju i vode na FIBA LiveStats (takmičenje 50201), ali nemaju našu utakmicu na koju
// bi se rezultat upisao. Ovdje se takva FIBA utakmica prepoznaje po paru iz rasporeda saveza. Čista logika, bez baze.
import { A1_ZENE_FIXTURES, A1_ZENE_ID } from "@/lib/a1-zene-raspored";
import { A2_JUG_FIXTURES, A2_JUG_ID, type Fixture } from "@/lib/a2-jug-raspored";
import { fibaClubBase } from "@/lib/fiba-clubs";

/** FIBA takmičenje u kojem KSBiH vodi A1 ligu, A2 ligu jug i A1 ligu žena */
export const LEAGUE_FIBA_COMPETITION = 50201;

/** Id stavke u listama slika za objavu koja je rezultat s FIBA statistike, bez utakmice u aplikaciji */
export const FIBA_RESULT_PREFIX = "fiba-";

/**
 * `skip`: FIBA nazivi ekipa druge lige u istom FIBA takmičenju koji se od naših razlikuju samo pisanjem
 * (muški "Konjic", "Brcko Distrikt" i "Celik" prema ženskim "ZKK KONJIC", "BRČKO DISTRIKT" i "KŽK ČELIK").
 */
const LEAGUES: { competitionId: string; fixtures: Fixture[]; skip: string[] }[] = [
  { competitionId: A2_JUG_ID, fixtures: A2_JUG_FIXTURES, skip: [] },
  { competitionId: A1_ZENE_ID, fixtures: A1_ZENE_FIXTURES, skip: ["Konjic", "Brcko Distrikt", "KK  Brcko", "Celik"] },
];

/** Par se traži najviše ovoliko dana od datuma kola (uzvrat istog para je u drugom dijelu sezone, mjesecima kasnije) */
const WINDOW_DAYS = 60;
const DAY = 24 * 60 * 60 * 1000;

export type LeagueFibaGame = { id: number; starts_at: string; home_name: string; away_name: string; home_score: number; away_score: number };

export type LeagueFibaResult = {
  gameId: number;
  competitionId: string;
  round: number;
  number: number;
  /** Nazivi ekipa iz rasporeda saveza, domaćin i gost kako ih vodi FIBA */
  home: string;
  away: string;
  homeScore: number;
  awayScore: number;
  startsAt: string;
  /** Dvorana domaćina iz rasporeda (samo kad je domaćin isti kao u rasporedu) */
  hall: string | null;
};

/** Klub iz naziva ekipe, kao public.fiba_team_word: "KK Point - Richmond Park" i "POINT RICHMOND PARK" → "point" */
const word = (name: string) => fibaClubBase(name).split(" ")[0];
const pairKey = (a: string, b: string) => [word(a), word(b)].sort().join("|");
const daysApart = (a: string, b: string) => Math.abs(Date.parse(a) - Date.parse(b)) / DAY;

/**
 * Završene FIBA utakmice koje odgovaraju paru iz rasporeda saveza, a nemaju našu utakmicu.
 * `games`: završene FIBA utakmice s rezultatom koje nisu povezane ni s jednom našom utakmicom.
 * `existing`: naše utakmice (bilo kog statusa osim otkazane); par koji već postoji u aplikaciji se ne dodaje.
 */
export function leagueFibaResults(
  games: LeagueFibaGame[],
  existing: { competitionId: string; home: string; away: string; startsAt: string }[],
): LeagueFibaResult[] {
  const results: LeagueFibaResult[] = [];
  for (const { competitionId, fixtures, skip } of LEAGUES) {
    const ours = existing.filter((m) => m.competitionId === competitionId);
    // Jedna FIBA utakmica po paru iz rasporeda: ona najbliža datumu kola
    const byFixture = new Map<number, { result: LeagueFibaResult; distance: number }>();
    for (const g of games) {
      if (skip.includes(g.home_name) || skip.includes(g.away_name)) continue;
      const key = pairKey(g.home_name, g.away_name);
      const fixture = fixtures
        .filter((f) => pairKey(f.home, f.away) === key)
        .map((f) => ({ f, distance: daysApart(f.roundDate ?? f.date, g.starts_at) }))
        .filter((c) => c.distance <= WINDOW_DAYS)
        .sort((a, b) => a.distance - b.distance)[0];
      if (!fixture) continue;
      if (ours.some((m) => pairKey(m.home, m.away) === key && daysApart(m.startsAt, g.starts_at) <= WINDOW_DAYS)) continue;
      const { f, distance } = fixture;
      if ((byFixture.get(f.number)?.distance ?? Infinity) <= distance) continue;
      const sameHome = word(g.home_name) === word(f.home);
      byFixture.set(f.number, {
        distance,
        result: {
          gameId: g.id,
          competitionId,
          round: f.round,
          number: f.number,
          home: sameHome ? f.home : f.away,
          away: sameHome ? f.away : f.home,
          homeScore: g.home_score,
          awayScore: g.away_score,
          startsAt: g.starts_at,
          hall: sameHome ? f.hall : null,
        },
      });
    }
    results.push(...[...byFixture.values()].map((x) => x.result));
  }
  return results.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

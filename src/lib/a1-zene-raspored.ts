// Zvanični raspored saveza "A1 LIGA ZA KOŠARKAŠICE 2026-2027" (mail Saveza, 06.11.2026), napravljen nakon što je
// ŽKK StarTz odustao od lige: 9 ekipa + "slobodna ekipa" (takmičarski broj 1) umjesto desete, dvokružno.

import type { Fixture } from "./a2-jug-raspored";

export const A1_ZENE_ID = "443667aa-44cf-4c3c-9934-5b3d426c8de4";

/** Takmičarski brojevi iz PDF-a → naziv ekipe; broj 1 je "slobodna ekipa" (BYE), par se ne igra */
const TEAMS = ["", "ŽKK Konjic", "ŽKK Brčko Distrikt", "ŽKK Čelik", "ŽKK Bugojno", "ŽKK Zenica", "ŽKK Faze", "ŽKK Play Off", "ŽKK RMU Banovići", "ŽKK G-Stars"];

const ROUNDS: [string, [number, number][]][] = [
  ["2026-10-24", [[1, 10], [2, 9], [3, 8], [4, 7], [5, 6]]],
  ["2026-10-31", [[10, 6], [7, 5], [8, 4], [9, 3], [1, 2]]],
  ["2026-11-07", [[2, 10], [3, 1], [4, 9], [5, 8], [6, 7]]],
  ["2026-11-14", [[10, 7], [8, 6], [9, 5], [1, 4], [2, 3]]],
  ["2026-11-21", [[3, 10], [4, 2], [5, 1], [6, 9], [7, 8]]],
  ["2026-11-28", [[10, 8], [9, 7], [1, 6], [2, 5], [3, 4]]],
  ["2026-12-05", [[4, 10], [5, 3], [6, 2], [7, 1], [8, 9]]],
  ["2026-12-12", [[10, 9], [1, 8], [2, 7], [3, 6], [4, 5]]],
  ["2026-12-19", [[5, 10], [6, 4], [7, 3], [8, 2], [9, 1]]],
  ["2027-01-30", [[10, 1], [9, 2], [8, 3], [7, 4], [6, 5]]],
  ["2027-02-06", [[6, 10], [5, 7], [4, 8], [3, 9], [2, 1]]],
  ["2027-02-13", [[10, 2], [1, 3], [9, 4], [8, 5], [7, 6]]],
  ["2027-02-20", [[7, 10], [6, 8], [5, 9], [4, 1], [3, 2]]],
  ["2027-02-27", [[10, 3], [2, 4], [1, 5], [9, 6], [8, 7]]],
  ["2027-03-06", [[8, 10], [7, 9], [6, 1], [5, 2], [4, 3]]],
  ["2027-03-13", [[10, 4], [3, 5], [2, 6], [1, 7], [9, 8]]],
  ["2027-03-20", [[9, 10], [8, 1], [7, 2], [6, 3], [5, 4]]],
  ["2027-03-27", [[10, 5], [4, 6], [3, 7], [2, 8], [1, 9]]],
];

/**
 * Sve utakmice po kolima; svako kolo ima tačno jednu slobodnu ekipu, pa 4 odigrane utakmice po kolu.
 * Broj utakmice kao kod saveza: savez broji i par slobodne ekipe (5 brojeva po kolu, broj tog para se ne koristi),
 * npr. 1. kolo 2–5, 3. kolo 11, 13, 14, 15.
 */
export const A1_ZENE_FIXTURES: Fixture[] = ROUNDS.flatMap(([date, pairs], r) =>
  pairs
    .map(([h, a], i) => ({ h, a, number: r * pairs.length + i + 1 }))
    .filter(({ h, a }) => h !== 1 && a !== 1)
    .map(({ h, a, number }) => ({
      round: r + 1,
      roundDate: date,
      number,
      home: TEAMS[h - 1],
      away: TEAMS[a - 1],
      date,
      time: "",
      hall: null,
    })),
);

// Raspored saveza: Juniori, sezona 2026/27 (PDF saveza "JUNIORI- SEZONA 2026-2027", mailom 02.11.2026).
// Dvokružno, 10 "ekipa" (9 pravih + Slobodna ekipa), 18 kola; savez je datum odredio samo za kola 1-9
// (kola 1-9 su već u bazi kao prave utakmice — vidi 20261102000007_juniori_fix_round_dates.sql;
// ovaj raspored postoji da pokrije kola 10-18, koja savez još nije datirao).
import type { Fixture } from "./a2-jug-raspored";

export const JUNIORI_ID = "76190da0-e3cd-4939-81e9-c05cd590890c";

/** Takmičarski brojevi iz PDF-a → naziv ekipe u takmičenju (10 = Slobodna ekipa, bez tima) */
const TEAMS = [
  "KK Point", "KK Igman Richmond Park", "KK Realway", "KK Koš", "KK Bosna - Spars",
  "KK GEN", "KK Ilidža IUS", "KK BBY 3x3", "KK Feniks", "Slobodna ekipa",
];

/** [datum kola ili null (savez još nije odredio), parovi domaćin–gost po takmičarskim brojevima] */
const ROUNDS: [string | null, [number, number][]][] = [
  ["2026-10-31", [[1, 10], [2, 9], [3, 8], [4, 7], [5, 6]]],
  ["2026-11-07", [[10, 6], [7, 5], [8, 4], [9, 3], [1, 2]]],
  ["2026-11-14", [[2, 10], [3, 1], [4, 9], [5, 8], [6, 7]]],
  ["2026-11-21", [[10, 7], [8, 6], [9, 5], [1, 4], [2, 3]]],
  ["2026-11-28", [[3, 10], [4, 2], [5, 1], [6, 9], [7, 8]]],
  ["2026-12-05", [[10, 8], [9, 7], [1, 6], [2, 5], [3, 4]]],
  ["2026-12-12", [[4, 10], [5, 3], [6, 2], [7, 1], [8, 9]]],
  ["2026-12-19", [[10, 9], [1, 8], [2, 7], [3, 6], [4, 5]]],
  ["2026-12-26", [[5, 10], [6, 4], [7, 3], [8, 2], [9, 1]]],
  [null, [[10, 1], [9, 2], [8, 3], [7, 4], [6, 5]]],
  [null, [[6, 10], [5, 7], [4, 8], [3, 9], [2, 1]]],
  [null, [[10, 2], [1, 3], [9, 4], [8, 5], [7, 6]]],
  [null, [[7, 10], [6, 8], [5, 9], [4, 1], [3, 2]]],
  [null, [[10, 3], [2, 4], [1, 5], [9, 6], [8, 7]]],
  [null, [[8, 10], [7, 9], [6, 1], [5, 2], [4, 3]]],
  [null, [[10, 4], [3, 5], [2, 6], [1, 7], [9, 8]]],
  [null, [[9, 10], [8, 1], [7, 2], [6, 3], [5, 4]]],
  [null, [[10, 5], [4, 6], [3, 7], [2, 8], [1, 9]]],
];

export const JUNIORI_FIXTURES: Fixture[] = ROUNDS.flatMap(([date, pairs], r) =>
  pairs.map(([home, away], i) => ({
    round: r + 1,
    roundDate: date,
    number: r * pairs.length + i + 1,
    home: TEAMS[home - 1],
    away: TEAMS[away - 1],
    date: date ?? "",
    time: "",
    hall: null,
  })),
);

// Raspored saveza: Minibasket sezona 2026/27 (PDF saveza "MINIBASKET SEZONA 2026-2027", mailom 02.11.2026).
// Dvokružno, 12 ekipa, 22 kola; savez je datum odredio samo za kola 1-8 (0 = datum još nije određen).
import type { Fixture } from "./a2-jug-raspored";

export const MINIBASKET_ID = "ecd30198-7ae7-4856-a411-d7bb0c7e35d3";

/** Takmičarski brojevi iz PDF-a → naziv ekipe u takmičenju */
const TEAMS = [
  "KK Ilidža", "KK BBY", "KK BBY Jahorina", "KK Mladost", "KK Koš", "KK Realway",
  "KK Realway B", "KK Igman", "KK MVP", "KK Bosna Spars", "KK Bosna Spars B", "KK Feniks",
];

/** [datum kola ili null (savez još nije odredio), parovi domaćin–gost po takmičarskim brojevima] */
const ROUNDS: [string | null, [number, number][]][] = [
  ["2026-11-07", [[1, 12], [2, 11], [3, 10], [4, 9], [5, 8], [6, 7]]],
  ["2026-11-14", [[12, 7], [8, 6], [9, 5], [10, 4], [11, 3], [1, 2]]],
  ["2026-11-21", [[2, 12], [3, 1], [4, 11], [5, 10], [6, 9], [7, 8]]],
  ["2026-11-28", [[12, 8], [9, 7], [10, 6], [11, 5], [1, 4], [2, 3]]],
  ["2026-12-05", [[3, 12], [4, 2], [5, 1], [6, 11], [7, 10], [8, 9]]],
  ["2026-12-12", [[12, 9], [10, 8], [11, 7], [1, 6], [2, 5], [3, 4]]],
  ["2026-12-19", [[4, 12], [5, 3], [6, 2], [7, 1], [8, 11], [9, 10]]],
  ["2026-12-26", [[12, 10], [11, 9], [1, 8], [2, 7], [3, 6], [4, 5]]],
  [null, [[5, 12], [6, 4], [7, 3], [8, 2], [9, 1], [10, 11]]],
  [null, [[12, 11], [1, 10], [2, 9], [3, 8], [4, 7], [5, 6]]],
  [null, [[6, 12], [7, 5], [8, 4], [9, 3], [10, 2], [11, 1]]],
  [null, [[12, 1], [11, 2], [10, 3], [9, 4], [8, 5], [7, 6]]],
  [null, [[7, 12], [6, 8], [5, 9], [4, 10], [3, 11], [2, 1]]],
  [null, [[12, 2], [1, 3], [11, 4], [10, 5], [9, 6], [8, 7]]],
  [null, [[8, 12], [7, 9], [6, 10], [5, 11], [4, 1], [3, 2]]],
  [null, [[12, 3], [2, 4], [1, 5], [11, 6], [10, 7], [9, 8]]],
  [null, [[9, 12], [8, 10], [7, 11], [6, 1], [5, 2], [4, 3]]],
  [null, [[12, 4], [3, 5], [2, 6], [1, 7], [11, 8], [10, 9]]],
  [null, [[10, 12], [9, 11], [8, 1], [7, 2], [6, 3], [5, 4]]],
  [null, [[12, 5], [4, 6], [3, 7], [2, 8], [1, 9], [11, 10]]],
  [null, [[11, 12], [10, 1], [9, 2], [8, 3], [7, 4], [6, 5]]],
  [null, [[12, 6], [5, 7], [4, 8], [3, 9], [2, 10], [1, 11]]],
];

export const MINIBASKET_FIXTURES: Fixture[] = ROUNDS.flatMap(([date, pairs], r) =>
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

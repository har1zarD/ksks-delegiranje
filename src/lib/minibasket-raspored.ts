// Raspored saveza: Minibasket sezona 2026/27. Puni raspored (parovi i datumi kola 1-22) iz
// "MINIBASKET 2026-2027.xlsx" (mail "MINI BASKET" od Košarkaški savez KS, 09.11.2026) — potvrđuje
// parove i datume iz ranijih mailova, osim kola 3 (28.11.2026, ne 29.11.2026 kako je ranije upisano).
// Realway/Realway B u apk vode se kao Realway Plavi/Realway Bijeli; Bosna Spars B kao KK Spars Jahorina.
// Dvokružno, 12 ekipa, 22 kola.
import type { Fixture } from "./a2-jug-raspored";

export const MINIBASKET_ID = "ecd30198-7ae7-4856-a411-d7bb0c7e35d3";

/** Takmičarski brojevi iz PDF-a → naziv ekipe u takmičenju */
const TEAMS = [
  "KK Ilidža", "KK BBY", "KK BBY Jahorina", "KK Mladost", "KK Koš", "KK Realway Plavi",
  "KK Realway Bijeli", "KK Igman", "KK MVP", "KK Bosna Spars", "KK Spars Jahorina", "KK Feniks",
];

/** [datum kola ili null (savez još nije odredio), parovi domaćin–gost po takmičarskim brojevima] */
const ROUNDS: [string | null, [number, number][]][] = [
  ["2026-11-15", [[1, 12], [2, 11], [3, 10], [4, 9], [5, 8], [6, 7]]],
  ["2026-11-21", [[12, 7], [8, 6], [9, 5], [10, 4], [11, 3], [1, 2]]],
  ["2026-11-28", [[2, 12], [3, 1], [4, 11], [5, 10], [6, 9], [7, 8]]],
  ["2026-12-05", [[12, 8], [9, 7], [10, 6], [11, 5], [1, 4], [2, 3]]],
  ["2026-12-12", [[3, 12], [4, 2], [5, 1], [6, 11], [7, 10], [8, 9]]],
  ["2026-12-19", [[12, 9], [10, 8], [11, 7], [1, 6], [2, 5], [3, 4]]],
  ["2026-12-26", [[4, 12], [5, 3], [6, 2], [7, 1], [8, 11], [9, 10]]],
  ["2027-01-30", [[12, 10], [11, 9], [1, 8], [2, 7], [3, 6], [4, 5]]],
  ["2027-02-06", [[5, 12], [6, 4], [7, 3], [8, 2], [9, 1], [10, 11]]],
  ["2027-02-13", [[12, 11], [1, 10], [2, 9], [3, 8], [4, 7], [5, 6]]],
  ["2027-02-20", [[6, 12], [7, 5], [8, 4], [9, 3], [10, 2], [11, 1]]],
  ["2027-02-27", [[12, 1], [11, 2], [10, 3], [9, 4], [8, 5], [7, 6]]],
  ["2027-03-06", [[7, 12], [6, 8], [5, 9], [4, 10], [3, 11], [2, 1]]],
  ["2027-03-13", [[12, 2], [1, 3], [11, 4], [10, 5], [9, 6], [8, 7]]],
  ["2027-03-20", [[8, 12], [7, 9], [6, 10], [5, 11], [4, 1], [3, 2]]],
  ["2027-03-27", [[12, 3], [2, 4], [1, 5], [11, 6], [10, 7], [9, 8]]],
  ["2027-04-03", [[9, 12], [8, 10], [7, 11], [6, 1], [5, 2], [4, 3]]],
  ["2027-04-10", [[12, 4], [3, 5], [2, 6], [1, 7], [11, 8], [10, 9]]],
  ["2027-04-17", [[10, 12], [9, 11], [8, 1], [7, 2], [6, 3], [5, 4]]],
  ["2027-04-24", [[12, 5], [4, 6], [3, 7], [2, 8], [1, 9], [11, 10]]],
  ["2027-05-08", [[11, 12], [10, 1], [9, 2], [8, 3], [7, 4], [6, 5]]],
  ["2027-05-15", [[12, 6], [5, 7], [4, 8], [3, 9], [2, 10], [1, 11]]],
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

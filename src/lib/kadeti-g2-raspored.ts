// Raspored saveza: Kadeti — Grupa 2, sezona 2026/27 (PDF saveza "KADETI GRUPA 2", mailom 02.11.2026).
// Jednokružno, 12 "ekipa" (11 pravih + Slobodna ekipa), 11 kola; savez je datum odredio samo za kola 1-4 (0 = datum još nije određen).
// "Slobodna ekipa" je slobodan termin (neparan broj ekipa) — ta imena se namjerno ne mapiraju ni na jednu ekipu u takmičenju.
import type { Fixture } from "./a2-jug-raspored";

export const KADETI_G2_ID = "efa174a7-1a9a-464c-ad1d-5c8ba0aee67b";

/** Takmičarski brojevi iz PDF-a → naziv ekipe u takmičenju (12 = Slobodna ekipa, bez tima) */
const TEAMS = [
  "KK Point", "KK MVP B", "KK BBY 3x3", "KK Realway Plavi", "KK Koš B", "KK Realway Bijeli",
  "KK GEN", "KK Hrasnica", "KK Mladost", "KK Ilidža Black", "KK BBY", "Slobodna ekipa",
];

/** [datum kola ili null (savez još nije odredio), parovi domaćin–gost po takmičarskim brojevima] */
const ROUNDS: [string | null, [number, number][]][] = [
  ["2026-11-07", [[1, 12], [2, 11], [3, 10], [4, 9], [5, 8], [6, 7]]],
  ["2026-11-21", [[12, 7], [8, 6], [9, 5], [10, 4], [11, 3], [1, 2]]],
  ["2026-12-05", [[2, 12], [3, 1], [4, 11], [5, 10], [6, 9], [7, 8]]],
  ["2026-12-19", [[12, 8], [9, 7], [10, 6], [11, 5], [1, 4], [2, 3]]],
  [null, [[3, 12], [4, 2], [5, 1], [6, 11], [7, 10], [8, 9]]],
  [null, [[12, 9], [10, 8], [11, 7], [1, 6], [2, 5], [3, 4]]],
  [null, [[4, 12], [5, 3], [6, 2], [7, 1], [8, 11], [9, 10]]],
  [null, [[12, 10], [11, 9], [1, 8], [2, 7], [3, 6], [4, 5]]],
  [null, [[5, 12], [6, 4], [7, 3], [8, 2], [9, 1], [10, 11]]],
  [null, [[12, 11], [1, 10], [2, 9], [3, 8], [4, 7], [5, 6]]],
  [null, [[6, 12], [7, 5], [8, 4], [9, 3], [10, 2], [11, 1]]],
];

export const KADETI_G2_FIXTURES: Fixture[] = ROUNDS.flatMap(([date, pairs], r) =>
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

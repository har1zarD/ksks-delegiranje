// Raspored saveza: Unobasket, sezona 2026/27 (PDF saveza "UNO BASKET", 16.11.2026).
// Dvokružno, 8 "ekipa" (7 pravih + Slobodna ekipa), 14 kola; savez je odredio datume svih kola.
// "Slobodna ekipa" je slobodan termin (neparan broj ekipa) — to ime se namjerno ne mapira ni na jednu ekipu u takmičenju.
// BBY se u apk vodi kao KK BBY Blue, OKK Igman kao KK Igman.
import type { Fixture } from "./a2-jug-raspored";

export const UNOBASKET_ID = "c6b366f8-1d26-4b9d-94fe-bfefd988ca60";

/** Takmičarski brojevi iz PDF-a → naziv ekipe u takmičenju (8 = Slobodna ekipa, bez tima) */
const TEAMS = [
  "KK Bošnjak", "KK Ilidža", "KK BBY Blue", "KK Mladost", "KK Realway", "KK MVP", "KK Igman", "Slobodna ekipa",
];

/** [datum kola, parovi domaćin–gost po takmičarskim brojevima] */
const ROUNDS: [string | null, [number, number][]][] = [
  ["2026-11-21", [[1, 8], [2, 7], [3, 6], [4, 5]]],
  ["2026-12-05", [[8, 5], [6, 4], [7, 3], [1, 2]]],
  ["2026-12-12", [[2, 8], [3, 1], [4, 7], [5, 6]]],
  ["2026-12-19", [[8, 6], [7, 5], [1, 4], [2, 3]]],
  ["2027-01-30", [[3, 8], [4, 2], [5, 1], [6, 7]]],
  ["2027-02-06", [[8, 7], [1, 6], [2, 5], [3, 4]]],
  ["2027-02-20", [[4, 8], [5, 3], [6, 2], [7, 1]]],
  ["2027-03-06", [[8, 1], [7, 2], [6, 3], [5, 4]]],
  ["2027-03-20", [[5, 8], [4, 6], [3, 7], [2, 1]]],
  ["2027-04-03", [[8, 2], [1, 3], [7, 4], [6, 5]]],
  ["2027-04-17", [[6, 8], [5, 7], [4, 1], [3, 2]]],
  ["2027-04-24", [[8, 3], [2, 4], [1, 5], [7, 6]]],
  ["2027-05-08", [[7, 8], [6, 1], [5, 2], [4, 3]]],
  ["2027-05-22", [[8, 4], [3, 5], [2, 6], [1, 7]]],
];

export const UNOBASKET_FIXTURES: Fixture[] = ROUNDS.flatMap(([date, pairs], r) =>
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

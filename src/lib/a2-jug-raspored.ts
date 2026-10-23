// Poseban slučaj: raspored A2 lige jug KSBiH 2026/27 (PDF saveza "A2 LIGA GRUPA JUG 2026-2027").
// Parovi kola nisu utakmice u bazi (nigdje se ne prikazuju) dok admin na stranici takmičenja ne upiše termin i dvoranu
// i ne napravi utakmicu. Utakmica se prepoznaje po paru domaćin–gost (dvokružno: svaki par jednom).

export const A2_JUG_ID = "d74bc0b4-99f1-4313-8c15-463f76d06764";

/** Takmičarski brojevi iz PDF-a → naziv ekipe u takmičenju */
const TEAMS = ["KK Vukovi", "KK Never Stop", "KK Lokomotiva", "KK Point - Richmond Park", "KK Hrasnica", "KK Čelik", "KK Realway", "KK Mladost", "KK Ilidža", "KK Star Fojnica"];

/** Dvorana domaćina iz nominacije 1. kola */
const HOME_HALLS: Record<string, string> = {
  "KK Vukovi": "SD Arena",
  "KK Never Stop": "SD Donji Vakuf",
  "KK Lokomotiva": "USRC Midhad Hujdur Hujka",
  "KK Point - Richmond Park": "KSC Sabit Hadžić",
  "KK Hrasnica": "SD Hrasnica",
};

/** Termini 1. kola iz nominacije (po domaćinu) */
const ROUND_ONE: Record<string, { date: string; time: string }> = {
  "KK Vukovi": { date: "2026-10-24", time: "17:00" },
  "KK Never Stop": { date: "2026-10-25", time: "20:30" },
  "KK Lokomotiva": { date: "2026-10-25", time: "13:00" },
  "KK Point - Richmond Park": { date: "2026-10-25", time: "14:00" },
  "KK Hrasnica": { date: "2026-10-28", time: "16:30" },
};

/** [datum kola, parovi domaćin–gost po takmičarskim brojevima] */
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

/** roundDate = datum kola iz rasporeda; date/time = prijedlog termina (1. kolo iz nominacije) */
export type Fixture = { round: number; roundDate: string; number: number; home: string; away: string; date: string; time: string; hall: string | null };

/** Sve utakmice po kolima; broj utakmice ide redom kao u nominaciji (1. kolo: 1–5, 2. kolo: 6–10…) */
export const A2_JUG_FIXTURES: Fixture[] = ROUNDS.flatMap(([date, pairs], r) =>
  pairs.map(([h, a], i) => {
    const home = TEAMS[h - 1];
    const first = r === 0 ? ROUND_ONE[home] : undefined;
    return {
      round: r + 1,
      roundDate: date,
      number: r * pairs.length + i + 1,
      home,
      away: TEAMS[a - 1],
      date: first?.date ?? date,
      time: first?.time ?? "",
      hall: HOME_HALLS[home] ?? null,
    };
  }),
);

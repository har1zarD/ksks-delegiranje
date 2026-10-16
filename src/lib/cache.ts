// Keširanje podataka: jedini izvor istine za tagove, trajanja i invalidaciju.
//
// Pravilo: svaki keširani čitač (`"use cache: remote"`) označi se SVIM tagovima tabela koje čita
// (i onih koje ugrađuje kroz select, npr. nazive ekipa), a svako pisanje poziva `invalidate(...)`
// s tabelom u koju piše. Tako promašena invalidacija ne može ostaviti zastarjel prikaz.
//
// Autorizacija NIKAD nije u kešu: keširani čitači koriste servisni klijent (zaobilazi RLS), pa
// vanjska, nekeširana funkcija prvo provjeri ulogu (requireRole / getCurrentUser) i filtere koje bi RLS primijenio.
import { revalidateTag, updateTag } from "next/cache";

/** Jedan tag po domeni podataka */
export const TAG = {
  competitions: "competitions", // takmičenja, sezone, pravila naknada
  teams: "teams",
  clubs: "clubs",
  halls: "halls",
  matches: "matches", // utakmice (uključujući ukupni rezultat i status)
  periods: "periods", // rezultat po četvrtinama (match_periods)
  assignments: "assignments",
  profiles: "profiles",
  unavailability: "unavailability",
  reports: "reports", // bilten (match_reports)
  payments: "payments", // kotizacije (fee_payments)
  licenses: "licenses", // licence igrača i službenih lica
} as const;

/** Tag jedne utakmice: stranica utakmice, ekipa i bilten ne moraju padati kad se mijenja druga utakmica */
export const tag = {
  match: (id: string) => `match:${id}`,
};

/**
 * Trajanje keša: najviše 1 minuta za sve, pa se i izmjena direktno u bazi vidi za minutu.
 * Izmjena kroz aplikaciju se vidi odmah (tag). expire 60 = poslije minute se uvijek čita baza, bez zastarjelog prikaza.
 */
const ONE_MINUTE = { stale: 30, revalidate: 60, expire: 60 } as const;

export const LIFE = {
  /** Šifarnici (takmičenja, ekipe, klubovi, dvorane, licence) */
  reference: ONE_MINUTE,
  /** Profili */
  people: ONE_MINUTE,
  /** Utakmice, delegiranja, rezultati, odsustva, finansije */
  live: ONE_MINUTE,
} as const;

/**
 * Tabela u koju se piše → tagovi koje treba invalidirati.
 * Čitači tagiraju i ugrađene tabele, pa ovdje ide samo tabela u koju se piše (i posljedice okidača/kaskade).
 */
const WRITES = {
  competitions: [TAG.competitions], // i seasons, pravila naknada
  teams: [TAG.teams],
  clubs: [TAG.clubs],
  halls: [TAG.halls],
  matches: [TAG.matches],
  match_periods: [TAG.periods, TAG.matches], // okidač sync_match_score upisuje ukupni rezultat u matches
  assignments: [TAG.assignments],
  profiles: [TAG.profiles],
  unavailability: [TAG.unavailability],
  match_reports: [TAG.reports],
  fee_payments: [TAG.payments],
  licenses: [TAG.licenses],
  license_folders: [TAG.licenses],
} as const;

type Table = keyof typeof WRITES;
/** Tabele vezane za jednu utakmicu: pisanje mora navesti utakmicu (tag.match) */
type MatchTable = "matches" | "match_periods" | "assignments" | "match_reports";

/** Pisanje u tabelu; za tabele utakmice { table, match } (običan "matches" samo za grupno dodavanje novih utakmica) */
export type Write = Exclude<Table, MatchTable> | "matches" | { table: MatchTable; match: string };

function tagsOf(writes: Write[]) {
  const tags = new Set<string>();
  for (const w of writes) {
    for (const t of WRITES[typeof w === "string" ? w : w.table]) tags.add(t);
    if (typeof w !== "string") tags.add(tag.match(w.match));
  }
  return tags;
}

/** Server Action: odmah istječe keš (korisnik vidi svoju izmjenu) i osvježava klijent */
export function invalidate(...writes: Write[]) {
  for (const t of tagsOf(writes)) updateTag(t);
}

/** Route handler / MCP: updateTag tu nije dozvoljen. { expire: 0 } = bez zastarjelog sadržaja, sljedeće čitanje ide u bazu. */
export function invalidateFromRoute(...writes: Write[]) {
  for (const t of tagsOf(writes)) revalidateTag(t, { expire: 0 });
}

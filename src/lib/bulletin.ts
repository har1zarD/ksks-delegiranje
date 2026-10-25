// Bilten: zahtjev za PDF i primjedbe iz biltena komesara. Bez Next-a; koristi ga i klijent (bilder) i server (PDF ruta).
import { foulTimeLabel, type TechnicalFoul } from "@/lib/data/report-selects";
import { A1_ZENE_FIXTURES, A1_ZENE_ID } from "@/lib/a1-zene-raspored";
import { A2_JUG_FIXTURES, A2_JUG_ID, type Fixture } from "@/lib/a2-jug-raspored";
import { addDays, formatDate } from "@/lib/format";

/** Šta bilder šalje PDF ruti: izbor utakmica, ispravljene primjedbe i dijelovi biltena (null / prazno = dio se ne ispisuje) */
export type BulletinRequest = {
  number: string;
  title: string;
  signature: string;
  cover: boolean;
  competitionIds: string[];
  round: number | null;
  /** Registracija utakmica: izabrane utakmice (prazno = dio se ne ispisuje) */
  matchIds: string[];
  /** Primjedbe po utakmici (id → tekst) */
  remarks: Record<string, string>;
  /** Komesar i sudije po utakmici kako idu u bilten (delegiranje, FIBA statistika ili ručni unos) */
  officials: Record<string, BulletinOfficials>;
  /** Odluke: jedna po redu */
  decisions: string | null;
  /** Tabela izabranih takmičenja */
  standings: boolean;
  /** Nominacija narednog kola: kolo i da li se ispisuju imena (inače prazna polja) */
  nominations: { round: number; names: boolean } | null;
};

/** Komesar i sudije u biltenu (sudije razdvojene zarezom) */
export type BulletinOfficials = { commissioner: string; referees: string };

export const NO_REMARKS = "Bez primjedbi.";

/** Delegirani komesar i sudije naše utakmice; prazno kad nisu delegirani */
export function delegatedOfficials(officials: { position: string; name: string | null }[]): BulletinOfficials {
  const names = (pick: (position: string) => boolean) => officials.filter((o) => pick(o.position) && o.name).map((o) => o.name!).join(", ");
  return { commissioner: names((p) => p === "commissioner"), referees: names((p) => p.startsWith("referee")) };
}

const FOUL_PHRASE: Record<TechnicalFoul["type"], string> = {
  T: "tehnička greška",
  U: "nesportska greška",
  D: "diskvalifikujuća greška",
};

/**
 * Primjedbe iz biltena komesara: svaka greška u svom redu ("Dosuđena tehnička greška ekipi Kakanj (Velić M.), 3. četvrtina, 4. min."),
 * pa incidenti i napomene; bez ičega "Bez primjedbi."
 */
export function defaultRemarks(m: {
  home: string;
  away: string;
  report: { technicals: TechnicalFoul[]; incidents: string | null; remarks: string | null } | null;
}) {
  const r = m.report;
  if (!r) return NO_REMARKS;
  const lines = r.technicals.map((t) => {
    const when = foulTimeLabel(t);
    return `Dosuđena ${FOUL_PHRASE[t.type]} ekipi ${t.team === "home" ? m.home : m.away}${t.player.trim() ? ` (${t.player.trim()})` : ""}${when ? `, ${when}` : ""}.`;
  });
  for (const text of [r.incidents, r.remarks]) if (text?.trim()) lines.push(text.trim());
  return lines.length > 0 ? lines.join("\n") : NO_REMARKS;
}

/** Raspored saveza po takmičenju: nominacija narednog kola kad njegove utakmice još nisu napravljene u aplikaciji */
export const BULLETIN_FIXTURES: Record<string, Fixture[]> = { [A2_JUG_ID]: A2_JUG_FIXTURES, [A1_ZENE_ID]: A1_ZENE_FIXTURES };

/** Vikend kola iz rasporeda (subota): "7./8. 11. 2026." ili "31. 10. – 1. 11. 2026." */
export function roundWeekend(saturday: string) {
  const sunday = addDays(saturday, 1);
  if (saturday.slice(0, 7) !== sunday.slice(0, 7)) return `${formatDate(saturday).slice(0, -6)} – ${formatDate(sunday)}`;
  return `${Number(saturday.slice(8))}./${formatDate(sunday)}`;
}

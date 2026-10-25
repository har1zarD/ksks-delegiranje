// Bilten: zahtjev za PDF i primjedbe iz biltena komesara. Bez Next-a; koristi ga i klijent (bilder) i server (PDF ruta).
import { foulTimeLabel, type TechnicalFoul } from "@/lib/data/report-selects";

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
  /** Odluke: jedna po redu */
  decisions: string | null;
  /** Tabela izabranih takmičenja */
  standings: boolean;
  /** Nominacija narednog kola: kolo i da li se ispisuju imena (inače prazna polja) */
  nominations: { round: number; names: boolean } | null;
};

export const NO_REMARKS = "Bez primjedbi.";

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

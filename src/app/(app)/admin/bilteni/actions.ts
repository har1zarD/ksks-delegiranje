"use server";

import { getBulletinData } from "@/lib/data/admin";
import { getSocialTables } from "@/lib/data/results";
import { bulletinBrand, bulletinPdf } from "@/lib/bulletin-pdf";
import { BULLETIN_FIXTURES, defaultRemarks, delegatedOfficials, roundWeekend, type BulletinOfficials, type BulletinRequest } from "@/lib/bulletin";
import type { BulletinMatch } from "@/lib/data/admin";
import type { NominationMatch } from "@/lib/bulletin-pdf";
import { requireRole } from "@/lib/auth";
import { fetchFibaGame } from "@/lib/fiba";
import { seasonLabel } from "@/lib/schedule-pdf";
import { formatDate, isoToSarajevo, slug } from "@/lib/format";

/** Raspored saveza nema sastav: prazna polja za komesara i tri sudije, kao u biltenima KSBiH */
const FIXTURE_OFFICIALS: NominationMatch["officials"] = (["commissioner", "referee_1", "referee_2", "referee_3"] as const).map((position) => ({ position, name: null }));

/** Utakmice kola za nominaciju: napravljene u aplikaciji (datum i dvorana utakmice), inače iz rasporeda saveza (vikend kola) */
function nominationMatches(competitionId: string, round: number, matches: BulletinMatch[]): NominationMatch[] {
  const own = matches
    .filter((m) => m.competitionId === competitionId && m.round === round)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt) || (a.number ?? Infinity) - (b.number ?? Infinity) || 0);
  if (own.length > 0) {
    return own.map((m) => ({ number: m.number, home: m.home, away: m.away, date: formatDate(isoToSarajevo(m.startsAt).date), hall: m.hall, officials: m.officials }));
  }
  return (BULLETIN_FIXTURES[competitionId] ?? [])
    .filter((f) => f.round === round)
    .map((f) => ({ number: f.number, home: f.home, away: f.away, date: roundWeekend(f.roundDate), hall: f.hall, officials: FIXTURE_OFFICIALS }));
}

export type BulletinPdfResult = { pdf: string; name: string } | { error: string };

// PDF bilten kao server action, ne ruta: Hobby plan dozvoljava 12 serverless funkcija, a action radi u funkciji stranice.
// Podaci utakmica se ponovo čitaju iz baze, od bildera stižu samo izbor i tekstovi. getBulletinData provjerava admin ulogu.
/** PDF (base64) i naziv fajla */
export async function makeBulletinPdf(req: BulletinRequest): Promise<BulletinPdfResult> {
  if (!req || !Array.isArray(req.competitionIds) || !Array.isArray(req.matchIds)) return { error: "Neispravan zahtjev." };
  const [data, tables] = await Promise.all([getBulletinData(), req.standings ? getSocialTables() : Promise.resolve([])]);

  const competitions = data.competitions.filter((c) => req.competitionIds.includes(c.id));
  if (competitions.length === 0) return { error: "Nema izabranog takmičenja." };
  // Broj utakmice može biti prazan (utakmica još bez broja): takve na kraj
  const byNumber = (a: { number: number | null }, b: { number: number | null }) => (a.number ?? Infinity) - (b.number ?? Infinity) || 0;

  const chosen = new Set(req.matchIds);
  const registration = competitions
    .map((c) => ({
      name: c.name,
      items: data.matches
        .filter((m) => m.competitionId === c.id && chosen.has(m.id))
        .sort(byNumber)
        .map((m) => {
          const sent = req.officials?.[m.id];
          const officials = sent && typeof sent.commissioner === "string" && typeof sent.referees === "string" ? sent : delegatedOfficials(m.officials);
          return { ...m, ...officials, remarks: typeof req.remarks?.[m.id] === "string" ? req.remarks[m.id] : defaultRemarks(m) };
        }),
    }))
    .filter((g) => g.items.length > 0);

  const nom = req.nominations;
  const nominations = nom
    ? {
        round: nom.round,
        names: Boolean(nom.names),
        groups: competitions
          .map((c) => ({ name: c.name, items: nominationMatches(c.id, nom.round, data.matches) }))
          .filter((g) => g.items.length > 0),
      }
    : null;

  const standings = req.standings
    ? competitions.flatMap((c) => {
        const t = tables.find((x) => x.id === c.id);
        return t ? [{ name: c.name, items: t.standings }] : [];
      })
    : null;

  const decisions = req.decisions
    ?.split(/\r?\n/)
    // PDF sam numeriše odluke: broj koji je admin upisao na početku reda ("1. ", "2) ") se izostavlja
    .map((l) => l.trim().replace(/^\d{1,2}\s*[.)]\s*/, ""))
    .filter(Boolean);

  const title = req.title?.trim() || [...new Set(competitions.map((c) => c.label))].join(" / ");
  const brand = bulletinBrand(competitions.map((c) => c.id));
  const pdf = await bulletinPdf({
    brand,
    league: brand.ksbih ? brand.org : competitions.every((c) => c.youth) ? "Omladinska liga Kantona Sarajevo" : brand.org,
    season: seasonLabel(competitions[0].season),
    number: String(req.number ?? "").slice(0, 20),
    title,
    signature: String(req.signature ?? ""),
    cover: req.cover !== false,
    registration: registration.length > 0 ? { round: req.round, groups: registration } : null,
    decisions: decisions ?? null,
    standings,
    nominations,
  });
  return { pdf: Buffer.from(pdf).toString("base64"), name: `bilten${req.number?.trim() ? `-${slug(req.number)}` : ""}-${slug(title)}.pdf` };
}

/** Komesar i sudije s FIBA statistike povezanih utakmica (FIBA id → imena); utakmica bez podataka se izostavlja */
export async function getFibaOfficials(gameIds: number[]): Promise<Record<number, BulletinOfficials>> {
  await requireRole("admin");
  const ids = [...new Set(gameIds.filter((id) => Number.isInteger(id) && id > 0))].slice(0, 40);
  const games = await Promise.all(ids.map((id) => fetchFibaGame(id).catch(() => null)));
  const out: Record<number, BulletinOfficials> = {};
  games.forEach((g, i) => {
    if (!g || g.officials.length === 0) return;
    out[ids[i]] = {
      commissioner: g.officials.filter((o) => o.role === "Komesar").map((o) => o.name).join(", "),
      referees: g.officials.filter((o) => o.role !== "Komesar").map((o) => o.name).join(", "),
    };
  });
  return out;
}

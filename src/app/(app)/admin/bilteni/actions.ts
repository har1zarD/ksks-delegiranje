"use server";

import { getBulletinData } from "@/lib/data/admin";
import { getSocialTables } from "@/lib/data/results";
import { bulletinBrand, bulletinPdf } from "@/lib/bulletin-pdf";
import { defaultRemarks, type BulletinRequest } from "@/lib/bulletin";
import { seasonLabel } from "@/lib/schedule-pdf";
import { slug } from "@/lib/format";

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
        .map((m) => ({ ...m, remarks: typeof req.remarks?.[m.id] === "string" ? req.remarks[m.id] : defaultRemarks(m) })),
    }))
    .filter((g) => g.items.length > 0);

  const nom = req.nominations;
  const nominations = nom
    ? {
        round: nom.round,
        names: Boolean(nom.names),
        groups: competitions
          .map((c) => ({
            name: c.name,
            items: data.matches.filter((m) => m.competitionId === c.id && m.round === nom.round).sort((a, b) => a.startsAt.localeCompare(b.startsAt) || byNumber(a, b)),
          }))
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
    .map((l) => l.trim())
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

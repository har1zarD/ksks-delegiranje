"use server";

import { getBulletinData } from "@/lib/data/admin";
import { getSocialTables } from "@/lib/data/results";
import { bulletinBrand, bulletinPdf, type BulletinPdfInput, type RegistrationMatch } from "@/lib/bulletin-pdf";
import { bulletinDocx } from "@/lib/bulletin-docx";
import { BULLETIN_FIXTURES, defaultRemarks, delegatedOfficials, missingFixtures, roundWeekend, type BulletinDraft, type BulletinOfficials, type BulletinRequest } from "@/lib/bulletin";
import { createClient } from "@/lib/supabase/server";
import type { BulletinMatch } from "@/lib/data/admin";
import type { NominationMatch } from "@/lib/bulletin-pdf";
import { requireRole } from "@/lib/auth";
import { fetchFibaGame } from "@/lib/fiba";
import { seasonLabel } from "@/lib/schedule-pdf";
import { formatDate, isoToSarajevo, slug } from "@/lib/format";

/** Raspored saveza nema sastav: prazna polja za komesara i tri sudije, kao u biltenima KSBiH */
const FIXTURE_OFFICIALS: NominationMatch["officials"] = (["commissioner", "referee_1", "referee_2", "referee_3"] as const).map((position) => ({ position, name: null }));

/** Utakmice kola za nominaciju: napravljene u aplikaciji (datum i dvorana utakmice), dopunjene parovima iz rasporeda saveza koji u aplikaciji još nisu napravljeni (vikend kola) */
function nominationMatches(competitionId: string, round: number, matches: BulletinMatch[]): NominationMatch[] {
  const own = matches
    .filter((m) => m.competitionId === competitionId && m.round === round)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt) || (a.number ?? Infinity) - (b.number ?? Infinity) || 0);
  const fixtures = (BULLETIN_FIXTURES[competitionId] ?? []).filter((f) => f.round === round);
  const missing = missingFixtures(fixtures, own);
  // Brojevi kola iz rasporeda koje utakmice u aplikaciji nisu zauzele, redom (domaćinstvo i broj u aplikaciji mogu odstupati od rasporeda)
  const taken = new Set(own.map((m) => m.number));
  const free = fixtures.map((f) => f.number).filter((n) => !taken.has(n));
  return [
    // Liga saveza: utakmica u aplikaciji bez komesara i sudija u sastavu dobija ista prazna polja kao parovi iz rasporeda
    ...own.map((m) => ({ number: m.number, home: m.home, away: m.away, date: formatDate(isoToSarajevo(m.startsAt).date), hall: m.hall, officials: fixtures.length > 0 && m.officials.length === 0 ? FIXTURE_OFFICIALS : m.officials })),
    ...missing.map((f, i) => ({ number: free[i] ?? f.number, home: f.home, away: f.away, date: f.roundDate ? roundWeekend(f.roundDate) : "datum nije određen", hall: f.hall, officials: FIXTURE_OFFICIALS })),
  ];
}

export type BulletinPdfResult = { pdf: string; name: string } | { error: string };
export type BulletinDocxResult = { docx: string; name: string } | { error: string };

// Bilten kao server action, ne ruta: Hobby plan dozvoljava 12 serverless funkcija, a action radi u funkciji stranice.
// Podaci utakmica se ponovo čitaju iz baze, od bildera stižu samo izbor i tekstovi. getBulletinData provjerava admin ulogu.
/** PDF (base64) i naziv fajla */
export async function makeBulletinPdf(req: BulletinRequest): Promise<BulletinPdfResult> {
  const b = await bulletinInput(req);
  if ("error" in b) return b;
  return { pdf: Buffer.from(await bulletinPdf(b.input)).toString("base64"), name: `${b.name}.pdf` };
}

/** Word (.docx, base64) istog biltena i naziv fajla */
export async function makeBulletinDocx(req: BulletinRequest): Promise<BulletinDocxResult> {
  const b = await bulletinInput(req);
  if ("error" in b) return b;
  return { docx: (await bulletinDocx(b.input)).toString("base64"), name: `${b.name}.docx` };
}

/** Sadržaj biltena iz zahtjeva bildera (isti za PDF i Word) i naziv fajla bez nastavka */
async function bulletinInput(req: BulletinRequest): Promise<{ input: BulletinPdfInput; name: string } | { error: string }> {
  if (!req || !Array.isArray(req.competitionIds) || !Array.isArray(req.matchIds)) return { error: "Neispravan zahtjev." };
  const [data, tables] = await Promise.all([getBulletinData(), req.standings ? getSocialTables() : Promise.resolve([])]);

  const competitions = data.competitions.filter((c) => req.competitionIds.includes(c.id));
  if (competitions.length === 0) return { error: "Nema izabranog takmičenja." };
  // Broj utakmice može biti prazan (utakmica još bez broja): takve na kraj
  const byNumber = (a: { number: number | null }, b: { number: number | null }) => (a.number ?? Infinity) - (b.number ?? Infinity) || 0;

  const chosen = new Set(req.matchIds);
  // Utakmice ručno dopisane u bilten, grupisane po takmičenju (nisu u data.matches)
  const manualByComp = new Map<string, typeof req.manual>();
  for (const x of req.manual ?? []) {
    if (!manualByComp.has(x.competitionId)) manualByComp.set(x.competitionId, []);
    manualByComp.get(x.competitionId)!.push(x);
  }
  const registration = competitions
    .map((c) => {
      const real: RegistrationMatch[] = data.matches
        .filter((m) => m.competitionId === c.id && chosen.has(m.id))
        .map((m) => {
          const sent = req.officials?.[m.id];
          const officials = sent && typeof sent.commissioner === "string" && typeof sent.referees === "string" ? sent : delegatedOfficials(m.officials);
          const score = req.scores?.[m.id];
          const postponed = Boolean(req.postponed?.[m.id]);
          return {
            ...m,
            status: postponed ? "postponed" : m.status,
            score: postponed ? null : score ? { home: score.home, away: score.away } : m.score,
            periods: postponed ? [] : score ? score.periods : m.periods,
            ...officials,
            remarks: typeof req.remarks?.[m.id] === "string" ? req.remarks[m.id] : defaultRemarks(m),
          };
        });
      const manual: RegistrationMatch[] = (manualByComp.get(c.id) ?? []).map((x) => ({
        id: x.id,
        number: x.number,
        round: req.round ?? 0,
        startsAt: new Date().toISOString(),
        status: x.score ? "finished" : x.postponed ? "postponed" : "scheduled",
        competitionId: x.competitionId,
        homeId: "",
        awayId: "",
        home: x.home,
        away: x.away,
        hall: null,
        fibaGameId: null,
        quarters: c.quarters,
        score: x.score ? { home: x.score.home, away: x.score.away } : null,
        periods: x.score?.periods ?? [],
        officials: [],
        report: null,
        commissioner: x.officials.commissioner,
        referees: x.officials.referees,
        remarks: x.remarks,
      }));
      return { name: c.name, items: [...real, ...manual].sort(byNumber) };
    })
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
  const input: BulletinPdfInput = {
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
  };
  return { input, name: `bilten${req.number?.trim() ? `-${slug(req.number)}` : ""}-${slug(title)}` };
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

export type SaveBulletinResult = { id: string; updatedAt: string } | { error: string };

/** Sačuva bilten (novi kad nema id-a): stanje bildera, a broj, naslov (kao u PDF-u), takmičenja i kolo i u kolone za listu */
export async function saveBulletin(id: string | null, draft: BulletinDraft, title: string): Promise<SaveBulletinResult> {
  const user = await requireRole("admin");
  if (!draft || !Array.isArray(draft.competitionIds) || draft.competitionIds.length === 0) return { error: "Izaberi bar jedno takmičenje." };
  if (JSON.stringify(draft).length > 500_000) return { error: "Bilten je prevelik za čuvanje." };
  const values = {
    number: String(draft.number ?? "").trim().slice(0, 20),
    title: String(title ?? "").trim().slice(0, 200) || "Bilten",
    competition_ids: draft.competitionIds,
    round: Number.isInteger(draft.round) ? draft.round : null,
    state: draft,
    updated_by: user.id,
    updated_at: new Date().toISOString(),
  };
  const supabase = await createClient();
  const { data, error } = id
    ? await supabase.from("bulletins").update(values).eq("id", id).select("id, updated_at").maybeSingle()
    : await supabase.from("bulletins").insert({ ...values, created_by: user.id }).select("id, updated_at").single();
  if (error) return { error: "Bilten nije sačuvan." };
  if (!data) return { error: "Bilten više ne postoji (obrisan je)." };
  return { id: data.id, updatedAt: data.updated_at };
}

/** Briše sačuvan bilten */
export async function deleteBulletin(id: string): Promise<{ error?: string }> {
  await requireRole("admin");
  const supabase = await createClient();
  const { error } = await supabase.from("bulletins").delete().eq("id", id);
  return error ? { error: "Bilten nije obrisan." } : {};
}

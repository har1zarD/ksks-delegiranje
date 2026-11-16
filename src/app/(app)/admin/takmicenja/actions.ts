"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { invalidate } from "@/lib/cache";
import { CREW_DEFAULT_COLUMNS, crewDefaultsOf, crewToRow } from "@/lib/crew";
import { createClient } from "@/lib/supabase/server";
import { addDays, sarajevoToISO } from "@/lib/format";
import { bergerSchedule, computeStandings, upToRound } from "@/lib/standings";
import { A2_JUG_FIXTURES, A2_JUG_ID } from "@/lib/a2-jug-raspored";
import { A1_ZENE_FIXTURES, A1_ZENE_ID } from "@/lib/a1-zene-raspored";
import { MINIBASKET_FIXTURES, MINIBASKET_ID } from "@/lib/minibasket-raspored";
import { KADETI_G2_FIXTURES, KADETI_G2_ID } from "@/lib/kadeti-g2-raspored";
import { JUNIORI_FIXTURES, JUNIORI_ID } from "@/lib/juniori-raspored";
import { UNOBASKET_FIXTURES, UNOBASKET_ID } from "@/lib/unobasket-raspored";

/** Takmičenja koja imaju gotov raspored saveza umjesto generatora po Bergeru */
const FEDERATION_FIXTURE_IDS = new Set([A2_JUG_ID, A1_ZENE_ID, MINIBASKET_ID, KADETI_G2_ID, JUNIORI_ID, UNOBASKET_ID]);
const FEDERATION_FIXTURES: Record<string, (typeof A2_JUG_FIXTURES)> = {
  [A2_JUG_ID]: A2_JUG_FIXTURES,
  [A1_ZENE_ID]: A1_ZENE_FIXTURES,
  [MINIBASKET_ID]: MINIBASKET_FIXTURES,
  [KADETI_G2_ID]: KADETI_G2_FIXTURES,
  [JUNIORI_ID]: JUNIORI_FIXTURES,
  [UNOBASKET_ID]: UNOBASKET_FIXTURES,
};

export type FormState = { error?: string; ok?: number };

const text = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const optNumber = (f: FormData, k: string) => {
  const v = text(f, k).replace(",", ".");
  return v === "" ? null : Number(v);
};
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^\d{2}:\d{2}$/;

export async function updateCompetition(prev: FormState, f: FormData): Promise<FormState> {
  await requireRole("admin");
  const id = text(f, "id");
  const name = text(f, "name");
  const startsOn = text(f, "starts_on");
  const feeDueOn = text(f, "fee_due_on");
  const fee = optNumber(f, "fee_km");
  const feeFirst = optNumber(f, "fee_first_km");
  const periods = Number(text(f, "periods"));
  const periodMin = Number(text(f, "period_min"));

  if (!name) return { error: "Upiši naziv." };
  if ((startsOn && !DATE.test(startsOn)) || (feeDueOn && !DATE.test(feeDueOn))) return { error: "Datum nije ispravan." };
  if ([fee, feeFirst].some((n) => n !== null && (!Number.isFinite(n) || n < 0))) return { error: "Iznos mora biti pozitivan broj." };
  if (!Number.isInteger(periods) || periods < 1 || periods > 8) return { error: "Broj perioda mora biti 1–8." };
  if (!Number.isInteger(periodMin) || periodMin < 1 || periodMin > 20) return { error: "Trajanje perioda mora biti 1–20 minuta." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("competitions")
    .update({
      name,
      short_name: text(f, "short_name") || null,
      starts_on: startsOn || null,
      format: text(f, "format") || null,
      fee_km: fee,
      fee_first_km: feeFirst,
      fee_due_on: feeDueOn || null,
      periods,
      period_min: periodMin,
    })
    .eq("id", id);
  if (error) return { error: error.code === "23505" ? "Takmičenje s tim nazivom već postoji." : "Izmjene nisu sačuvane." };

  invalidate("competitions");
  return { ok: (prev.ok ?? 0) + 1 };
}

export async function addTeam(prev: FormState, f: FormData): Promise<FormState> {
  await requireRole("admin");
  const competitionId = text(f, "competition_id");
  let clubId = text(f, "club_id");
  const name = text(f, "name");
  if (!clubId || !name) return { error: "Izaberi klub i upiši naziv ekipe." };

  const supabase = await createClient();
  // Novi klub (npr. seniorska ekipa van KSKS-a): klub dobija naziv ekipe; postojeći istog naziva se koristi ponovo
  if (clubId === "new") {
    const { data: existing } = await supabase.from("clubs").select("id").eq("short_name", name).maybeSingle();
    if (existing) clubId = existing.id;
    else {
      const { data: club, error } = await supabase.from("clubs").insert({ name: `KK ${name}`, short_name: name }).select("id").single();
      if (error) return { error: "Klub nije napravljen." };
      clubId = club.id;
    }
  }

  const { count } = await supabase
    .from("teams")
    .select("id", { count: "exact", head: true })
    .eq("competition_id", competitionId);
  const { error } = await supabase
    .from("teams")
    .insert({ competition_id: competitionId, club_id: clubId, name, sort: (count ?? 0) + 1 });
  if (error) return { error: error.code === "23505" ? "Ekipa s tim nazivom već postoji u takmičenju." : "Ekipa nije dodana." };

  invalidate("teams", "clubs");
  return { ok: (prev.ok ?? 0) + 1 };
}

export async function removeTeam(_prev: FormState, f: FormData): Promise<FormState> {
  await requireRole("admin");
  const supabase = await createClient();
  const { error } = await supabase.from("teams").delete().eq("id", text(f, "id"));
  // Utakmice drže referencu na ekipu (bez kaskadnog brisanja)
  if (error) return { error: error.code === "23503" ? "Ekipa ima utakmice — prvo obriši njene utakmice." : "Ekipa nije uklonjena." };
  // Brisanje ekipe kaskadno briše njene uplate kotizacije
  invalidate("teams", "fee_payments");
  return {};
}

type Team = { id: string; name: string; club_id: string };

/** Tabela takmičenja (s prenosom iz osnovne lige ako je faza), opcionalno samo do kola `maxRound` */
async function standingsFor(supabase: Awaited<ReturnType<typeof createClient>>, competitionId: string, maxRound?: number) {
  const [comp, teams, matches] = await Promise.all([
    supabase.from("competitions").select("id, season_id, category, gender, parent_id, carry_over_h2h, sort").eq("id", competitionId).single(),
    supabase.from("teams").select("id, name, club_id").eq("competition_id", competitionId),
    supabase.from("matches").select("home_team_id, away_team_id, home_score, away_score, status, round, kind").eq("competition_id", competitionId),
  ]);
  if (comp.error || teams.error || matches.error) return null;

  let carryOver;
  if (comp.data.parent_id && comp.data.carry_over_h2h) {
    const [pt, pm] = await Promise.all([
      supabase.from("teams").select("id, name").eq("competition_id", comp.data.parent_id),
      supabase.from("matches").select("home_team_id, away_team_id, home_score, away_score, status, round, kind").eq("competition_id", comp.data.parent_id),
    ]);
    carryOver = { parentTeams: pt.data ?? [], parentMatches: pm.data ?? [] };
  }
  const list = maxRound ? upToRound(matches.data ?? [], maxRound) : (matches.data ?? []);
  const rows = computeStandings(teams.data ?? [], list, { carryOver });
  const byId = new Map<string, Team>((teams.data ?? []).map((t) => [t.id, t]));
  return { competition: comp.data, ordered: rows.map((r) => byId.get(r.teamId)!) };
}

async function createCompetitionWithTeams(
  supabase: Awaited<ReturnType<typeof createClient>>,
  competition: {
    season_id: string;
    name: string;
    short_name: string | null;
    category: string;
    gender: string;
    parent_id: string | null;
    carry_over_h2h: boolean;
    format: string | null;
    sort: number;
  },
  teams: Team[],
): Promise<FormState | string> {
  const { data, error } = await supabase.from("competitions").insert(competition).select("id").single();
  if (error) return { error: error.code === "23505" ? "Takmičenje s tim nazivom već postoji." : "Takmičenje nije kreirano." };

  const { error: teamsError } = await supabase.from("teams").insert(
    teams.map((t, i) => ({ competition_id: data.id, club_id: t.club_id, name: t.name, sort: i + 1 })),
  );
  if (teamsError) {
    await supabase.from("competitions").delete().eq("id", data.id);
    return { error: teamsError.code === "23505" ? "Dvije ekipe imaju isti naziv." : "Ekipe nisu prenesene." };
  }
  // Pozivaoci odmah nakon toga rade redirect, pa se invalidira ovdje
  invalidate("competitions", "teams");
  return data.id;
}

/** Druga faza lige (npr. Liga 4 za prvaka = mjesta 1–4) iz trenutne tabele */
export async function createPhase(_prev: FormState, f: FormData): Promise<FormState> {
  await requireRole("admin");
  const sourceId = text(f, "source_id");
  const name = text(f, "name");
  const from = Number(text(f, "from"));
  const to = Number(text(f, "to"));
  if (!name) return { error: "Upiši naziv faze." };
  if (!Number.isInteger(from) || !Number.isInteger(to) || from < 1 || to < from) return { error: "Mjesta od–do nisu ispravna." };

  const supabase = await createClient();
  const source = await standingsFor(supabase, sourceId);
  if (!source) return { error: "Tabela nije učitana." };
  if (to > source.ordered.length) return { error: `Takmičenje ima samo ${source.ordered.length} ekipa.` };

  const carry = f.get("carry_over") === "on";
  const result = await createCompetitionWithTeams(
    supabase,
    {
      season_id: source.competition.season_id,
      name,
      short_name: text(f, "short_name") || null,
      category: source.competition.category,
      gender: source.competition.gender,
      parent_id: sourceId,
      carry_over_h2h: carry,
      format: `Mjesta ${from}–${to} iz osnovne lige${carry ? ", prenose se međusobni rezultati" : ""}.`,
      sort: source.competition.sort,
    },
    source.ordered.slice(from - 1, to),
  );
  if (typeof result !== "string") return result;
  redirect(`/admin/takmicenja/${result}`);
}

/** Sistem A: najboljih N iz svakog izvornog takmičenja nakon kola `maxRound`, bez prenosa bodova */
export async function createSystemA(_prev: FormState, f: FormData): Promise<FormState> {
  await requireRole("admin");
  const sources = f.getAll("source_ids").map(String).filter(Boolean);
  const name = text(f, "name");
  const topN = Number(text(f, "top_n"));
  const maxRound = Number(text(f, "max_round"));
  if (!name) return { error: "Upiši naziv." };
  if (sources.length === 0) return { error: "Izaberi bar jedno takmičenje." };
  if (!Number.isInteger(topN) || topN < 1) return { error: "Broj ekipa mora biti pozitivan." };
  if (!Number.isInteger(maxRound) || maxRound < 1) return { error: "Kolo mora biti pozitivan broj." };

  const supabase = await createClient();
  const picked: Team[] = [];
  let first: NonNullable<Awaited<ReturnType<typeof standingsFor>>>["competition"] | null = null;
  for (const id of sources) {
    const s = await standingsFor(supabase, id, maxRound);
    if (!s) return { error: "Tabela nije učitana." };
    first ??= s.competition;
    picked.push(...s.ordered.slice(0, topN));
  }

  const result = await createCompetitionWithTeams(
    supabase,
    {
      season_id: first!.season_id,
      name,
      short_name: text(f, "short_name") || null,
      category: first!.category,
      gender: first!.gender,
      parent_id: null,
      carry_over_h2h: false,
      format: `Sistem A: prvih ${topN} nakon ${maxRound}. kola.`,
      sort: first!.sort,
    },
    picked,
  );
  if (typeof result !== "string") return result;
  redirect(`/admin/takmicenja/${result}`);
}

/** Raspored po Bergeru: kola sedmično od datuma početka, dvorana domaćina. Samo za takmičenje bez utakmica. */
export async function generateSchedule(_prev: FormState, f: FormData): Promise<FormState> {
  await requireRole("admin");
  const competitionId = text(f, "competition_id");
  if (FEDERATION_FIXTURE_IDS.has(competitionId)) return { error: "Koristi raspored saveza na stranici takmičenja." };
  const start = text(f, "start_date");
  const time = text(f, "time") || "18:00";
  const double = f.get("double") === "on";
  if (!DATE.test(start) || !TIME.test(time)) return { error: "Upiši datum i vrijeme prvog kola." };

  const supabase = await createClient();
  const [{ count }, { data: competition }, teams] = await Promise.all([
    supabase.from("matches").select("id", { count: "exact", head: true }).eq("competition_id", competitionId),
    supabase.from("competitions").select(CREW_DEFAULT_COLUMNS).eq("id", competitionId).single(),
    supabase
      .from("teams")
      .select("id, club:clubs!teams_club_id_fkey ( hall_id )")
      .eq("competition_id", competitionId)
      .order("sort")
      .order("name"),
  ]);
  if (count) return { error: "Takmičenje već ima utakmice. Raspored se pravi samo za prazno takmičenje." };
  if (teams.error || (teams.data?.length ?? 0) < 2) return { error: "Potrebne su bar dvije ekipe." };

  const rounds = bergerSchedule(teams.data!, double);
  const rows = rounds.flatMap((pairs, r) =>
    pairs.map(([home, away]) => ({
      competition_id: competitionId,
      round: r + 1,
      home_team_id: home.id,
      away_team_id: away.id,
      hall_id: home.club?.hall_id ?? null,
      starts_at: sarajevoToISO(addDays(start, r * 7), time),
      // Sastav ekipe po pravilima takmičenja (Naknade)
      ...(competition ? crewToRow(crewDefaultsOf(competition)) : {}),
    })),
  );
  const { error } = await supabase.from("matches").insert(rows);
  if (error) return { error: "Raspored nije sačuvan." };

  invalidate("matches");
  return {};
}

/** Jedna utakmica iz rasporeda saveza: termin, dvorana i broj upisuje admin */
export async function createFixtureMatch(prev: FormState, f: FormData): Promise<FormState> {
  await requireRole("admin");
  const competitionId = text(f, "competition_id");
  const fixtures = FEDERATION_FIXTURES[competitionId];
  if (!fixtures) return { error: "Takmičenje nema ovaj raspored." };
  const round = Number(text(f, "round"));
  const homeId = text(f, "home_team_id");
  const awayId = text(f, "away_team_id");
  const date = text(f, "date");
  const time = text(f, "time");
  const number = text(f, "number");
  if (!DATE.test(date) || !TIME.test(time)) return { error: "Upiši datum i vrijeme." };
  if (number && (!Number.isInteger(Number(number)) || Number(number) < 1)) return { error: "Broj utakmice mora biti pozitivan broj." };

  const supabase = await createClient();
  const [{ data: competition }, { data: teams }, { count }] = await Promise.all([
    supabase.from("competitions").select(CREW_DEFAULT_COLUMNS).eq("id", competitionId).single(),
    supabase.from("teams").select("id, name").eq("competition_id", competitionId).in("id", [homeId, awayId]),
    supabase.from("matches").select("id", { count: "exact", head: true }).eq("competition_id", competitionId).eq("home_team_id", homeId).eq("away_team_id", awayId),
  ]);
  const name = (id: string) => teams?.find((t) => t.id === id)?.name;
  if (!fixtures.some((x) => x.round === round && x.home === name(homeId) && x.away === name(awayId))) return { error: "Utakmica nije u rasporedu." };
  if (count) return { error: "Ova utakmica je već napravljena." };

  const { error } = await supabase.from("matches").insert({
    competition_id: competitionId,
    round,
    home_team_id: homeId,
    away_team_id: awayId,
    hall_id: text(f, "hall_id") || null,
    starts_at: sarajevoToISO(date, time),
    ...(number ? { number: Number(number) } : {}),
    // Sastav ekipe po pravilima takmičenja (Naknade)
    ...(competition ? crewToRow(crewDefaultsOf(competition)) : {}),
  });
  if (error?.code === "23505") return { error: `Utakmica ${number} već postoji. Upiši drugi broj ili ostavi prazno.` };
  if (error) return { error: "Utakmica nije napravljena. Pokušaj ponovo." };

  invalidate("matches");
  return { ok: (prev.ok ?? 0) + 1 };
}

/** Nova dvorana kad upisani naziv ne postoji u izboru (izbor dvorane u formi utakmice) */
export async function createHall(name: string): Promise<{ value: string; label: string } | { error: string }> {
  await requireRole("admin");
  const trimmed = name.trim();
  if (!trimmed) return { error: "Upiši naziv dvorane." };

  const supabase = await createClient();
  const { data, error } = await supabase.from("halls").insert({ name: trimmed }).select("id, name").single();
  if (error?.code === "23505") return { error: "Dvorana s tim nazivom već postoji." };
  if (error || !data) return { error: "Dvorana nije napravljena. Pokušaj ponovo." };

  invalidate("halls");
  return { value: data.id, label: data.name };
}

/** Brisanje praznog takmičenja (bez ekipa i utakmica), npr. greškom napravljena liga */
export async function deleteCompetition(_prev: FormState, f: FormData): Promise<FormState> {
  await requireRole("admin");
  const id = text(f, "id");
  const supabase = await createClient();
  const [{ count: teams }, { count: matches }] = await Promise.all([
    supabase.from("teams").select("id", { count: "exact", head: true }).eq("competition_id", id),
    supabase.from("matches").select("id", { count: "exact", head: true }).eq("competition_id", id),
  ]);
  if (teams || matches) return { error: "Takmičenje ima ekipe ili utakmice. Prvo ih ukloni." };

  const { error } = await supabase.from("competitions").delete().eq("id", id);
  if (error) return { error: "Takmičenje nije obrisano." };
  invalidate("competitions");
  // Lista takmičenja je možda već učitana u browseru: osvježi je prije povratka na nju
  refresh();
  redirect("/admin/takmicenja");
}

// FIBA statistika: ID igrača, prosjeci, tabela po kategoriji (grupe, forma, domaćin/gost). Čista logika, bez baze.
import { createHash } from "node:crypto";
import { isoToSarajevo } from "@/lib/format";
import { computeStandings, type StandingRow } from "@/lib/standings";

// ───────── Igrač ─────────

/** Kao public.fiba_key u bazi: mala slova, bez naših dijakritika, jedan razmak */
export function fibaKey(t: string | null | undefined) {
  return (t ?? "")
    .replace(/[ČĆŽŠĐčćžšđ]/g, (c) => "CCZSDcczsd"["ČĆŽŠĐčćžšđ".indexOf(c)])
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Kao public.fiba_club_key: klub iz aliasa, inače naziv ekipe bez oznake uzrasta (U16, WU14…) */
export function fibaClubKey(team: string, aliases: Record<string, string>) {
  const key = fibaKey(team);
  return aliases[key] ?? key.replace(/\s+w?u\d{1,2}$/, "");
}

/** Kao public.fiba_player_id: ID igrača u URL-u (klub + ime i prezime) */
export function fibaPlayerId(team: string, firstName: string | null, familyName: string | null, aliases: Record<string, string>) {
  const name = fibaKey(`${firstName ?? ""} ${familyName ?? ""}`);
  return createHash("md5").update(`${fibaClubKey(team, aliases)}|${name}`).digest("hex").slice(0, 12);
}

// ───────── Sezona ─────────

/** Sezona utakmice "2025/26" (1. 7. – 30. 6.; kao public.fiba_season) */
export function seasonOf(iso: string | null | undefined) {
  if (!iso) return null;
  const [y, m] = isoToSarajevo(iso).date.split("-").map(Number);
  const start = m < 7 ? y - 1 : y;
  return `${start}/${String((start + 1) % 100).padStart(2, "0")}`;
}

/** Sezone utakmica, najnovija prva */
export function seasonsOf(games: { starts_at: string | null }[]) {
  return [...new Set(games.map((g) => seasonOf(g.starts_at)).filter((s) => s !== null))].sort().reverse();
}

// ───────── Brojevi ─────────

export type StatTotals = {
  games: number;
  seconds: number;
  pts: number;
  fgm: number;
  fga: number;
  tpm: number;
  tpa: number;
  ftm: number;
  fta: number;
  oreb: number;
  dreb: number;
  reb: number;
  ast: number;
  stl: number;
  blk: number;
  tov: number;
  pf: number;
  eff: number;
};

const one = new Intl.NumberFormat("bs-BA", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** Prosjek po utakmici "12,3" */
export function avg(total: number, games: number) {
  return games > 0 ? total / games : 0;
}

export function fmt1(n: number) {
  return one.format(n);
}

/** Procenat šuta "45,5" (bez pokušaja: "–") */
export function pctText(made: number, attempted: number) {
  return attempted > 0 ? one.format((made / attempted) * 100) : "–";
}

export function pctValue(made: number, attempted: number) {
  return attempted > 0 ? made / attempted : 0;
}

/** Sekunde → "23:05" */
export function minutesText(seconds: number) {
  const m = Math.floor(seconds / 60);
  return `${m}:${String(Math.round(seconds % 60)).padStart(2, "0")}`;
}

/** Prosječne minute po utakmici "23,4" */
export function avgMinutes(seconds: number, games: number) {
  return fmt1(avg(seconds, games) / 60);
}

export function plusMinusText(n: number) {
  return n > 0 ? `+${n}` : String(n);
}

// ───────── Tabela ─────────

export type TableGame = {
  id: number;
  home_name: string;
  away_name: string;
  home_score: number | null;
  away_score: number | null;
  starts_at: string | null;
  finished: boolean;
};

export type FibaStandingRow = StandingRow & {
  /** Zadnjih 5 (najnovija zadnja): true = pobjeda */
  form: boolean[];
  /** "P3" / "I2": niz pobjeda ili poraza */
  streak: string | null;
  home: { won: number; lost: number };
  away: { won: number; lost: number };
};

/** Naziv ekipe bez tipa kluba (KK/OKK…) i FIBA oznake uzrasta (U14, WU16…), za poređenje naše i FIBA ekipe */
function youthTeamKey(name: string) {
  return fibaKey(name)
    .replace(/^(kk|okk|ukk|kzk|zkk|kos)\s+/, "")
    .replace(/\s+w?u\d{1,2}$/, "")
    .replace(/\s*-\s*/g, " ") // "KK Bosna - Spars" = "BOSNA SPARS U18"
    .trim();
}

/**
 * Naše ekipe (iz baze, po pravoj grupi takmičenja) → naziv kako stoji na FIBA LiveStats, da se mogu spojiti s
 * FIBA ekipom u `fibaStandings`. Samo tačno poklapanje normalizovanog naziva (prefiks bi lako pogodio pogrešnu
 * ekipu, npr. "Koš" i "Koš B"); bez poklapanja ostaje naš naziv (ekipa još nema nijednu FIBA utakmicu, tabela je
 * ipak ispravno grupisana — samo prikazuje 0 utakmica dok se prva ne odigra na FIBA LiveStats).
 */
export function matchFibaTeamNames(ourGroups: string[][], fibaNames: Iterable<string>): string[][] {
  const byKey = new Map<string, string[]>();
  for (const n of new Set(fibaNames)) {
    const k = youthTeamKey(n);
    byKey.set(k, [...(byKey.get(k) ?? []), n]);
  }
  return ourGroups.map((group) =>
    // flatMap: ista ekipa ponekad ima više pravopisa kroz utakmice ("Realway" / "REALWAY U14") — sve moraju
    // ući u istu grupu (fibaStandings ih dalje spaja), inače ostane rascjepkano kao i prije
    group.flatMap((ourName) => byKey.get(youthTeamKey(ourName)) ?? [ourName]),
  );
}

/**
 * Tabela kategorije po FIBA pravilima. Ekipe koje se nikad ne sastaju (različite grupe iste kategorije) su
 * odvojene tabele: grupa = povezane ekipe preko odigranih i zakazanih utakmica, uz `groupHints` (prave grupe iz
 * naše baze, vidi `matchFibaTeamNames`) za omladinsku ligu — FIBA feed tu zna samo trenutni krug, ne cijeli
 * raspored, pa se ekipe koje još nisu igrale jedna s drugom inače pogrešno razdvoje u male lažne grupe.
 */
export function fibaStandings(games: TableGame[], groupHints: string[][] = []): FibaStandingRow[][] {
  const parent = new Map<string, string>();
  const find = (x: string): string => {
    const p = parent.get(x) ?? x;
    if (p === x) return x;
    const root = find(p);
    parent.set(x, root);
    return root;
  };
  const union = (a: string, b: string) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  };
  for (const g of games) {
    for (const t of [g.home_name, g.away_name]) if (!parent.has(t)) parent.set(t, t);
    union(g.home_name, g.away_name);
  }
  for (const hint of groupHints) {
    for (const t of hint) if (!parent.has(t)) parent.set(t, t);
    for (let i = 1; i < hint.length; i++) union(hint[0], hint[i]);
  }
  const groups = new Map<string, string[]>();
  for (const t of parent.keys()) groups.set(find(t), [...(groups.get(find(t)) ?? []), t]);

  const finished = games
    .filter((g) => g.finished && g.home_score != null && g.away_score != null && g.home_score !== g.away_score)
    .sort((a, b) => Date.parse(a.starts_at ?? "") - Date.parse(b.starts_at ?? ""));

  return [...groups.values()]
    .map((teams) => {
      const set = new Set(teams);
      const own = finished.filter((g) => set.has(g.home_name));
      const rows = computeStandings(
        teams.map((t) => ({ id: t, name: t })),
        own.map((g) => ({ home_team_id: g.home_name, away_team_id: g.away_name, home_score: g.home_score, away_score: g.away_score, status: "finished" })),
      );
      return rows.map<FibaStandingRow>((r) => {
        const results = own
          .filter((g) => g.home_name === r.teamId || g.away_name === r.teamId)
          .map((g) => ({ home: g.home_name === r.teamId, won: g.home_name === r.teamId ? g.home_score! > g.away_score! : g.away_score! > g.home_score! }));
        let run = 0;
        for (let i = results.length - 1; i >= 0 && results[i].won === results[results.length - 1].won; i--) run++;
        const last = results[results.length - 1];
        return {
          ...r,
          form: results.slice(-5).map((x) => x.won),
          streak: last ? `${last.won ? "P" : "I"}${run}` : null,
          home: { won: results.filter((x) => x.home && x.won).length, lost: results.filter((x) => x.home && !x.won).length },
          away: { won: results.filter((x) => !x.home && x.won).length, lost: results.filter((x) => !x.home && !x.won).length },
        };
      });
    })
    .filter((rows) => rows.length > 1)
    .sort((a, b) => b.length - a.length);
}

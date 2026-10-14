// Tabela po FIBA pravilima (Official Basketball Rules, Dodatak D). Čista logika, bez Next/Supabase zavisnosti.

export type StandingTeam = { id: string; name: string };

export type StandingMatch = {
  home_team_id: string;
  away_team_id: string;
  home_score: number | null;
  away_score: number | null;
  status: string;
  round?: number | null;
  /** Samo liga ulazi u tabelu (prijateljska, turnir, ostalo ne); bez polja = liga */
  kind?: string;
};

export type StandingRow = {
  teamId: string;
  name: string;
  played: number;
  won: number;
  lost: number;
  pointsFor: number;
  pointsAgainst: number;
  diff: number;
  /** Klasifikacijski bodovi: pobjeda 2, poraz 1 */
  points: number;
};

export type CarryOver = {
  /** Ekipe osnovne lige (iz koje je faza nastala) */
  parentTeams: StandingTeam[];
  /** Utakmice osnovne lige */
  parentMatches: StandingMatch[];
};

type Played = { home: string; away: string; hs: number; as: number };

function counted(matches: StandingMatch[]): Played[] {
  return matches
    .filter((m) => (m.kind ?? "league") === "league" && m.status === "finished" && m.home_score != null && m.away_score != null)
    .map((m) => ({ home: m.home_team_id, away: m.away_team_id, hs: m.home_score!, as: m.away_score! }));
}

function table(ids: Iterable<string>, games: Played[]) {
  const rows = new Map<string, { played: number; won: number; lost: number; pf: number; pa: number; pts: number }>();
  for (const id of ids) rows.set(id, { played: 0, won: 0, lost: 0, pf: 0, pa: 0, pts: 0 });
  for (const g of games) {
    const h = rows.get(g.home);
    const a = rows.get(g.away);
    if (!h || !a) continue;
    h.played++;
    a.played++;
    h.pf += g.hs;
    h.pa += g.as;
    a.pf += g.as;
    a.pa += g.hs;
    if (g.hs > g.as) {
      h.won++;
      h.pts += 2;
      a.lost++;
      a.pts += 1;
    } else if (g.as > g.hs) {
      a.won++;
      a.pts += 2;
      h.lost++;
      h.pts += 1;
    }
  }
  return rows;
}

/**
 * Utakmice osnovne lige između ekipa koje su obje u fazi, prevedene na ID-eve ekipa faze.
 * Ekipe faze su kopije ekipa osnovne lige pa se povezuju po nazivu (jedinstven u takmičenju).
 */
export function carriedOverMatches(phaseTeams: StandingTeam[], carry: CarryOver): StandingMatch[] {
  const byName = new Map(phaseTeams.map((t) => [t.name, t.id]));
  const toPhase = new Map<string, string>();
  for (const t of carry.parentTeams) {
    const id = byName.get(t.name);
    if (id) toPhase.set(t.id, id);
  }
  return carry.parentMatches
    .filter((m) => toPhase.has(m.home_team_id) && toPhase.has(m.away_team_id))
    .map((m) => ({ ...m, home_team_id: toPhase.get(m.home_team_id)!, away_team_id: toPhase.get(m.away_team_id)! }));
}

/** Samo utakmice do zaključno kola `maxRound` (npr. Sistem A uzima tabelu nakon prvog kruga) */
export function upToRound<M extends StandingMatch>(matches: M[], maxRound: number): M[] {
  return matches.filter((m) => m.round != null && m.round <= maxRound);
}

export function computeStandings(
  teams: StandingTeam[],
  matches: StandingMatch[],
  opts: { carryOver?: CarryOver } = {},
): StandingRow[] {
  const all = opts.carryOver ? [...matches, ...carriedOverMatches(teams, opts.carryOver)] : matches;
  const games = counted(all);
  const overall = table(
    teams.map((t) => t.id),
    games,
  );
  const name = new Map(teams.map((t) => [t.id, t.name]));

  // D.1.3: među izjednačenim ekipama mini-tabela (bodovi, koš razlika, postignuti koševi)
  // samo iz njihovih međusobnih utakmica; ako se grupa razdvoji, ponavlja se za preostale izjednačene.
  // Kad mini-tabela ne razdvaja: ukupna koš razlika, ukupno postignuti koševi, naziv.
  function resolve(group: string[]): string[] {
    if (group.length < 2) return group;
    const set = new Set(group);
    const mini = table(
      group,
      games.filter((g) => set.has(g.home) && set.has(g.away)),
    );
    const key = (id: string) => {
      const r = mini.get(id)!;
      return [r.pts, r.pf - r.pa, r.pf];
    };
    const sorted = [...group].sort((a, b) => compareKeys(key(b), key(a)));
    const parts = partition(sorted, (a, b) => compareKeys(key(a), key(b)) === 0);
    if (parts.length > 1) return parts.flatMap(resolve);

    const o = (id: string) => {
      const r = overall.get(id)!;
      return [r.pf - r.pa, r.pf];
    };
    return [...group].sort(
      (a, b) => compareKeys(o(b), o(a)) || name.get(a)!.localeCompare(name.get(b)!, "bs"),
    );
  }

  const byPoints = [...overall.keys()].sort((a, b) => overall.get(b)!.pts - overall.get(a)!.pts);
  const order = partition(byPoints, (a, b) => overall.get(a)!.pts === overall.get(b)!.pts).flatMap(resolve);

  return order.map((id) => {
    const r = overall.get(id)!;
    return {
      teamId: id,
      name: name.get(id)!,
      played: r.played,
      won: r.won,
      lost: r.lost,
      pointsFor: r.pf,
      pointsAgainst: r.pa,
      diff: r.pf - r.pa,
      points: r.pts,
    };
  });
}

function compareKeys(a: number[], b: number[]) {
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] - b[i];
  return 0;
}

/** Uzastopni elementi koji su "jednaki" idu u istu grupu (niz mora biti sortiran) */
function partition<T>(items: T[], same: (a: T, b: T) => boolean): T[][] {
  const out: T[][] = [];
  for (const item of items) {
    const last = out[out.length - 1];
    if (last && same(last[0], item)) last.push(item);
    else out.push([item]);
  }
  return out;
}

/**
 * Raspored "svako sa svakim" po Bergerovim tablicama.
 * Vraća kola s parovima [domaćin, gost]; neparan broj ekipa → jedna ekipa slobodna u kolu.
 * Dvokružno: drugi krug je prvi s zamijenjenim domaćinom.
 */
export function bergerSchedule<T>(teams: T[], double = false): [T, T][][] {
  const list: (T | null)[] = [...teams];
  if (list.length % 2 === 1) list.push(null);
  const n = list.length;
  const rounds: [T, T][][] = [];
  if (n < 2) return rounds;

  // Fiksna zadnja ekipa, ostale rotiraju
  let rot = list.slice(0, n - 1);
  const fixed = list[n - 1];
  for (let r = 0; r < n - 1; r++) {
    const pairs: [T, T][] = [];
    const first: [T | null, T | null] = r % 2 === 0 ? [rot[0], fixed] : [fixed, rot[0]];
    if (first[0] !== null && first[1] !== null) pairs.push([first[0], first[1]]);
    for (let i = 1; i < n / 2; i++) {
      const a = rot[i];
      const b = rot[n - 1 - i];
      if (a !== null && b !== null) pairs.push(i % 2 === 1 ? [b, a] : [a, b]);
    }
    rounds.push(pairs);
    rot = [rot[rot.length - 1], ...rot.slice(0, -1)];
  }
  if (double) rounds.push(...rounds.map((pairs) => pairs.map(([h, a]) => [a, h] as [T, T])));
  return rounds;
}

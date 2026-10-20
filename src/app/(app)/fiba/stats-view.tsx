import Link from "next/link";
import { ArrowDown, ChevronRight, Search } from "lucide-react";
import type { FibaSeasonRow, FibaTeamGame } from "@/lib/data/fiba";
import { avg, avgMinutes, fmt1, minutesText, pctText, pctValue, plusMinusText } from "@/lib/fiba-stats";
import { properName } from "@/lib/fiba";
import { FilterForm, FilterLink, FilterSegment } from "@/components/filter-nav";
import { ClubLogo } from "@/components/team-name";
import { buttonClass, cx, Empty, inputClass, SectionTitle, Segments } from "@/components/ui";
import { Pager, PlayerLink, STICKY, TABLE_WRAP, TD, TH, TeamLink, teamHref } from "./ui";

// Statistika kategorije: lideri, ekipe i svi igrači (prosjeci iz box scorea završenih utakmica)

export type SeasonPlayer = {
  id: string;
  name: string;
  number: string | null;
  team: string;
  logo: string | null;
  games: number;
  starts: number;
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
  fd: number;
  plusMinus: number;
  eff: number;
  best: number;
};

export function seasonPlayer(r: FibaSeasonRow & { logo: string | null }): SeasonPlayer {
  return {
    id: r.player_id!,
    name: properName([r.first_name, r.family_name].filter(Boolean).join(" ")),
    number: r.number,
    team: r.team_name ?? "",
    logo: r.logo,
    games: r.games ?? 0,
    starts: r.starts ?? 0,
    seconds: r.seconds ?? 0,
    pts: r.pts ?? 0,
    fgm: r.fgm ?? 0,
    fga: r.fga ?? 0,
    tpm: r.tpm ?? 0,
    tpa: r.tpa ?? 0,
    ftm: r.ftm ?? 0,
    fta: r.fta ?? 0,
    oreb: r.oreb ?? 0,
    dreb: r.dreb ?? 0,
    reb: r.reb ?? 0,
    ast: r.ast ?? 0,
    stl: r.stl ?? 0,
    blk: r.blk ?? 0,
    tov: r.tov ?? 0,
    pf: r.pf ?? 0,
    fd: r.fd ?? 0,
    plusMinus: r.plus_minus ?? 0,
    eff: r.eff ?? 0,
    best: r.best_pts ?? 0,
  };
}

// ───────── Lideri ─────────

type Leader = {
  key: string;
  label: string;
  value: (p: SeasonPlayer) => number;
  text: (p: SeasonPlayer) => string;
  sub?: (p: SeasonPlayer) => string;
  /** Uslov za procente (dovoljno pokušaja) */
  qualifies?: (p: SeasonPlayer) => boolean;
};

const perGame = (key: keyof SeasonPlayer, label: string): Leader => ({
  key,
  label,
  value: (p) => avg(p[key] as number, p.games),
  text: (p) => fmt1(avg(p[key] as number, p.games)),
});

const LEADERS: Leader[] = [
  perGame("pts", "Poeni"),
  perGame("reb", "Skokovi"),
  perGame("ast", "Asistencije"),
  perGame("eff", "Indeks korisnosti"),
  perGame("stl", "Ukradene lopte"),
  perGame("blk", "Blokade"),
  { ...perGame("tpm", "Pogođene trice"), sub: (p) => `${p.tpm}/${p.tpa}` },
  {
    key: "tp_pct",
    label: "Šut za tri (%)",
    value: (p) => pctValue(p.tpm, p.tpa),
    text: (p) => pctText(p.tpm, p.tpa),
    sub: (p) => `${p.tpm}/${p.tpa}`,
    qualifies: (p) => p.tpa >= Math.max(5, p.games * 1.5),
  },
  {
    key: "ft_pct",
    label: "Slobodna bacanja (%)",
    value: (p) => pctValue(p.ftm, p.fta),
    text: (p) => pctText(p.ftm, p.fta),
    sub: (p) => `${p.ftm}/${p.fta}`,
    qualifies: (p) => p.fta >= Math.max(5, p.games * 1.5),
  },
];

/** Igrač ulazi u lidere ako je odigrao bar pola utakmica najaktivnijeg igrača kategorije */
export function qualified(players: SeasonPlayer[]) {
  const most = Math.max(0, ...players.map((p) => p.games));
  const min = Math.max(1, Math.ceil(most / 2));
  return players.filter((p) => p.games >= min);
}

export function Leaders({ players, category, allHref }: { players: SeasonPlayer[]; category: string; allHref: string }) {
  const pool = qualified(players);
  return (
    <section>
      <SectionTitle action={<Link href={allHref} className="inline-flex items-center gap-1 text-[14px] font-semibold text-fg-muted hover:text-fg">Svi igrači <ChevronRight className="size-4" aria-hidden /></Link>}>
        Lideri
      </SectionTitle>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {LEADERS.map((l) => {
          const top = pool
            .filter((p) => l.qualifies?.(p) ?? true)
            .sort((a, b) => l.value(b) - l.value(a) || b.games - a.games)
            .slice(0, 5);
          if (top.length === 0) return null;
          const [first, ...rest] = top;
          return (
            <article key={l.key} className="overflow-hidden rounded-lg border border-line bg-panel shadow-panel">
              <h3 className="border-b border-line px-4 py-2.5 text-[13px] font-semibold text-fg-muted">{l.label} <span className="font-normal text-fg-faint">{l.qualifies || l.key === "tpm" ? "" : "po utakmici"}</span></h3>
              <div className="flex items-center gap-3 px-4 py-3.5">
                <ClubLogo src={first.logo} />
                <div className="min-w-0 flex-1">
                  <PlayerLink id={first.id} name={first.name} className="block truncate text-[16px] font-semibold" />
                  <Link href={teamHref(category, first.team)} className="block truncate text-[13px] text-fg-muted hover:underline">{first.team}</Link>
                </div>
                <div className="text-right">
                  <div className="scoreboard text-[30px] font-semibold leading-none tracking-[-0.03em]">{l.text(first)}</div>
                  {l.sub && <div className="scoreboard mt-1 text-[12px] text-fg-faint">{l.sub(first)}</div>}
                </div>
              </div>
              <ol className="divide-y divide-line border-t border-line">
                {rest.map((p, i) => (
                  <li key={p.id} className="flex items-center gap-2.5 px-4 py-2 text-[14px]">
                    <span className="scoreboard w-4 shrink-0 text-right text-[12px] font-semibold text-fg-faint">{i + 2}</span>
                    <span className="min-w-0 flex-1 truncate">
                      <PlayerLink id={p.id} name={p.name} className="font-medium" />
                      <span className="text-fg-faint">, {p.team}</span>
                    </span>
                    <span className="scoreboard shrink-0 font-semibold">{l.text(p)}</span>
                  </li>
                ))}
              </ol>
            </article>
          );
        })}
      </div>
      <p className="mt-3 text-[12px] text-fg-faint">Igrači s bar pola odigranih utakmica; procenti uz najmanje 5 pokušaja i 1,5 po utakmici.</p>
    </section>
  );
}

// ───────── Ekipe ─────────

type TeamAvg = { name: string; logo: string | null; games: number; won: number; pts: number; opp: number } & Record<
  "fgm" | "fga" | "tpm" | "tpa" | "ftm" | "fta" | "reb" | "oreb" | "ast" | "stl" | "blk" | "tov" | "eff" | "paint" | "fastBreak" | "bench",
  number
>;

/** Prosjeci ekipa kategorije iz statistike ekipa po utakmici */
export function teamAverages(lines: FibaTeamGame[], byGame: Map<number, FibaTeamGame[]>, logos: Record<string, string | null>) {
  const teams = new Map<string, TeamAvg>();
  for (const t of lines) {
    const opp = byGame.get(t.game_id)?.find((o) => o.side !== t.side);
    const a = teams.get(t.team_name) ?? {
      name: t.team_name, logo: logos[t.team_name] ?? null, games: 0, won: 0, pts: 0, opp: 0,
      fgm: 0, fga: 0, tpm: 0, tpa: 0, ftm: 0, fta: 0, reb: 0, oreb: 0, ast: 0, stl: 0, blk: 0, tov: 0, eff: 0, paint: 0, fastBreak: 0, bench: 0,
    };
    a.games++;
    a.won += opp && t.score > opp.score ? 1 : 0;
    a.pts += t.score;
    a.opp += opp?.score ?? 0;
    for (const k of ["fgm", "fga", "tpm", "tpa", "ftm", "fta", "reb", "oreb", "ast", "stl", "blk", "tov", "eff"] as const) a[k] += t[k];
    a.paint += t.paint ?? 0;
    a.fastBreak += t.fast_break ?? 0;
    a.bench += t.bench ?? 0;
    teams.set(t.team_name, a);
  }
  return [...teams.values()].sort((a, b) => avg(b.pts, b.games) - avg(a.pts, a.games));
}

export function TeamStatsTable({ teams, category, season }: { teams: TeamAvg[]; category: string; season?: string | null }) {
  if (teams.length === 0) return null;
  const cols: { label: string; title: string; value: (t: TeamAvg) => string }[] = [
    { label: "PTS", title: "Poeni po utakmici", value: (t) => fmt1(avg(t.pts, t.games)) },
    { label: "PRIM", title: "Primljeni poeni po utakmici", value: (t) => fmt1(avg(t.opp, t.games)) },
    { label: "+/−", title: "Razlika po utakmici", value: (t) => { const d = avg(t.pts - t.opp, t.games); return `${d > 0 ? "+" : ""}${fmt1(d)}`; } },
    { label: "Š%", title: "Šut iz igre", value: (t) => pctText(t.fgm, t.fga) },
    { label: "3P%", title: "Šut za tri", value: (t) => pctText(t.tpm, t.tpa) },
    { label: "SB%", title: "Slobodna bacanja", value: (t) => pctText(t.ftm, t.fta) },
    { label: "SK", title: "Skokovi po utakmici", value: (t) => fmt1(avg(t.reb, t.games)) },
    { label: "SKN", title: "Skokovi u napadu po utakmici", value: (t) => fmt1(avg(t.oreb, t.games)) },
    { label: "AS", title: "Asistencije po utakmici", value: (t) => fmt1(avg(t.ast, t.games)) },
    { label: "UL", title: "Ukradene lopte po utakmici", value: (t) => fmt1(avg(t.stl, t.games)) },
    { label: "BL", title: "Blokade po utakmici", value: (t) => fmt1(avg(t.blk, t.games)) },
    { label: "IL", title: "Izgubljene lopte po utakmici", value: (t) => fmt1(avg(t.tov, t.games)) },
    { label: "REK", title: "Poeni iz reketa po utakmici", value: (t) => fmt1(avg(t.paint, t.games)) },
    { label: "KON", title: "Poeni iz kontre po utakmici", value: (t) => fmt1(avg(t.fastBreak, t.games)) },
    { label: "KLU", title: "Poeni s klupe po utakmici", value: (t) => fmt1(avg(t.bench, t.games)) },
    { label: "IND", title: "Indeks korisnosti po utakmici", value: (t) => fmt1(avg(t.eff, t.games)) },
  ];
  return (
    <section>
      <SectionTitle count={teams.length}>Ekipe</SectionTitle>
      <div className={TABLE_WRAP}>
        <table className="w-full min-w-[980px] border-collapse">
          <thead className="border-b border-line bg-panel-2">
            <tr>
              <th className={cx(TH, STICKY, "bg-panel-2 pl-4 text-left sm:pl-5")}>Ekipa</th>
              <th className={TH} title="Utakmice">U</th>
              <th className={TH} title="Pobjede–porazi">P–I</th>
              {cols.map((c, i) => (
                <th key={c.label} className={cx(TH, i === cols.length - 1 && "pr-4 sm:pr-5")} title={c.title}>{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {teams.map((t) => (
              <tr key={t.name} className="group hover:bg-panel-2">
                <td className={cx(STICKY, "max-w-[52vw] py-2 pl-4 pr-2 group-hover:bg-panel-2 sm:max-w-none sm:pl-5")}>
                  <TeamLink category={category} season={season} name={t.name} logo={t.logo} className="text-[14px] font-semibold" />
                </td>
                <td className={cx(TD, "text-fg-muted")}>{t.games}</td>
                <td className={cx(TD, "text-fg-muted")}>{t.won}–{t.games - t.won}</td>
                {cols.map((c, i) => (
                  <td key={c.label} className={cx(TD, i === 0 && "font-semibold", i === cols.length - 1 && "pr-4 sm:pr-5")}>{c.value(t)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// ───────── Svi igrači ─────────

const PAGE_PLAYERS = 25;

type Col = { key: string; label: string; title: string; total: (p: SeasonPlayer) => number | string; average?: (p: SeasonPlayer) => number | string; sort: (p: SeasonPlayer) => number };

const sum = (key: keyof SeasonPlayer, label: string, title: string): Col => ({
  key,
  label,
  title,
  total: (p) => p[key] as number,
  average: (p) => fmt1(avg(p[key] as number, p.games)),
  sort: (p) => p[key] as number,
});

const PLAYER_COLS: Col[] = [
  { key: "games", label: "U", title: "Utakmice (u startu)", total: (p) => p.games, sort: (p) => p.games },
  { key: "min", label: "MIN", title: "Minute", total: (p) => minutesText(p.seconds), average: (p) => avgMinutes(p.seconds, p.games), sort: (p) => p.seconds },
  sum("pts", "PTS", "Poeni"),
  sum("reb", "SK", "Skokovi"),
  sum("oreb", "SKN", "Skokovi u napadu"),
  sum("ast", "AS", "Asistencije"),
  sum("stl", "UL", "Ukradene lopte"),
  sum("blk", "BL", "Blokade"),
  sum("tov", "IL", "Izgubljene lopte"),
  sum("pf", "LG", "Lične greške"),
  sum("fd", "IG", "Iznuđene greške"),
  { key: "fg", label: "Š%", title: "Šut iz igre (pogođeno/pokušano)", total: (p) => pctText(p.fgm, p.fga), sort: (p) => pctValue(p.fgm, p.fga) },
  { key: "tp", label: "3P", title: "Trice pogođeno/pokušano", total: (p) => `${p.tpm}/${p.tpa}`, average: (p) => `${fmt1(avg(p.tpm, p.games))}/${fmt1(avg(p.tpa, p.games))}`, sort: (p) => p.tpm },
  { key: "tp_pct", label: "3P%", title: "Šut za tri", total: (p) => pctText(p.tpm, p.tpa), sort: (p) => pctValue(p.tpm, p.tpa) },
  { key: "ft_pct", label: "SB%", title: "Slobodna bacanja", total: (p) => pctText(p.ftm, p.fta), sort: (p) => pctValue(p.ftm, p.fta) },
  { key: "pm", label: "+/−", title: "Plus/minus", total: (p) => plusMinusText(p.plusMinus), average: (p) => { const v = avg(p.plusMinus, p.games); return `${v > 0 ? "+" : ""}${fmt1(v)}`; }, sort: (p) => p.plusMinus },
  sum("eff", "IND", "Indeks korisnosti"),
];

/** Sort po prosjeku (zbir = ukupno), kao lista igrača na EuroLeague */
export function PlayersTable({ players, category, sp, href }: {
  players: SeasonPlayer[];
  category: string;
  sp: Record<string, string | string[] | undefined>;
  href: (p: Record<string, string | number | undefined>) => string;
}) {
  const totals = sp.zbir === "1";
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const sortCol = PLAYER_COLS.find((c) => c.key === sp.sort) ?? PLAYER_COLS[2];
  const needle = q.toLocaleLowerCase("bs");
  const filtered = needle ? players.filter((p) => `${p.name} ${p.team}`.toLocaleLowerCase("bs").includes(needle)) : players;
  // Prosjeci: procenti i prosjek su uporedivi; ukupno: zbir
  const value = (p: SeasonPlayer) => (totals || !sortCol.average || ["fg", "tp_pct", "ft_pct", "games"].includes(sortCol.key) ? sortCol.sort(p) : avg(sortCol.sort(p), p.games));
  const sorted = [...filtered].sort((a, b) => value(b) - value(a) || b.games - a.games || a.name.localeCompare(b.name, "bs"));
  const pages = Math.max(1, Math.ceil(sorted.length / PAGE_PLAYERS));
  const requested = Number(sp.strana);
  const page = Number.isInteger(requested) && requested >= 1 && requested <= pages ? requested : 1;
  const shown = sorted.slice((page - 1) * PAGE_PLAYERS, page * PAGE_PLAYERS);
  const base = { sort: sp.sort as string | undefined, zbir: totals ? 1 : undefined, q: q || undefined };

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segments>
          <FilterSegment href={href({ ...base, zbir: undefined })} param="zbir" active={!totals}>Prosjek</FilterSegment>
          <FilterSegment href={href({ ...base, zbir: 1 })} param="zbir" value="1" active={totals}>Ukupno</FilterSegment>
        </Segments>
        <FilterForm action="/fiba" role="search" className="flex w-full gap-2 sm:w-auto">
          <input type="hidden" name="prikaz" value="igraci" />
          <input type="hidden" name="kategorija" value={category} />
          {typeof sp.sezona === "string" && <input type="hidden" name="sezona" value={sp.sezona} />}
          {base.sort && <input type="hidden" name="sort" value={base.sort} />}
          {totals && <input type="hidden" name="zbir" value="1" />}
          <label className="relative block min-w-0 flex-1 sm:w-64">
            <span className="sr-only">Traži igrača ili ekipu</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-muted" aria-hidden />
            <input name="q" defaultValue={q} placeholder="Igrač ili ekipa" className={cx(inputClass, "pl-9")} />
          </label>
          <button className={buttonClass("secondary")}>Traži</button>
        </FilterForm>
      </div>

      {shown.length === 0 ? (
        <Empty icon={<Search />}>{q ? `Nema igrača za "${q}".` : "Još nema statistike igrača u ovoj kategoriji."}</Empty>
      ) : (
        <div className={TABLE_WRAP}>
          <table className="w-full min-w-[1100px] border-collapse">
            <caption className="sr-only">Statistika igrača, {totals ? "ukupno" : "prosjek po utakmici"}; klik na naslov kolone sortira.</caption>
            <thead className="border-b border-line bg-panel-2">
              <tr>
                <th className={cx(TH, "w-10 pl-4 text-left sm:pl-5")}>#</th>
                <th className={cx(TH, STICKY, "bg-panel-2 text-left")}>Igrač</th>
                {PLAYER_COLS.map((c, i) => (
                  <th key={c.key} className={cx(TH, i === PLAYER_COLS.length - 1 && "pr-4 sm:pr-5")} title={c.title} aria-sort={c === sortCol ? "descending" : undefined}>
                    <FilterLink href={href({ ...base, sort: c.key === "pts" ? undefined : c.key })} className={cx("inline-flex items-center gap-0.5 hover:text-fg", c === sortCol && "text-fg")}>
                      {c === sortCol && <ArrowDown className="size-3" aria-hidden />}
                      {c.label}
                    </FilterLink>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {shown.map((p, i) => (
                <tr key={p.id} className="group hover:bg-panel-2">
                  <td className={cx(TD, "pl-4 text-left text-fg-faint sm:pl-5")}>{(page - 1) * PAGE_PLAYERS + i + 1}</td>
                  <td className={cx(STICKY, "max-w-[48vw] py-2 pr-3 group-hover:bg-panel-2 sm:max-w-[280px]")}>
                    <PlayerLink id={p.id} name={p.name} className="block truncate text-[14px] font-semibold" />
                    <span className="flex min-w-0 items-center gap-1.5 text-[12px] text-fg-muted">
                      <span className="truncate">{p.team}</span>
                      {p.number && <span className="shrink-0 text-fg-faint">#{p.number}</span>}
                    </span>
                  </td>
                  {PLAYER_COLS.map((c, j) => (
                    <td key={c.key} className={cx(TD, c === sortCol && "font-semibold", c.key === "games" && "text-fg-muted", j === PLAYER_COLS.length - 1 && "pr-4 sm:pr-5")}>
                      {c.key === "games" ? (
                        <>
                          {p.games}
                          <span className="text-fg-faint"> ({p.starts})</span>
                        </>
                      ) : totals || !c.average ? c.total(p) : c.average(p)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-[12px] text-fg-faint">{filtered.length} igrača. U zagradi uz utakmice: u startnoj petorci.</p>
      <Pager pages={Array.from({ length: pages }, () => null)} page={page} href={(n) => href({ ...base, strana: n })} label="Stranice igrača" />
    </section>
  );
}

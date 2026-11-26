import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getFibaPlayer } from "@/lib/data/fiba";
import { fibaCategoryLabel, FIBA_CATEGORIES, properName } from "@/lib/fiba";
import { avg, avgMinutes, fmt1, minutesText, pctText, plusMinusText, seasonOf } from "@/lib/fiba-stats";
import { formatDayMonth, formatWeekday } from "@/lib/format";
import { pageParam } from "@/lib/paginate";
import { Bone, Skeleton, Text, times } from "@/components/skeleton";
import { ClubLogo } from "@/components/team-name";
import { FilterNavProvider } from "@/components/filter-nav";
import { CARD, cx, SectionTitle } from "@/components/ui";
import { BigStat, Pager, PlayerPhoto, ResultMark, STICKY, TABLE_WRAP, TD, TH, teamHref } from "../../ui";

export const metadata = { title: "Igrač — FIBA — KSKS" };

type Params = Promise<{ id: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default function FibaPlayerPage({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  return (
    <>
      <Link href="/fiba?prikaz=igraci" className="mb-6 inline-flex items-center gap-1 text-[14px] font-semibold text-fg-muted hover:text-fg">
        <ChevronLeft className="size-4" aria-hidden="true" /> FIBA igrači
      </Link>
      <Suspense fallback={<PlayerSkeleton />}>
        <Player params={params} searchParams={searchParams} />
      </Suspense>
    </>
  );
}

type Line = Awaited<ReturnType<typeof getFibaPlayer>>["lines"][number];

const KEYS = ["pts", "fgm", "fga", "tpm", "tpa", "ftm", "fta", "oreb", "dreb", "reb", "ast", "stl", "blk", "tov", "pf", "fd", "eff", "plus_minus", "seconds"] as const;
type Totals = Record<(typeof KEYS)[number], number> & { games: number; starts: number; won: number };

function totals(lines: Line[]): Totals {
  const t = Object.fromEntries(KEYS.map((k) => [k, 0])) as Totals;
  t.games = lines.length;
  t.starts = lines.filter((l) => l.starter).length;
  t.won = lines.filter(won).length;
  for (const l of lines) for (const k of KEYS) t[k] += l[k];
  return t;
}

/** Ekipa igrača je pobijedila */
function won(l: Line) {
  const { home_score: h, away_score: a } = l.game;
  return h != null && a != null && (l.side === 1 ? h > a : a > h);
}

const PAGE_GAMES = 15;

async function Player({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  if (!/^[0-9a-f]{12}$/.test(id)) notFound();
  const { lines, photo } = await getFibaPlayer(id);
  if (lines.length === 0) notFound();

  const latest = lines[0];
  const name = properName([latest.first_name, latest.family_name].filter(Boolean).join(" "));
  const played = lines.filter((l) => l.seconds > 0);
  const all = totals(played);
  const categories = FIBA_CATEGORIES.filter((c) => lines.some((l) => l.game.category === c.key));
  const teams = [...new Set(lines.map((l) => l.team_name))];
  const position = lines.find((l) => l.position)?.position;

  // Zadnjih 10 odigranih (najstarija lijevo) za grafikon poena
  const recent = played.slice(0, 10).reverse();
  const maxPts = Math.max(10, ...recent.map((l) => l.pts));

  const splits: { label: string; lines: Line[] }[] = [
    { label: "Pobjede", lines: played.filter(won) },
    { label: "Porazi", lines: played.filter((l) => !won(l)) },
    { label: "Kod kuće", lines: played.filter((l) => l.side === 1) },
    { label: "U gostima", lines: played.filter((l) => l.side === 2) },
    { label: "U startu", lines: played.filter((l) => l.starter) },
    { label: "S klupe", lines: played.filter((l) => !l.starter) },
  ].filter((s) => s.lines.length > 0);

  const best = (key: "pts" | "reb" | "ast" | "eff" | "tpm" | "stl", label: string) => {
    const top = [...played].sort((a, b) => b[key] - a[key])[0];
    return top && top[key] > 0 ? { label, value: top[key], line: top } : null;
  };
  const records = [best("pts", "Poeni"), best("reb", "Skokovi"), best("ast", "Asistencije"), best("eff", "Indeks"), best("tpm", "Trice"), best("stl", "Ukradene lopte")].filter((r) => r !== null);

  // Kategorija i sezona (npr. kadeti 2025/26, juniori 2026/27)
  const buckets: { key: string; label: string; lines: Line[] }[] = [];
  for (const l of played) {
    const key = `${l.game.category}|${seasonOf(l.game.starts_at)}`;
    const bucket = buckets.find((b) => b.key === key);
    if (bucket) bucket.lines.push(l);
    else buckets.push({ key, label: `${fibaCategoryLabel(l.game.category)}, ${seasonOf(l.game.starts_at) ?? ""}`, lines: [l] });
  }

  const pages = Math.max(1, Math.ceil(lines.length / PAGE_GAMES));
  const page = pageParam(sp.strana, pages);
  const log = lines.slice((page - 1) * PAGE_GAMES, page * PAGE_GAMES);

  return (
    <FilterNavProvider>
      <div className="flex flex-col gap-10">
        <header className="flex flex-wrap items-center gap-4 border-b border-line pb-6 sm:gap-5">
          {photo && <PlayerPhoto src={photo} name={name} size="xl" className="shadow-panel" />}
          <span className="grid size-16 shrink-0 place-items-center rounded-lg border border-line bg-panel shadow-panel sm:size-20 [&>span]:h-12 [&>span]:w-16">
            <ClubLogo src={latest.side === 1 ? latest.game.home_logo : latest.game.away_logo} eager />
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-[28px] font-semibold leading-tight tracking-[-0.04em] sm:text-[36px]">
              {name}
              {latest.number && <span className="scoreboard ml-3 text-fg-faint">#{latest.number}</span>}
            </h1>
            <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[14px] text-fg-muted">
              {teams.map((t, i) => {
                const l = lines.find((x) => x.team_name === t)!;
                return (
                  <span key={t} className="inline-flex items-center">
                    {l.game.category ? <Link href={teamHref(l.game.category, t)} className="font-semibold text-fg hover:underline">{t}</Link> : <span className="font-semibold text-fg">{t}</span>}
                    {i < teams.length - 1 && <span className="ml-3 text-fg-faint">·</span>}
                  </span>
                );
              })}
              {position && <span>Pozicija {position}</span>}
              <span>{categories.map((c) => c.label).join(", ")}</span>
            </p>
          </div>
        </header>

        {played.length === 0 ? (
          <p className="text-[14px] text-fg-muted">Igrač je bio u sastavu, ali još nije ulazio u igru.</p>
        ) : (
          <>
            <section>
              <SectionTitle>Prosjek po utakmici</SectionTitle>
              <dl className={cx(CARD, "grid grid-cols-2 gap-px overflow-hidden bg-line sm:grid-cols-4 lg:grid-cols-8 [&>div]:bg-panel")}>
                <BigStat label="Poeni" value={fmt1(avg(all.pts, all.games))} sub={`ukupno ${all.pts}`} />
                <BigStat label="Skokovi" value={fmt1(avg(all.reb, all.games))} sub={`${all.oreb} nap. / ${all.dreb} odb.`} />
                <BigStat label="Asistencije" value={fmt1(avg(all.ast, all.games))} sub={`ukupno ${all.ast}`} />
                <BigStat label="Indeks" value={fmt1(avg(all.eff, all.games))} sub={`ukupno ${all.eff}`} />
                <BigStat label="Minute" value={avgMinutes(all.seconds, all.games)} sub={`${all.games} utakmica, ${all.starts} u startu`} />
                <BigStat label="Šut iz igre" value={`${pctText(all.fgm, all.fga)}%`} sub={`${all.fgm}/${all.fga}`} />
                <BigStat label="Trice" value={`${pctText(all.tpm, all.tpa)}%`} sub={`${all.tpm}/${all.tpa}`} />
                <BigStat label="Slobodna" value={`${pctText(all.ftm, all.fta)}%`} sub={`${all.ftm}/${all.fta}`} />
              </dl>
            </section>

            <div className="grid gap-10 lg:grid-cols-2">
              <section>
                <SectionTitle>Poeni na zadnjim utakmicama</SectionTitle>
                <div className={cx(CARD, "px-4 pb-3 pt-5 sm:px-5")}>
                  <div className="flex h-40 items-end gap-1.5 sm:gap-2">
                    {recent.map((l) => (
                      <Link key={l.game_id} href={`/fiba/${l.game_id}`} className="group flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1" title={`${l.pts} poena, ${opponent(l)}`}>
                        <span className="scoreboard text-[12px] font-semibold text-fg-muted group-hover:text-fg">{l.pts}</span>
                        <span className={cx("w-full max-w-10 rounded-t-[4px] transition-colors", won(l) ? "bg-fg/80 group-hover:bg-fg" : "bg-fg-faint/50 group-hover:bg-fg-faint")} style={{ height: `${Math.max(2, (l.pts / maxPts) * 100)}%` }} />
                      </Link>
                    ))}
                  </div>
                  <div className="mt-2 flex gap-1.5 border-t border-line pt-2 sm:gap-2">
                    {recent.map((l) => (
                      <span key={l.game_id} className="min-w-0 flex-1 truncate text-center text-[11px] text-fg-faint">{l.game.starts_at ? formatDayMonth(l.game.starts_at) : ""}</span>
                    ))}
                  </div>
                  <p className="mt-2 text-[12px] text-fg-faint">Tamnije: pobjeda ekipe. Prosjek zadnjih 5: {fmt1(avg(recent.slice(-5).reduce((s, l) => s + l.pts, 0), Math.min(5, recent.length)))} poena.</p>
                </div>
              </section>

              <section>
                <SectionTitle>Rekordi</SectionTitle>
                <ul className={cx(CARD, "grid grid-cols-2 gap-px overflow-hidden bg-line sm:grid-cols-3")}>
                  {records.map((r) => (
                    <li key={r.label} className="bg-panel">
                      <Link href={`/fiba/${r.line.game_id}`} className="block px-4 py-3.5 transition-colors hover:bg-panel-2 sm:px-5">
                        <span className="block text-[12px] font-semibold text-fg-muted">{r.label}</span>
                        <span className="scoreboard mt-1.5 block text-[26px] font-semibold leading-none tracking-[-0.03em]">{r.value}</span>
                        <span className="mt-1 block truncate text-[12px] text-fg-faint">{opponent(r.line)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            </div>

            <section>
              <SectionTitle>Po kategoriji i učinku</SectionTitle>
              <div className={TABLE_WRAP}>
                <table className="w-full min-w-[760px] border-collapse">
                  <thead className="border-b border-line bg-panel-2">
                    <tr>
                      <th className={cx(TH, STICKY, "bg-panel-2 pl-4 text-left sm:pl-5")}>Prosjek</th>
                      {SPLIT_COLS.map((c, i) => <th key={c.label} className={cx(TH, i === SPLIT_COLS.length - 1 && "pr-4 sm:pr-5")} title={c.title}>{c.label}</th>)}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {buckets.length > 1 && buckets.map((b) => (
                      <SplitRow key={b.key} label={b.label} t={totals(b.lines)} />
                    ))}
                    {buckets.length > 1 && <SplitRow label="Sve utakmice" t={all} strong />}
                    {splits.map((s) => <SplitRow key={s.label} label={s.label} t={totals(s.lines)} />)}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}

        <section className="flex flex-col gap-4">
          <SectionTitle count={lines.length}>Utakmice</SectionTitle>
          <div className={cx(TABLE_WRAP, "-mt-1")}>
            <table className="w-full min-w-[1060px] border-collapse">
              <thead className="border-b border-line bg-panel-2">
                <tr>
                  <th className={cx(TH, "pl-4 text-left sm:pl-5")}>Datum</th>
                  <th className={cx(TH, STICKY, "bg-panel-2 text-left")}>Protivnik</th>
                  <th className={cx(TH, "text-left")}>Rezultat</th>
                  {LOG_COLS.map((c, i) => <th key={c.label} className={cx(TH, i === LOG_COLS.length - 1 && "pr-4 sm:pr-5")} title={c.title}>{c.label}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {log.map((l) => {
                  const own = l.side === 1 ? l.game.home_score : l.game.away_score;
                  const opp = l.side === 1 ? l.game.away_score : l.game.home_score;
                  const dnp = l.seconds === 0;
                  return (
                    <tr key={l.game_id} className={cx("group hover:bg-panel-2", dnp && "text-fg-faint")}>
                      <td className={cx(TD, "pl-4 text-left text-[13px] text-fg-muted sm:pl-5")}>
                        {l.game.starts_at ? `${formatWeekday(l.game.starts_at)}, ${formatDayMonth(l.game.starts_at)}` : "—"}
                      </td>
                      <td className={cx(STICKY, "max-w-[44vw] py-2 pr-3 group-hover:bg-panel-2 sm:max-w-[260px]")}>
                        <Link href={`/fiba/${l.game_id}`} className="flex min-w-0 items-center gap-1.5 text-[14px] font-medium hover:underline">
                          <span className="w-4 shrink-0 text-[12px] text-fg-faint">{l.side === 1 ? "vs" : "@"}</span>
                          <span className="truncate">{l.side === 1 ? l.game.away_name : l.game.home_name}</span>
                        </Link>
                        {buckets.length > 1 && <span className="ml-5 block text-[11px] text-fg-faint">{FIBA_CATEGORIES.find((c) => c.key === l.game.category)?.label} {seasonOf(l.game.starts_at)}</span>}
                      </td>
                      <td className={cx(TD, "text-left")}>
                        {own != null && opp != null ? <><ResultMark won={own > opp} /> {own}:{opp}</> : "—"}
                      </td>
                      {dnp ? (
                        <td colSpan={LOG_COLS.length} className="px-2 py-2.5 text-[13px]">Nije ulazio u igru</td>
                      ) : (
                        LOG_COLS.map((c, i) => <td key={c.label} className={cx(TD, c.label === "PTS" && "font-semibold", i === LOG_COLS.length - 1 && "pr-4 sm:pr-5")}>{c.value(l)}</td>)
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pager pages={Array.from({ length: pages }, () => null)} page={page} href={(n) => (n > 1 ? `/fiba/igrac/${id}?strana=${n}` : `/fiba/igrac/${id}`)} label="Stranice utakmica" />
        </section>
      </div>
    </FilterNavProvider>
  );
}

function opponent(l: Line) {
  const date = l.game.starts_at ? `${formatDayMonth(l.game.starts_at)} ` : "";
  return `${date}${l.side === 1 ? "vs" : "@"} ${l.side === 1 ? l.game.away_name : l.game.home_name}`;
}

const LOG_COLS: { label: string; title: string; value: (l: Line) => React.ReactNode }[] = [
  { label: "MIN", title: "Minute", value: (l) => minutesText(l.seconds) },
  { label: "PTS", title: "Poeni", value: (l) => l.pts },
  { label: "Š2", title: "Dvojke", value: (l) => `${l.fgm - l.tpm}/${l.fga - l.tpa}` },
  { label: "3P", title: "Trice", value: (l) => `${l.tpm}/${l.tpa}` },
  { label: "SB", title: "Slobodna bacanja", value: (l) => `${l.ftm}/${l.fta}` },
  { label: "SKN", title: "Skokovi u napadu", value: (l) => l.oreb },
  { label: "SKO", title: "Skokovi u odbrani", value: (l) => l.dreb },
  { label: "SK", title: "Skokovi", value: (l) => l.reb },
  { label: "AS", title: "Asistencije", value: (l) => l.ast },
  { label: "UL", title: "Ukradene lopte", value: (l) => l.stl },
  { label: "IL", title: "Izgubljene lopte", value: (l) => l.tov },
  { label: "BL", title: "Blokade", value: (l) => l.blk },
  { label: "LG", title: "Lične greške", value: (l) => l.pf },
  { label: "IG", title: "Iznuđene greške", value: (l) => l.fd },
  { label: "+/−", title: "Plus/minus", value: (l) => plusMinusText(l.plus_minus) },
  { label: "IND", title: "Indeks korisnosti", value: (l) => l.eff },
];

const SPLIT_COLS: { label: string; title: string; value: (t: Totals) => string }[] = [
  { label: "U", title: "Utakmice", value: (t) => String(t.games) },
  { label: "P–I", title: "Pobjede–porazi ekipe", value: (t) => `${t.won}–${t.games - t.won}` },
  { label: "MIN", title: "Minute", value: (t) => avgMinutes(t.seconds, t.games) },
  { label: "PTS", title: "Poeni", value: (t) => fmt1(avg(t.pts, t.games)) },
  { label: "SK", title: "Skokovi", value: (t) => fmt1(avg(t.reb, t.games)) },
  { label: "AS", title: "Asistencije", value: (t) => fmt1(avg(t.ast, t.games)) },
  { label: "UL", title: "Ukradene lopte", value: (t) => fmt1(avg(t.stl, t.games)) },
  { label: "IL", title: "Izgubljene lopte", value: (t) => fmt1(avg(t.tov, t.games)) },
  { label: "Š%", title: "Šut iz igre", value: (t) => pctText(t.fgm, t.fga) },
  { label: "3P%", title: "Šut za tri", value: (t) => pctText(t.tpm, t.tpa) },
  { label: "SB%", title: "Slobodna bacanja", value: (t) => pctText(t.ftm, t.fta) },
  { label: "IND", title: "Indeks korisnosti", value: (t) => fmt1(avg(t.eff, t.games)) },
];

function SplitRow({ label, t, strong }: { label: string; t: Totals; strong?: boolean }) {
  return (
    <tr className={cx("group hover:bg-panel-2", strong && "font-semibold")}>
      <td className={cx(STICKY, "py-2.5 pl-4 pr-3 text-[14px] font-medium group-hover:bg-panel-2 sm:pl-5")}>{label}</td>
      {SPLIT_COLS.map((c, i) => (
        <td key={c.label} className={cx(TD, c.label === "PTS" && "font-semibold", i === SPLIT_COLS.length - 1 && "pr-4 sm:pr-5")}>{c.value(t)}</td>
      ))}
    </tr>
  );
}

function PlayerSkeleton() {
  return (
    <Skeleton className="flex flex-col gap-10">
      <div className="flex items-center gap-5 border-b border-line pb-6">
        <Bone className="size-20 rounded-lg" />
        <div className="flex flex-col gap-3">
          <Text w="w-64" className="text-[32px]" />
          <Text w="w-40" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-px sm:grid-cols-4 lg:grid-cols-8">
        {times(8, (i) => <Bone key={i} className="h-20" />)}
      </div>
      <Bone className="h-80 w-full rounded-lg" />
    </Skeleton>
  );
}


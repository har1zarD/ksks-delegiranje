import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getFibaGames, getFibaTeamGames, getFibaTeamPlayers } from "@/lib/data/fiba";
import { feedState, fibaCategoryLabel, properName } from "@/lib/fiba";
import { avg, avgMinutes, fibaStandings, fmt1, pctText, seasonOf, seasonsOf } from "@/lib/fiba-stats";
import { slug } from "@/lib/format";
import { MatchLine } from "@/components/match-line";
import { Bone, Skeleton, Text, times } from "@/components/skeleton";
import { ClubLogo } from "@/components/team-name";
import { CARD, cx, Rows, SectionTitle, Status } from "@/components/ui";
import { FibaStandings } from "../../../standings";
import { BigStat, FormDots, PlayerLink, PlayerPhoto, STICKY, TABLE_WRAP, TD, TH } from "../../../ui";

export const metadata = { title: "Ekipa — FIBA — KSKS" };

type Params = Promise<{ kategorija: string; slug: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default function FibaTeamPage({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  return (
    <Suspense fallback={<TeamSkeleton />}>
      <Team params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function Team({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  const [{ kategorija: category, slug: teamSlug }, sp] = await Promise.all([params, searchParams]);
  const [all, teamGames] = await Promise.all([getFibaGames(), getFibaTeamGames()]);
  const inCategory = all.filter((g) => g.category === category);
  const name = inCategory.flatMap((g) => [g.home_name, g.away_name]).find((n) => slug(n) === teamSlug);
  if (!name) notFound();
  // Sezona: izabrana ili najnovija u kojoj je ekipa igrala
  const seasons = seasonsOf(inCategory.filter((g) => g.home_name === name || g.away_name === name));
  const season = seasons.find((s) => s === sp.sezona) ?? seasons[0] ?? null;
  const games = inCategory.filter((g) => seasonOf(g.starts_at) === season);

  const state = (g: (typeof games)[number]) => feedState(g.status, g.live, g.starts_at);
  const own = games
    .filter((g) => g.home_name === name || g.away_name === name)
    .sort((a, b) => Date.parse(b.starts_at ?? "") - Date.parse(a.starts_at ?? ""));
  const logo = own.map((g) => (g.home_name === name ? g.home_logo : g.away_logo)).find(Boolean) ?? null;

  const groups = fibaStandings(games.map((g) => ({ ...g, finished: state(g) === "finished" })));
  const group = groups.find((rows) => rows.some((r) => r.teamId === name));
  const row = group?.find((r) => r.teamId === name);
  const logos: Record<string, string | null> = {};
  for (const g of games) {
    logos[g.home_name] ??= g.home_logo;
    logos[g.away_name] ??= g.away_logo;
  }

  // Statistika ekipe iz box scorea
  const mine = own.flatMap((g) => (teamGames.get(g.id) ?? []).filter((t) => t.team_name === name));
  const theirs = own.flatMap((g) => (teamGames.get(g.id) ?? []).filter((t) => t.team_name !== name));
  const sum = (list: typeof mine, k: "pts" | "fgm" | "fga" | "tpm" | "tpa" | "ftm" | "fta" | "reb" | "ast" | "tov" | "stl" | "blk") => list.reduce((s, t) => s + t[k], 0);
  const n = mine.length;

  // Igrači: zbir po igraču
  const lines = (await getFibaTeamPlayers(category, name)).filter((l) => seasonOf(l.game.starts_at) === season);
  const roster = new Map<string, { id: string; name: string; photo: string | null; number: string | null; games: number; starts: number; seconds: number; pts: number; reb: number; ast: number; stl: number; blk: number; tov: number; eff: number; fgm: number; fga: number; tpm: number; tpa: number; ftm: number; fta: number; last: string }>();
  for (const l of lines) {
    if (l.seconds === 0) continue;
    const r = roster.get(l.player_id) ?? { id: l.player_id, name: properName([l.first_name, l.family_name].filter(Boolean).join(" ")), photo: l.photo, number: l.number, games: 0, starts: 0, seconds: 0, pts: 0, reb: 0, ast: 0, stl: 0, blk: 0, tov: 0, eff: 0, fgm: 0, fga: 0, tpm: 0, tpa: 0, ftm: 0, fta: 0, last: "" };
    r.games++;
    r.starts += l.starter ? 1 : 0;
    for (const k of ["seconds", "pts", "reb", "ast", "stl", "blk", "tov", "eff", "fgm", "fga", "tpm", "tpa", "ftm", "fta"] as const) r[k] += l[k];
    // Broj dresa sa zadnje utakmice
    if ((l.game.starts_at ?? "") > r.last) {
      r.last = l.game.starts_at ?? "";
      r.number = l.number;
    }
    roster.set(l.player_id, r);
  }
  const players = [...roster.values()].sort((a, b) => avg(b.pts, b.games) - avg(a.pts, a.games));
  const photos = players.some((p) => p.photo);

  return (
    <div className="flex flex-col gap-10">
      <div>
        <Link href={`/fiba?prikaz=tabela&kategorija=${category}${season && season !== seasonsOf(inCategory)[0] ? `&sezona=${encodeURIComponent(season)}` : ""}`} className="mb-6 inline-flex items-center gap-1 text-[14px] font-semibold text-fg-muted hover:text-fg">
          <ChevronLeft className="size-4" aria-hidden="true" /> Tabela, {fibaCategoryLabel(category)}
        </Link>
        <header className="flex flex-wrap items-center gap-4 border-b border-line pb-6 sm:gap-5">
          <span className="grid size-16 shrink-0 place-items-center rounded-lg border border-line bg-panel shadow-panel sm:size-20 [&>span]:h-12 [&>span]:w-16">
            <ClubLogo src={logo} eager />
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-[28px] font-semibold leading-tight tracking-[-0.04em] sm:text-[36px]">{name}</h1>
            <p className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[14px] text-fg-muted">
              <span>{fibaCategoryLabel(category)}{season && `, ${season}`}</span>
              {row && group && <span><span className="font-semibold text-fg">{group.indexOf(row) + 1}. mjesto</span> od {group.length}</span>}
              {row && <span className="scoreboard"><span className="font-semibold text-fg">{row.won}–{row.lost}</span> pobjeda–poraza</span>}
              {row && row.form.length > 0 && <FormDots form={row.form} />}
            </p>
          </div>
        </header>
        {seasons.length > 1 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {seasons.map((s) => (
              <Link key={s} href={s === seasons[0] ? `/fiba/ekipa/${category}/${teamSlug}` : `/fiba/ekipa/${category}/${teamSlug}?sezona=${encodeURIComponent(s)}`} aria-current={s === season ? "page" : undefined} className={cx("rounded-md border px-3 py-1.5 text-[13px] font-semibold", s === season ? "border-fg bg-fg text-court" : "border-line-strong text-fg-muted hover:text-fg")}>
                Sezona {s}
              </Link>
            ))}
          </div>
        )}
      </div>

      {n > 0 && (
        <section>
          <SectionTitle>Prosjek po utakmici</SectionTitle>
          <dl className={cx(CARD, "grid grid-cols-2 gap-px overflow-hidden bg-line sm:grid-cols-4 lg:grid-cols-8 [&>div]:bg-panel")}>
            <BigStat label="Poeni" value={fmt1(avg(sum(mine, "pts"), n))} />
            <BigStat label="Primljeni" value={fmt1(avg(sum(theirs, "pts"), n))} />
            <BigStat label="Šut iz igre" value={`${pctText(sum(mine, "fgm"), sum(mine, "fga"))}%`} sub={`protivnik ${pctText(sum(theirs, "fgm"), sum(theirs, "fga"))}%`} />
            <BigStat label="Trice" value={`${pctText(sum(mine, "tpm"), sum(mine, "tpa"))}%`} sub={`${fmt1(avg(sum(mine, "tpm"), n))} po utakmici`} />
            <BigStat label="Slobodna" value={`${pctText(sum(mine, "ftm"), sum(mine, "fta"))}%`} />
            <BigStat label="Skokovi" value={fmt1(avg(sum(mine, "reb"), n))} sub={`protivnik ${fmt1(avg(sum(theirs, "reb"), n))}`} />
            <BigStat label="Asistencije" value={fmt1(avg(sum(mine, "ast"), n))} />
            <BigStat label="Izgubljene" value={fmt1(avg(sum(mine, "tov"), n))} sub={`ukradene ${fmt1(avg(sum(mine, "stl"), n))}`} />
          </dl>
        </section>
      )}

      {players.length > 0 && (
        <section>
          <SectionTitle count={players.length}>Igrači</SectionTitle>
          <div className={TABLE_WRAP}>
            <table className="w-full min-w-[860px] border-collapse">
              <caption className="sr-only">Igrači ekipe, prosjek po utakmici.</caption>
              <thead className="border-b border-line bg-panel-2">
                <tr>
                  <th className={cx(TH, "w-10 pl-4 text-left sm:pl-5")}>#</th>
                  <th className={cx(TH, STICKY, "bg-panel-2 text-left")}>Igrač</th>
                  <th className={TH} title="Utakmice (u startu)">U</th>
                  <th className={TH} title="Minute">MIN</th>
                  <th className={TH} title="Poeni">PTS</th>
                  <th className={TH} title="Skokovi">SK</th>
                  <th className={TH} title="Asistencije">AS</th>
                  <th className={TH} title="Ukradene lopte">UL</th>
                  <th className={TH} title="Blokade">BL</th>
                  <th className={TH} title="Izgubljene lopte">IL</th>
                  <th className={TH} title="Šut iz igre">Š%</th>
                  <th className={TH} title="Šut za tri">3P%</th>
                  <th className={TH} title="Slobodna bacanja">SB%</th>
                  <th className={cx(TH, "pr-4 sm:pr-5")} title="Indeks korisnosti">IND</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {players.map((p) => (
                  <tr key={p.id} className="group hover:bg-panel-2">
                    <td className={cx(TD, "pl-4 text-left text-fg-muted sm:pl-5")}>{p.number}</td>
                    <td className={cx(STICKY, "max-w-[48vw] py-2.5 pr-3 group-hover:bg-panel-2 sm:max-w-none")}>
                      <span className="flex min-w-0 items-center gap-2.5">
                        {photos && <PlayerPhoto src={p.photo} name={p.name} />}
                        <PlayerLink id={p.id} name={p.name} className="block truncate text-[14px] font-semibold" />
                      </span>
                    </td>
                    <td className={cx(TD, "text-fg-muted")}>{p.games}<span className="text-fg-faint"> ({p.starts})</span></td>
                    <td className={cx(TD, "text-fg-muted")}>{avgMinutes(p.seconds, p.games)}</td>
                    <td className={cx(TD, "font-semibold")}>{fmt1(avg(p.pts, p.games))}</td>
                    <td className={TD}>{fmt1(avg(p.reb, p.games))}</td>
                    <td className={TD}>{fmt1(avg(p.ast, p.games))}</td>
                    <td className={TD}>{fmt1(avg(p.stl, p.games))}</td>
                    <td className={TD}>{fmt1(avg(p.blk, p.games))}</td>
                    <td className={TD}>{fmt1(avg(p.tov, p.games))}</td>
                    <td className={cx(TD, "text-fg-muted")}>{pctText(p.fgm, p.fga)}</td>
                    <td className={cx(TD, "text-fg-muted")}>{pctText(p.tpm, p.tpa)}</td>
                    <td className={cx(TD, "text-fg-muted")}>{pctText(p.ftm, p.fta)}</td>
                    <td className={cx(TD, "pr-4 sm:pr-5")}>{fmt1(avg(p.eff, p.games))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section>
        <SectionTitle count={own.length}>Utakmice</SectionTitle>
        <Rows>
          {own.map((g) => {
            const [home, away] = teamGames.get(g.id) ?? [];
            const periods = home && away ? home.periods.map((h, i) => ({ period: i + 1, home_points: h, away_points: away.periods[i] ?? 0 })) : undefined;
            const live = state(g) === "live";
            return (
              <li key={g.id}>
                <Link href={`/fiba/${g.id}`} className="-mx-4 flex px-4 py-3.5 transition-colors hover:bg-panel-2 sm:-mx-6 sm:px-6">
                  <MatchLine
                    match={{ starts_at: g.starts_at ?? "", round: null, home_score: g.home_score, away_score: g.away_score, competition: null, home: { name: g.home_name, club: { logo_url: g.home_logo } }, away: { name: g.away_name, club: { logo_url: g.away_logo } }, hall: null }}
                    hideDate={!g.starts_at}
                    showScore={state(g) !== "scheduled"}
                    periods={periods}
                    badge={live ? <Status tone="crest" pulse>Uživo</Status> : undefined}
                  />
                </Link>
              </li>
            );
          })}
        </Rows>
      </section>

      {group && (
        <section>
          <SectionTitle>Tabela</SectionTitle>
          <FibaStandings rows={group} category={category} season={season} logos={logos} highlight={name} />
        </section>
      )}
    </div>
  );
}

function TeamSkeleton() {
  return (
    <Skeleton className="flex flex-col gap-10">
      <div className="flex items-center gap-5 border-b border-line pb-6">
        <Bone className="size-20 rounded-lg" />
        <div className="flex flex-col gap-3">
          <Text w="w-64" className="text-[32px]" />
          <Text w="w-48" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-px sm:grid-cols-4 lg:grid-cols-8">
        {times(8, (i) => <Bone key={i} className="h-20" />)}
      </div>
      <Bone className="h-96 w-full rounded-lg" />
    </Skeleton>
  );
}

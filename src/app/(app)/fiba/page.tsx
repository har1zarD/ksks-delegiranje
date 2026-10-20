import { Suspense } from "react";
import Link from "next/link";
import { BarChart3, Radio, Trophy } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getFibaCompetitions, getFibaGames, getFibaSeason, getFibaTeamGames, type FibaGameRow } from "@/lib/data/fiba";
import { FIBA_CATEGORIES, feedState, fibaCategoryLabel } from "@/lib/fiba";
import { fibaStandings, seasonOf, seasonsOf } from "@/lib/fiba-stats";
import { dayKey, formatDayHeading, matchNo } from "@/lib/format";
import { pageParam, pageRange, paginateDays } from "@/lib/paginate";
import { AutoRefresh } from "@/components/auto-refresh";
import { MatchLine, type MatchSummary } from "@/components/match-line";
import { Bone, MatchRowsSkeleton, SectionTitleSkeleton, SegmentsSkeleton, Skeleton, StandingsSkeleton, times } from "@/components/skeleton";
import { FilterContent, FilterNavProvider, FilterSegment, FilterSegments } from "@/components/filter-nav";
import { Empty, PageHeader, Rows, SectionTitle, Status } from "@/components/ui";
import { AddFibaGame } from "./add-game";
import { FibaStandings } from "./standings";
import { Leaders, PlayersTable, seasonPlayer, teamAverages, TeamStatsTable } from "./stats-view";
import { Pager } from "./ui";

export const metadata = { title: "FIBA uživo — KSKS" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const VIEWS = [
  { key: undefined, label: "Utakmice" },
  { key: "tabela", label: "Tabela" },
  { key: "statistika", label: "Statistika" },
  { key: "igraci", label: "Igrači" },
] as const;

type View = (typeof VIEWS)[number]["key"];

export default function FibaPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <>
      <PageHeader icon={<Radio />} title="FIBA uživo" subtitle="Premijer liga BiH, A1 liga i omladinska liga KS na FIBA LiveStats: rezultati uživo, tabela, box score, lideri i statistika igrača." />
      <Suspense fallback={<FibaSkeleton />}>
        <Fiba searchParams={searchParams} />
      </Suspense>
    </>
  );
}

/** FIBA utakmica kao naša u listi (MatchLine) */
function fibaSummary(g: FibaGameRow, withCategory: boolean): MatchSummary {
  return {
    starts_at: g.starts_at ?? "",
    round: null,
    home_score: g.home_score,
    away_score: g.away_score,
    competition: withCategory ? { name: fibaCategoryLabel(g.category), short_name: null } : null,
    home: { name: g.home_name, club: { logo_url: g.home_logo } },
    away: { name: g.away_name, club: { logo_url: g.away_logo } },
    hall: null,
  };
}

async function Fiba({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const view: View = VIEWS.find((v) => v.key === sp.prikaz)?.key;
  const all = await getFibaGames();
  const categories = FIBA_CATEGORIES.filter((c) => all.some((g) => g.category === c.key));
  // Tabela i statistika su uvijek za jednu kategoriju (prva ako nije izabrana)
  const selected = categories.find((c) => c.key === sp.kategorija)?.key ?? (view ? categories[0]?.key : undefined) ?? null;
  // Tabela i statistika su po sezoni (najnovija ako nije izabrana)
  const seasons = selected ? seasonsOf(all.filter((g) => g.category === selected)) : [];
  const season = seasons.find((s) => s === sp.sezona) ?? seasons[0] ?? null;

  const href = (p: { prikaz?: string; kategorija?: string | null } & Record<string, string | number | null | undefined>) => {
    const q = new URLSearchParams();
    const v = "prikaz" in p ? p.prikaz : view;
    const k = "kategorija" in p ? p.kategorija : selected;
    if (v) q.set("prikaz", v);
    if (k) q.set("kategorija", k);
    for (const [key, value] of Object.entries(p)) {
      if (key !== "prikaz" && key !== "kategorija" && value != null && value !== "" && !(key === "strana" && value === 1)) q.set(key, String(value));
    }
    const s = q.toString();
    return `/fiba${s ? `?${s}` : ""}`;
  };

  return (
    <FilterNavProvider>
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-3">
          <FilterSegments>
            {VIEWS.map((v) => (
              <FilterSegment key={v.label} href={href({ prikaz: v.key, kategorija: v.key || sp.kategorija ? selected : null, sezona: v.key && sp.sezona ? season : null })} active={view === v.key}>
                {v.label}
              </FilterSegment>
            ))}
          </FilterSegments>
          <FilterSegments>
            {!view && (
              <FilterSegment href={href({ kategorija: null })} active={!selected}>
                Sve
              </FilterSegment>
            )}
            {categories.map((c) => (
              <FilterSegment key={c.key} href={href({ kategorija: c.key })} active={selected === c.key}>
                {c.label}
              </FilterSegment>
            ))}
          </FilterSegments>
          {view && seasons.length > 1 && (
            <FilterSegments>
              {seasons.map((s) => (
                <FilterSegment key={s} href={href({ sezona: s === seasons[0] ? null : s })} active={season === s}>
                  Sezona {s}
                </FilterSegment>
              ))}
            </FilterSegments>
          )}
        </div>

        <FilterContent fallback={<ContentSkeleton view={view} />}>
          {!view ? (
            <Games all={all} selected={selected} sp={sp} href={href} />
          ) : !selected || !season ? (
            <Empty icon={<Trophy />}>Još nema utakmica.</Empty>
          ) : view === "tabela" ? (
            <Table all={all.filter((g) => seasonOf(g.starts_at) === season)} category={selected} season={season} />
          ) : (
            <Stats view={view} category={selected} season={season} all={all.filter((g) => seasonOf(g.starts_at) === season)} sp={sp} href={(p) => href({ sezona: sp.sezona ? season : null, ...p })} />
          )}
        </FilterContent>
      </div>
    </FilterNavProvider>
  );
}

type Games = Awaited<ReturnType<typeof getFibaGames>>;
type Href = (p: Record<string, string | number | null | undefined>) => string;

const time = (g: FibaGameRow) => (g.starts_at ? Date.parse(g.starts_at) : 0);
const stateOf = (g: FibaGameRow) => feedState(g.status, g.live, g.starts_at);

/** Grupisanje po danu (sarajevsko vrijeme), redom kojim su utakmice date */
function byDay<T extends FibaGameRow>(games: T[]) {
  const days = new Map<string, T[]>();
  for (const g of games) {
    const day = g.starts_at ? dayKey(g.starts_at) : "";
    days.set(day, [...(days.get(day) ?? []), g]);
  }
  return [...days];
}

async function Games({ all, selected, sp, href }: { all: Games; selected: string | null; sp: Record<string, string | string[] | undefined>; href: Href }) {
  const [user, competitions, teamGames] = await Promise.all([getCurrentUser(), getFibaCompetitions(), getFibaTeamGames()]);
  const games = selected ? all.filter((g) => g.category === selected) : all;
  const live = games.filter((g) => stateOf(g) === "live");
  const scheduled = games.filter((g) => stateOf(g) === "scheduled").sort((a, b) => time(a) - time(b));
  const finished = games.filter((g) => stateOf(g) === "finished").sort((a, b) => time(b) - time(a));

  const pages = paginateDays(byDay(finished));
  const page = pageParam(sp.strana, pages.length);

  const row = (g: Games[number], badge?: React.ReactNode) => {
    const [home, away] = teamGames.get(g.id) ?? [];
    const periods = home && away ? home.periods.map((h, i) => ({ period: i + 1, home_points: h, away_points: away.periods[i] ?? 0 })) : undefined;
    return (
      <li key={g.id}>
        <Link href={`/fiba/${g.id}`} className="-mx-4 flex px-4 py-3.5 transition-colors hover:bg-panel-2 sm:-mx-6 sm:px-6">
          <MatchLine
            match={fibaSummary(g, !selected)}
            hideDate={!g.starts_at}
            showScore
            periods={periods}
            badge={badge}
            meta={g.match && <span className="text-fg-muted">{matchNo(g.match.number)}, {g.match.competition?.short_name ?? g.match.competition?.name}</span>}
          />
        </Link>
      </li>
    );
  };

  const days = (list: [string, Games][]) =>
    list.map(([day, items]) => (
      <div key={day} className="flex flex-col gap-2">
        <h3 className="text-[14px] font-semibold text-fg-muted">{day ? formatDayHeading(day) : "Bez termina"}</h3>
        <Rows>{items.map((g) => row(g))}</Rows>
      </div>
    ));

  return (
    <div className="flex flex-col gap-10">
      {/* Utakmica uživo: lista se osvježava sama (FIBA kešira 30 s) */}
      {live.length > 0 && <AutoRefresh seconds={20} />}
      {user.role === "admin" && <AddFibaGame competitions={competitions} />}
      {games.length === 0 && (
        <Empty icon={<Radio />}>Još nema utakmica. Spisak se puni sam čim FIBA objavi utakmice takmičenja; admin može dodati utakmicu FIBA linkom.</Empty>
      )}
      {live.length > 0 && (
        <section>
          <SectionTitle count={live.length}>Uživo</SectionTitle>
          <Rows>{live.map((g) => row(g, <Status tone="crest" pulse>Uživo</Status>))}</Rows>
        </section>
      )}
      {scheduled.length > 0 && (
        <section>
          <SectionTitle count={scheduled.length}>Raspored</SectionTitle>
          <div className="flex flex-col gap-6">{days(byDay(scheduled))}</div>
        </section>
      )}
      {finished.length > 0 && (
        <section className="flex flex-col gap-6">
          <SectionTitle count={finished.length}>Rezultati</SectionTitle>
          <div className="-mt-3 flex flex-col gap-6">{days(pages[page - 1] ?? [])}</div>
          <Pager pages={pages.map((p) => { const dated = p.filter(([d]) => d); return dated.length ? pageRange(dated) : null; })} page={page} href={(n) => href({ strana: n })} label="Stranice rezultata" />
        </section>
      )}
    </div>
  );
}

/** Logo po nazivu ekipe iz utakmica kategorije */
function logosOf(games: Games) {
  const logos: Record<string, string | null> = {};
  for (const g of games) {
    logos[g.home_name] ??= g.home_logo;
    logos[g.away_name] ??= g.away_logo;
  }
  return logos;
}

function Table({ all, category, season }: { all: Games; category: string; season: string }) {
  const games = all.filter((g) => g.category === category);
  const groups = fibaStandings(games.map((g) => ({ ...g, finished: stateOf(g) === "finished" })));
  const logos = logosOf(games);
  if (groups.length === 0) return <Empty icon={<Trophy />}>Još nema odigranih utakmica u ovoj kategoriji.</Empty>;
  return (
    <div className="flex flex-col gap-8">
      {groups.map((rows, i) => (
        <section key={i}>
          <SectionTitle count={rows.length}>{groups.length > 1 ? `Grupa ${i + 1}` : `${fibaCategoryLabel(category)}, ${season}`}</SectionTitle>
          <FibaStandings rows={rows} category={category} season={season} logos={logos} />
        </section>
      ))}
      <p className="text-[12px] leading-relaxed text-fg-faint">
        Pobjeda 2 boda, poraz 1. Kod istog broja bodova odlučuju međusobne utakmice (FIBA, Dodatak D). Grupe su ekipe koje igraju jedna protiv druge. Tabela je iz utakmica na FIBA LiveStats.
      </p>
    </div>
  );
}

async function Stats({ view, category, season, all, sp, href }: { view: "statistika" | "igraci"; category: string; season: string; all: Games; sp: Record<string, string | string[] | undefined>; href: Href }) {
  const [rows, teamGames] = await Promise.all([getFibaSeason(category, season), getFibaTeamGames()]);
  const players = rows.map(seasonPlayer);
  if (players.length === 0) return <Empty icon={<BarChart3 />}>Statistika se pojavi poslije prve završene utakmice u kategoriji.</Empty>;
  if (view === "igraci") return <PlayersTable players={players} category={category} sp={sp} href={href} />;

  const ids = new Set(all.filter((g) => g.category === category).map((g) => g.id));
  const lines = [...teamGames.values()].flat().filter((t) => ids.has(t.game_id));
  return (
    <div className="flex flex-col gap-10">
      <Leaders players={players} category={category} allHref={href({ prikaz: "igraci" })} />
      <TeamStatsTable teams={teamAverages(lines, teamGames, logosOf(all))} category={category} season={season} />
    </div>
  );
}

function ContentSkeleton({ view }: { view: View }) {
  if (view === "tabela") return <StandingsSkeleton />;
  if (view) {
    return (
      <Skeleton className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {times(6, (i) => <Bone key={i} className="h-56 rounded-lg" />)}
      </Skeleton>
    );
  }
  return (
    <section>
      <SectionTitleSkeleton count />
      <MatchRowsSkeleton score />
    </section>
  );
}

function FibaSkeleton() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <SegmentsSkeleton widths={["w-20", "w-14", "w-20", "w-14"]} />
        <SegmentsSkeleton widths={["w-10", "w-24", "w-24", "w-16", "w-16", "w-16"]} />
      </div>
      <ContentSkeleton view={undefined} />
    </div>
  );
}


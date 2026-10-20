import { Suspense } from "react";
import Link from "next/link";
import { Radio } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getFibaCompetitions, getFibaGames, type FibaGameRow } from "@/lib/data/fiba";
import { FIBA_CATEGORIES, feedState, fibaCategoryLabel } from "@/lib/fiba";
import { matchNo } from "@/lib/format";
import { AutoRefresh } from "@/components/auto-refresh";
import { MatchLine, type MatchSummary } from "@/components/match-line";
import { MatchRowsSkeleton, SectionTitleSkeleton, SegmentsSkeleton } from "@/components/skeleton";
import { FilterContent, FilterNavProvider, FilterSegment, FilterSegments } from "@/components/filter-nav";
import { Empty, PageHeader, Rows, SectionTitle, Status } from "@/components/ui";
import { AddFibaGame } from "./add-game";

export const metadata = { title: "FIBA uživo — KSKS" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default function FibaPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <>
      <PageHeader icon={<Radio />} title="FIBA uživo" subtitle="Premijer liga BiH, A1 liga i omladinska liga KS na FIBA LiveStats: rezultat uživo, box score i statistika igrača." />
      <Suspense fallback={<FibaSkeleton />}>
        <FibaGames searchParams={searchParams} />
      </Suspense>
    </>
  );
}

/** FIBA utakmica kao naša u listi (MatchLine) */
function fibaSummary(g: FibaGameRow): MatchSummary {
  return {
    starts_at: g.starts_at ?? "",
    round: null,
    home_score: g.home_score,
    away_score: g.away_score,
    competition: { name: fibaCategoryLabel(g.category), short_name: null },
    home: { name: g.home_name, club: { logo_url: g.home_logo } },
    away: { name: g.away_name, club: { logo_url: g.away_logo } },
    hall: null,
  };
}

async function FibaGames({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const [user, competitions, all] = await Promise.all([getCurrentUser(), getFibaCompetitions(), getFibaGames()]);
  const categories = FIBA_CATEGORIES.filter((c) => all.some((g) => g.category === c.key));
  const selected = categories.find((c) => c.key === sp.kategorija)?.key ?? null;
  const games = selected ? all.filter((g) => g.category === selected) : all;

  const time = (g: FibaGameRow) => (g.starts_at ? Date.parse(g.starts_at) : 0);
  const state = (g: FibaGameRow) => feedState(g.status, g.live, g.starts_at);
  const live = games.filter((g) => state(g) === "live");
  const scheduled = games.filter((g) => state(g) === "scheduled").sort((a, b) => time(a) - time(b));
  const finished = games.filter((g) => state(g) === "finished").sort((a, b) => time(b) - time(a));

  const list = (items: (typeof games)[number][], badge?: React.ReactNode) => (
    <Rows>
      {items.map((g) => (
        <li key={g.id}>
          <Link href={`/fiba/${g.id}`} className="-mx-4 flex px-4 py-3.5 transition-colors hover:bg-panel-2 sm:-mx-6 sm:px-6">
            <MatchLine
              match={fibaSummary(g)}
              hideDate={!g.starts_at}
              showScore
              badge={badge}
              meta={g.match && <span className="text-fg-muted">{matchNo(g.match.number)}, {g.match.competition?.short_name ?? g.match.competition?.name}</span>}
            />
          </Link>
        </li>
      ))}
    </Rows>
  );

  return (
    <FilterNavProvider>
      {/* Utakmica uživo: lista se osvježava sama (FIBA kešira 30 s) */}
      {live.length > 0 && <AutoRefresh seconds={20} />}
      <div className="flex flex-col gap-10">
        <FilterSegments>
          <FilterSegment href="/fiba" active={!selected}>
            Sve
          </FilterSegment>
          {categories.map((c) => (
            <FilterSegment key={c.key} href={`/fiba?kategorija=${c.key}`} active={selected === c.key}>
              {c.label}
            </FilterSegment>
          ))}
        </FilterSegments>

        <FilterContent fallback={<FibaContentSkeleton />}>
          <div className="flex flex-col gap-10">
            {user.role === "admin" && <AddFibaGame competitions={competitions} />}
            {games.length === 0 && (
              <Empty icon={<Radio />}>
                Još nema utakmica. Spisak se puni sam čim FIBA objavi utakmice takmičenja; admin može dodati utakmicu FIBA linkom.
              </Empty>
            )}
            {live.length > 0 && (
              <section>
                <SectionTitle count={live.length}>Uživo</SectionTitle>
                {list(live, <Status tone="crest" pulse>Uživo</Status>)}
              </section>
            )}
            {scheduled.length > 0 && (
              <section>
                <SectionTitle count={scheduled.length}>Raspored</SectionTitle>
                {list(scheduled)}
              </section>
            )}
            {finished.length > 0 && (
              <section>
                <SectionTitle count={finished.length}>Rezultati</SectionTitle>
                {list(finished)}
              </section>
            )}
          </div>
        </FilterContent>
      </div>
    </FilterNavProvider>
  );
}

function FibaContentSkeleton() {
  return (
    <section>
      <SectionTitleSkeleton count />
      <MatchRowsSkeleton />
    </section>
  );
}

function FibaSkeleton() {
  return (
    <div className="flex flex-col gap-10">
      <SegmentsSkeleton widths={["w-10", "w-16", "w-16", "w-16", "w-20", "w-24"]} />
      <FibaContentSkeleton />
    </div>
  );
}

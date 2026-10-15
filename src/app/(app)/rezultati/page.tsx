import { Suspense } from "react";
import Link from "next/link";
import { ChevronDown, FileText, Trophy } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getCurrentCompetitions, getResults } from "@/lib/data/results";
import { MATCH_STATUS_LABEL } from "@/lib/format";
import { MatchLine } from "@/components/match-line";
import { CompetitionLogo } from "@/components/competition-logo";
import { Bone, MatchRowsSkeleton, SectionTitleSkeleton, SegmentsSkeleton, Skeleton, StandingsSkeleton, Text, times } from "@/components/skeleton";
import { FilterContent, FilterNavProvider, FilterSegment, FilterSegments } from "@/components/filter-nav";
import { buttonClass, Empty, PageHeader, Rows, SectionTitle, Status } from "@/components/ui";
import { StandingsTable } from "./standings-table";

export const metadata = { title: "Rezultati — KSKS" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default function ResultsPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <>
      <PageHeader icon={<Trophy />} title="Rezultati" subtitle="Tabela i rezultati po kolima, uživo dok komesar unosi četvrtine." />
      <Suspense fallback={<ResultsSkeleton />}>
        <Results searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Results({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const [competitions, user] = await Promise.all([getCurrentCompetitions(), getCurrentUser()]);
  if (competitions.length === 0) return <Empty icon={<Trophy />}>Nema takmičenja u ovoj sezoni.</Empty>;

  const selectedId =
    typeof sp.takmicenje === "string" && competitions.some((c) => c.id === sp.takmicenje)
      ? sp.takmicenje
      : competitions[0].id;
  const data = await getResults(selectedId);

  return (
    <FilterNavProvider>
      <div className="flex flex-col gap-10">
        <FilterSegments>
          {competitions.map((c) => (
            <FilterSegment key={c.id} href={`/rezultati?takmicenje=${c.id}`} active={c.id === selectedId}>
              {c.short_name ?? c.name}
            </FilterSegment>
          ))}
        </FilterSegments>

        <FilterContent fallback={<ResultsContentSkeleton />}>
          {!data ? (
            <Empty icon={<Trophy />}>Takmičenje nije pronađeno.</Empty>
          ) : (
            <>
              <section>
                <h2 className="flex items-center gap-3 font-display text-[22px] font-semibold leading-tight tracking-[-0.03em] sm:text-[24px]"><CompetitionLogo name={data.competition.name} category={data.competition.category} />{data.competition.name}</h2>
                {data.competition.parent && data.competition.carry_over_h2h && (
                  <p className="mt-1 text-[14px] text-fg-muted">
                    Prenose se rezultati međusobnih utakmica iz takmičenja {data.competition.parent.name}.
                  </p>
                )}
                <div className="mt-5">
                  {data.standings.length === 0 ? (
                    <Empty icon={<Trophy />}>Ekipe još nisu upisane.</Empty>
                  ) : (
                    <StandingsTable rows={data.standings} />
                  )}
                </div>
              </section>

              {data.rounds.length === 0 ? (
                <Empty icon={<Trophy />}>Raspored još nije objavljen.</Empty>
              ) : (
                data.rounds.map(([round, matches]) => (
                  <section key={round ?? "ostalo"}>
                    <SectionTitle
                      count={matches.length}
                      action={
                        user.role === "admin" && round ? (
                          <Link href={`/bilten/kolo?kategorija=${data.competition.category}&kolo=${round}`} className={buttonClass("secondary", "h-9 text-[13px]")}>
                            <FileText className="size-4" /> Bilten kola
                          </Link>
                        ) : undefined
                      }
                    >
                      {round ? `${round}. kolo` : "Ostale utakmice"}
                    </SectionTitle>
                    <Rows>
                      {matches.map((m) => (
                        <ResultRow key={m.id} match={m} />
                      ))}
                    </Rows>
                  </section>
                ))
              )}
            </>
          )}
        </FilterContent>
      </div>
    </FilterNavProvider>
  );
}

type ResultMatch = NonNullable<Awaited<ReturnType<typeof getResults>>>["rounds"][number][1][number];

function ResultRow({ match: m }: { match: ResultMatch }) {
  const hasScore = m.home_score != null && (m.status === "finished" || m.status === "live");
  const periods = [...m.match_periods].sort((a, b) => a.period - b.period);

  const meta =
    m.status === "live" ? (
      <Status tone="crest" pulse>
        Uživo
      </Status>
    ) : m.status === "postponed" || m.status === "cancelled" ? (
      <Status tone="orange">{MATCH_STATUS_LABEL[m.status]}</Status>
    ) : undefined;

  // Takmičenje i kolo su već u naslovu sekcije
  const line = (
    <MatchLine
      match={{ ...m, competition: null, round: null, home_score: hasScore ? m.home_score : null }}
      showScore={hasScore}
      meta={meta}
      aside={periods.length > 0 ? <ChevronDown className="size-5 text-fg-faint transition-transform group-open:rotate-180" /> : undefined}
    />
  );

  if (periods.length === 0) return <li className="py-4">{line}</li>;

  return (
    <li>
      <details className="group">
        <summary className="-mx-4 cursor-pointer list-none px-4 py-4 transition-colors hover:bg-panel-2 sm:-mx-6 sm:px-6 [&::-webkit-details-marker]:hidden">{line}</summary>
        <div className="pb-4 sm:pl-[72px]">
          <div className="flex gap-1.5 overflow-x-auto [scrollbar-width:none]">
            {periods.map((p) => (
              <div key={p.period} className="flex min-w-[64px] flex-col items-center rounded-md bg-panel px-2.5 py-2">
                <span className="text-[11px] font-semibold text-fg-faint">{p.period > 4 ? `${p.period - 4}. prod.` : `${p.period}. četv.`}</span>
                <span className="scoreboard whitespace-nowrap text-[20px] font-semibold leading-tight">
                  {p.home_points}
                  <span className="text-fg-faint">:</span>
                  {p.away_points}
                </span>
              </div>
            ))}
          </div>
        </div>
      </details>
    </li>
  );
}

/** Kao stranica rezultata: takmičenja, naziv, tabela, pa kola s utakmicama */
function ResultsSkeleton() {
  return (
    <Skeleton className="flex flex-col gap-10">
      <SegmentsSkeleton widths={["w-16", "w-20", "w-14", "w-20", "w-16"]} />
      <ResultsContentSkeleton />
    </Skeleton>
  );
}

/** Naziv takmičenja, tabela i kola (i dok se učitava drugo takmičenje) */
function ResultsContentSkeleton() {
  return (
    <Skeleton className="flex flex-col gap-10">
      <section>
        <div className="flex items-center gap-3 font-display text-[22px] font-semibold leading-tight sm:text-[24px]">
          <Bone className="h-8 w-12 shrink-0" />
          <Text w="w-56" />
        </div>
        <div className="mt-5">
          <StandingsSkeleton />
        </div>
      </section>
      {times(2, (i) => (
        <section key={i}>
          <SectionTitleSkeleton w="w-20" count />
          <MatchRowsSkeleton count={4} score />
        </section>
      ))}
    </Skeleton>
  );
}

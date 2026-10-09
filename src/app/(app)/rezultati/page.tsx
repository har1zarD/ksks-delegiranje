import { Suspense } from "react";
import { ChevronDown } from "lucide-react";
import { getCurrentCompetitions, getResults } from "@/lib/data/results";
import { MATCH_STATUS_LABEL } from "@/lib/format";
import { MatchLine } from "@/components/match-line";
import { Empty, Loading, PageHeader, Rows, SectionTitle, Segment, Segments, Status } from "@/components/ui";
import { StandingsTable } from "./standings-table";

export const metadata = { title: "Rezultati — KSKS" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default function ResultsPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <>
      <PageHeader title="Rezultati" subtitle="Tabela i rezultati po kolima, uživo dok komesar unosi četvrtine." />
      <Suspense fallback={<Loading />}>
        <Results searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Results({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const competitions = await getCurrentCompetitions();
  if (competitions.length === 0) return <Empty>Nema takmičenja u ovoj sezoni.</Empty>;

  const selectedId =
    typeof sp.takmicenje === "string" && competitions.some((c) => c.id === sp.takmicenje)
      ? sp.takmicenje
      : competitions[0].id;
  const data = await getResults(selectedId);

  return (
    <div className="flex flex-col gap-10">
      <Segments>
        {competitions.map((c) => (
          <Segment key={c.id} href={`/rezultati?takmicenje=${c.id}`} active={c.id === selectedId}>
            {c.short_name ?? c.name}
          </Segment>
        ))}
      </Segments>

      {!data ? (
        <Empty>Takmičenje nije pronađeno.</Empty>
      ) : (
        <>
          <section>
            <h2 className="font-display text-[22px] font-semibold leading-tight tracking-[-0.03em] sm:text-[24px]">{data.competition.name}</h2>
            {data.competition.parent && data.competition.carry_over_h2h && (
              <p className="mt-1 text-[14px] text-fg-muted">
                Prenose se rezultati međusobnih utakmica iz takmičenja {data.competition.parent.name}.
              </p>
            )}
            <div className="mt-5">
              {data.standings.length === 0 ? (
                <Empty>Ekipe još nisu upisane.</Empty>
              ) : (
                <StandingsTable rows={data.standings} />
              )}
            </div>
          </section>

          {data.rounds.length === 0 ? (
            <Empty>Raspored još nije objavljen.</Empty>
          ) : (
            data.rounds.map(([round, matches]) => (
              <section key={round ?? "ostalo"}>
                <SectionTitle count={matches.length}>{round ? `${round}. kolo` : "Ostale utakmice"}</SectionTitle>
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
    </div>
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
        <summary className="-mx-3 px-3 rounded-md cursor-pointer list-none py-4 hover:bg-panel-2 [&::-webkit-details-marker]:hidden">{line}</summary>
        <div className="pb-4 sm:pl-[92px]">
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

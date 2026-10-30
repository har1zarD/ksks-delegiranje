import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { ChevronRight, CalendarDays, CheckCircle2 } from "lucide-react";
import { getCrews, getMyAssignments } from "@/lib/data/official";
import { positionName } from "@/lib/format";
import { MatchLine } from "@/components/match-line";
import { CrewList, CrewListSkeleton } from "@/components/crew-list";
import { Bone, MatchLineSkeleton, Skeleton, StatusSkeleton, Text, times } from "@/components/skeleton";
import { buttonClass, Empty, PageHeader, SectionTitle, Status } from "@/components/ui";

export const metadata = { title: "Moje utakmice — KSKS" };

export default function MyMatchesPage() {
  return (
    <>
      <PageHeader icon={<CalendarDays />} title="Moje utakmice" subtitle="Prihvaćene utakmice, ekipa službenih lica i rezultati." />
      <Suspense fallback={<MyMatchesSkeleton />}>
        <MyMatches />
      </Suspense>
    </>
  );
}

async function MyMatches() {
  const mine = await getMyAssignments();
  const upcoming = mine.upcoming.filter((a) => a.status === "accepted");
  const past = mine.past.filter((a) => a.status === "accepted");
  const crews = await getCrews([...upcoming, ...past].map((a) => a.match.id));
  // Komesar ne sudi: njemu su to završene utakmice
  const pastTitle = past.every((a) => a.position === "commissioner") ? "Završene utakmice" : "Odsuđene";

  if (upcoming.length + past.length === 0)
    return (
      <Empty icon={<Image src="/brand/calendar-icon.webp" alt="" width={40} height={40} className="size-10" />} title="Tvoje utakmice" action={<Link href="/nominacije" className={buttonClass("secondary")}>Otvori nominacije</Link>}>
        Još nemaš prihvaćenih utakmica.
      </Empty>
    );

  return (
    <div className="flex flex-col gap-10">
      <section>
        <SectionTitle icon={<CalendarDays />} count={upcoming.length}>Predstoje</SectionTitle>
        {upcoming.length === 0 ? (
          <Empty icon={<Image src="/brand/calendar-icon.webp" alt="" width={40} height={40} className="size-10" />}>Nema zakazanih utakmica.</Empty>
        ) : (
          <ul className="flex flex-col gap-3">
            {upcoming.map((a) => (
              <li key={a.id} className="overflow-hidden rounded-lg border border-line bg-panel shadow-panel px-4 sm:px-6">
                <Link href={`/utakmice/${a.match.id}`} className="-mx-4 flex items-center gap-3 px-4 py-4 transition-colors hover:bg-panel-2 sm:-mx-6 sm:px-6 sm:py-5">
                  <MatchLine
                    match={a.match}
                    periods={a.match.status === "live" ? a.match.periods : undefined}
                    badge={a.match.status === "live" ? <Status tone="crest" pulse>Uživo</Status> : undefined}
                    meta={<Status tone="mint">{positionName(a.position, a.match.digital_scoresheet)}</Status>}
                    aside={<ChevronRight className="size-5 text-fg-faint" />}
                  />
                </Link>
                <CrewList collapsible match={a.match} crew={crews.get(a.match.id) ?? []} mine={a.position} />
              </li>
            ))}
          </ul>
        )}
      </section>
      {past.length > 0 && (
        <section>
          <SectionTitle icon={<CheckCircle2 />} count={past.length}>{pastTitle}</SectionTitle>
          <ul className="flex flex-col gap-3">
            {past.map((a) => (
              <li key={a.id} className="overflow-hidden rounded-lg border border-line bg-panel shadow-panel px-4 sm:px-6">
                <Link href={`/utakmice/${a.match.id}`} className="-mx-4 flex px-4 py-4 transition-colors hover:bg-panel-2 sm:-mx-6 sm:px-6 sm:py-5">
                  <MatchLine
                    match={a.match}
                    showScore
                    periods={a.match.periods.length > 0 ? a.match.periods : undefined}
                  />
                </Link>
                <CrewList collapsible match={a.match} crew={crews.get(a.match.id) ?? []} mine={a.position} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

/** Kao "Predstoje" (kartica utakmice s ekipom službenih lica) i "Odsuđene" */
function MyMatchesSkeleton() {
  return (
    <Skeleton className="flex flex-col gap-10">
      <section>
        <SectionTitle icon={<CalendarDays />}>Predstoje<CountSkeleton /></SectionTitle>
        <ul className="flex flex-col gap-3">
          {times(2, (i) => (
            <li key={i} className="overflow-hidden rounded-lg border border-line bg-panel px-4 shadow-panel sm:px-6">
              <div className="flex items-center gap-3 py-4 sm:py-5">
                <MatchLineSkeleton i={i} meta={<StatusSkeleton w="w-24" />} aside={<Bone className="size-5" />} />
              </div>
              <CrewListSkeleton collapsible />
            </li>
          ))}
        </ul>
      </section>
      <section>
        <SectionTitle icon={<CheckCircle2 />}>Odsuđene<CountSkeleton /></SectionTitle>
        <ul className="flex flex-col gap-3">
          {times(2, (i) => (
            <li key={i} className="overflow-hidden rounded-lg border border-line bg-panel px-4 shadow-panel sm:px-6">
              <div className="flex py-4 sm:py-5">
                <MatchLineSkeleton i={i} score meta={<Text w="w-24" />} />
              </div>
              <CrewListSkeleton collapsible />
            </li>
          ))}
        </ul>
      </section>
    </Skeleton>
  );
}

/** Značka s brojem uz statičan naslov sekcije (broj stiže s podacima) */
function CountSkeleton() {
  return (
    <span className="inline-flex min-w-6 shrink-0 items-center justify-center rounded-md border border-line bg-panel px-1.5 py-0.5 text-[12px]">
      <Text w="w-2" />
    </span>
  );
}

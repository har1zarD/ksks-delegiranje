import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { ChevronRight, Phone, CalendarDays, CheckCircle2 } from "lucide-react";
import { getCrews, getMyAssignments, type Crew } from "@/lib/data/official";
import { positionName, POSITION_ORDER } from "@/lib/format";
import { MatchLine } from "@/components/match-line";
import { Bone, MatchRowsSkeleton, MatchLineSkeleton, SectionTitleSkeleton, Skeleton, StatusSkeleton, Text, times } from "@/components/skeleton";
import { buttonClass, cx, Empty, PageHeader, SectionTitle, Status } from "@/components/ui";

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
  const crews = await getCrews(upcoming.map((a) => a.match.id));

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
                    meta={<Status tone="mint">{positionName(a.position, a.match.digital_scoresheet)}</Status>}
                    aside={<ChevronRight className="size-5 text-fg-faint" />}
                  />
                </Link>
                <CrewList crew={crews.get(a.match.id) ?? []} mine={a.position} />
              </li>
            ))}
          </ul>
        )}
      </section>
      {past.length > 0 && (
        <section>
          <SectionTitle icon={<CheckCircle2 />} count={past.length}>Odsuđene</SectionTitle>
          <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-panel shadow-panel [&>*]:px-4 sm:[&>*]:px-6">
            {past.map((a) => (
              <li key={a.id}>
                <Link href={`/utakmice/${a.match.id}`} className="-mx-4 flex px-4 py-4 transition-colors hover:bg-panel-2 sm:-mx-6 sm:px-6 sm:py-5">
                  <MatchLine
                    match={a.match}
                    showScore
                    meta={<span className="text-[13px] text-fg-muted">{positionName(a.position, a.match.digital_scoresheet)}</span>}
                  />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function CrewList({ crew, mine }: { crew: Crew; mine: Crew[number]["position"] }) {
  const sorted = [...crew].sort((a, b) => POSITION_ORDER.indexOf(a.position) - POSITION_ORDER.indexOf(b.position));
  if (sorted.length === 0) return null;
  return (
    // Preko cijele širine kartice; ćelije imaju svoju podlogu i razmak, a 1px razmak između njih daje liniju
    <ul className="-mx-4 grid gap-px border-t border-line bg-line sm:-mx-6 sm:grid-cols-2 sm:[&>li:last-child:nth-child(odd)]:col-span-2">
      {sorted.map((c) => {
        const me = c.position === mine;
        return (
          <li key={c.position} className="flex min-h-14 items-center gap-3 bg-panel px-4 py-2.5 sm:px-6">
            <div className="min-w-0 flex-1">
              <div className="text-[12px] font-semibold text-fg-faint">{positionName(c.position)}</div>
              <div className={cx("truncate text-[15px] font-semibold", me ? "text-brand" : "text-fg")}>
                {me ? "Ti" : c.name}
                {c.status === "pending" && <span className="ml-2 text-[12px] font-medium text-fg-faint">čeka odgovor</span>}
              </div>
            </div>
            {c.phone && !me && (
              <a
                href={`tel:${c.phone}`}
                className="grid size-11 shrink-0 place-items-center rounded-md text-brand hover:bg-panel-2"
                aria-label={`Pozovi: ${c.name}`}
                title={c.phone}
              >
                <Phone className="size-5" strokeWidth={1.9} />
              </a>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** Kao "Predstoje" (kartica utakmice s ekipom službenih lica) i "Odsuđene" */
function MyMatchesSkeleton() {
  return (
    <Skeleton className="flex flex-col gap-10">
      <section>
        <SectionTitleSkeleton w="w-28" count />
        <ul className="flex flex-col gap-3">
          {times(2, (i) => (
            <li key={i} className="overflow-hidden rounded-lg border border-line bg-panel px-4 shadow-panel sm:px-6">
              <div className="flex items-center py-4 sm:py-5">
                <MatchLineSkeleton i={i} meta={<StatusSkeleton w="w-24" />} aside={<Bone className="size-5" />} />
              </div>
              <ul className="-mx-4 grid gap-px border-t border-line bg-line sm:-mx-6 sm:grid-cols-2">
                {times(4, (j) => (
                  <li key={j} className="flex min-h-14 items-center gap-3 bg-panel px-4 py-2.5 sm:px-6">
                    <div className="min-w-0 flex-1">
                      <Text className="text-[12px] font-semibold" w="w-20" />
                      <Text className="text-[15px] font-semibold" w={j % 2 ? "w-28" : "w-36"} />
                    </div>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </section>
      <section>
        <SectionTitleSkeleton w="w-28" count />
        <MatchRowsSkeleton count={2} row="py-4 sm:py-5" score meta={<Text className="text-[13px]" w="w-24" />} />
      </section>
    </Skeleton>
  );
}

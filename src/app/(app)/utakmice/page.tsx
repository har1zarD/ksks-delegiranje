import Link from "next/link";
import { Suspense } from "react";
import { ChevronRight, Phone } from "lucide-react";
import { getCrews, getMyAssignments, type Crew } from "@/lib/data/official";
import { positionName, POSITION_ORDER } from "@/lib/format";
import { MatchLine } from "@/components/match-line";
import { buttonClass, cx, Empty, Loading, PageHeader, SectionTitle, Status } from "@/components/ui";

export const metadata = { title: "Moje utakmice — KSKS" };

export default function MyMatchesPage() {
  return (
    <>
      <PageHeader title="Moje utakmice" subtitle="Prihvaćene utakmice, ekipa službenih lica i rezultati." />
      <Suspense fallback={<Loading />}>
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
      <Empty action={<Link href="/nominacije" className={buttonClass("secondary")}>Otvori nominacije</Link>}>
        Još nemaš prihvaćenih utakmica.
      </Empty>
    );

  return (
    <div className="flex flex-col gap-10">
      <section>
        <SectionTitle count={upcoming.length}>Predstoje</SectionTitle>
        {upcoming.length === 0 ? (
          <Empty>Nema zakazanih utakmica.</Empty>
        ) : (
          <ul className="flex flex-col gap-3">
            {upcoming.map((a) => (
              <li key={a.id} className="rounded-lg border border-line bg-panel shadow-panel px-4 sm:px-5">
                <Link href={`/utakmice/${a.match.id}`} className="-mx-3 px-3 rounded-md flex items-center gap-3 py-4 hover:bg-panel-2 sm:py-5">
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
          <SectionTitle count={past.length}>Odsuđene</SectionTitle>
          <ul className="divide-y divide-line rounded-lg border border-line bg-panel shadow-panel [&>*]:px-4 sm:[&>*]:px-6">
            {past.map((a) => (
              <li key={a.id}>
                <Link href={`/utakmice/${a.match.id}`} className="-mx-3 px-3 rounded-md flex py-4 hover:bg-panel-2 sm:py-5">
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
    <ul className="grid gap-px border-t border-line bg-line sm:grid-cols-2">
      {sorted.map((c) => {
        const me = c.position === mine;
        return (
          <li key={c.position} className="flex min-h-14 items-center gap-3 py-2.5">
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

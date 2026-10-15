import Image from "next/image";
import { Clock, CheckCircle2 } from "lucide-react";
import { Suspense } from "react";
import { getCrews, getMyAssignments } from "@/lib/data/official";
import { positionName } from "@/lib/format";
import { PageIntro } from "@/components/page-intro";
import { MatchLine } from "@/components/match-line";
import { CrewList, CrewListSkeleton } from "@/components/crew-list";
import { ButtonSkeleton, MatchLineSkeleton, Skeleton, StatusSkeleton, Text, times } from "@/components/skeleton";
import { Empty, SectionTitle, Status } from "@/components/ui";
import { RespondForm } from "./respond-form";

export const metadata = { title: "Nominacije — KSKS" };

export default function NominationsPage() {
  return (
    <>
      <PageIntro eyebrow="Portal službenih lica" title="Nominacije" subtitle="Utakmice na koje te je savez delegirao." />
      <Suspense fallback={<NominationsSkeleton />}>
        <Nominations />
      </Suspense>
    </>
  );
}

async function Nominations() {
  const { upcoming: all } = await getMyAssignments();
  const pending = all.filter((a) => a.status === "pending");
  const accepted = all.filter((a) => a.status === "accepted");
  const crews = await getCrews(all.map((a) => a.match.id));

  if (all.length === 0) return <Empty title="Nema novih nominacija" icon={<Image src="/brand/nominations-icon.webp" alt="" width={40} height={40} className="size-10" />}>Kad te savez delegira, ovdje će se pojaviti utakmica i mogućnost odgovora.</Empty>;

  return (
    <div className="flex flex-col gap-10">
      {pending.length > 0 && (
        <section>
          <SectionTitle icon={<Clock />} count={pending.length}>Čeka tvoj odgovor</SectionTitle>
          <ul className="flex flex-col gap-3">
            {pending.map((a) => (
              <li key={a.id} className="overflow-hidden rounded-lg border border-line bg-panel px-4 shadow-panel sm:px-6">
                <div className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center">
                  <MatchLine match={a.match} meta={<Status tone="gold">{positionName(a.position, a.match.digital_scoresheet)}</Status>} />
                  <RespondForm id={a.id} />
                </div>
                <CrewList match={a.match} crew={crews.get(a.match.id) ?? []} mine={a.position} />
              </li>
            ))}
          </ul>
        </section>
      )}
      {accepted.length > 0 && (
        <section>
          <SectionTitle icon={<CheckCircle2 />} count={accepted.length}>Prihvaćene</SectionTitle>
          <ul className="flex flex-col gap-3">
            {accepted.map((a) => (
              <li key={a.id} className="overflow-hidden rounded-lg border border-line bg-panel px-4 shadow-panel sm:px-6">
                <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:py-5">
                  <MatchLine match={a.match} meta={<Status tone="mint">{positionName(a.position, a.match.digital_scoresheet)}</Status>} />
                  <RespondForm id={a.id} accepted />
                </div>
                <CrewList match={a.match} crew={crews.get(a.match.id) ?? []} mine={a.position} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

/** Kao lista "Čeka tvoj odgovor": utakmica, pozicija, dugmad Odbij / Prihvati i ekipa službenih lica */
function NominationsSkeleton() {
  return (
    <Skeleton>
      <SectionTitle icon={<Clock />}>
        Čeka tvoj odgovor
        <span className="inline-flex min-w-6 shrink-0 items-center justify-center rounded-md border border-line bg-panel px-1.5 py-0.5 text-[12px]">
          <Text w="w-2" />
        </span>
      </SectionTitle>
      <ul className="flex flex-col gap-3">
        {times(2, (i) => (
          <li key={i} className="overflow-hidden rounded-lg border border-line bg-panel px-4 shadow-panel sm:px-6">
            <div className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center">
              <MatchLineSkeleton i={i} meta={<StatusSkeleton w="w-24" />} />
              <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:shrink-0">
                <ButtonSkeleton className="sm:w-18" />
                <ButtonSkeleton className="sm:w-32" />
              </div>
            </div>
            <CrewListSkeleton />
          </li>
        ))}
      </ul>
    </Skeleton>
  );
}

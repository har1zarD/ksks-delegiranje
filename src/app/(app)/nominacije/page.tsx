import Image from "next/image";
import { Clock, CheckCircle2 } from "lucide-react";
import { Suspense } from "react";
import { getMyAssignments } from "@/lib/data/official";
import { positionName } from "@/lib/format";
import { PageIntro } from "@/components/page-intro";
import { MatchLine } from "@/components/match-line";
import { ButtonSkeleton, MatchLineSkeleton, SectionTitleSkeleton, Skeleton, StatusSkeleton, times } from "@/components/skeleton";
import { Empty, ROWS, SectionTitle, Status } from "@/components/ui";
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

  if (all.length === 0) return <Empty title="Nema novih nominacija" icon={<Image src="/brand/nominations-icon.webp" alt="" width={40} height={40} className="size-10" />}>Kad te savez delegira, ovdje će se pojaviti utakmica i mogućnost odgovora.</Empty>;

  return (
    <div className="flex flex-col gap-10">
      {pending.length > 0 && (
        <section>
          <SectionTitle icon={<Clock />} count={pending.length}>Čeka tvoj odgovor</SectionTitle>
          <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-panel shadow-panel [&>*]:px-4 sm:[&>*]:px-6">
            {pending.map((a) => (
              <li
                key={a.id}
                className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center"
              >
                <MatchLine match={a.match} meta={<Status tone="gold">{positionName(a.position, a.match.digital_scoresheet)}</Status>} />
                <RespondForm id={a.id} />
              </li>
            ))}
          </ul>
        </section>
      )}
      {accepted.length > 0 && (
        <section>
          <SectionTitle icon={<CheckCircle2 />} count={accepted.length}>Prihvaćene</SectionTitle>
          <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-panel shadow-panel [&>*]:px-4 sm:[&>*]:px-6">
            {accepted.map((a) => (
              <li key={a.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:py-5">
                <MatchLine match={a.match} meta={<Status tone="mint">{positionName(a.position, a.match.digital_scoresheet)}</Status>} />
                <RespondForm id={a.id} accepted />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

/** Kao lista "Čeka tvoj odgovor": utakmica, pozicija i dugmad Odbij / Prihvati */
function NominationsSkeleton() {
  return (
    <Skeleton>
      <SectionTitleSkeleton count />
      <ul className={ROWS}>
        {times(3, (i) => (
          <li key={i} className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center">
            <MatchLineSkeleton i={i} meta={<StatusSkeleton w="w-24" />} />
            <div className="grid grid-cols-2 gap-2 sm:flex">
              <ButtonSkeleton className="sm:w-20" />
              <ButtonSkeleton className="sm:w-32" />
            </div>
          </li>
        ))}
      </ul>
    </Skeleton>
  );
}

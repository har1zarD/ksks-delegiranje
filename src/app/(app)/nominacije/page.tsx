import { Suspense } from "react";
import { getMyAssignments } from "@/lib/data/official";
import { positionName } from "@/lib/format";
import { MatchLine } from "@/components/match-line";
import { Empty, Loading, PageHeader, SectionTitle, Status } from "@/components/ui";
import { RespondForm } from "./respond-form";

export const metadata = { title: "Nominacije — KSKS" };

export default function NominationsPage() {
  return (
    <>
      <PageHeader title="Nominacije" subtitle="Utakmice na koje te je savez delegirao." />
      <Suspense fallback={<Loading />}>
        <Nominations />
      </Suspense>
    </>
  );
}

async function Nominations() {
  const { upcoming: all } = await getMyAssignments();
  const pending = all.filter((a) => a.status === "pending");
  const accepted = all.filter((a) => a.status === "accepted");

  if (all.length === 0) return <Empty>Nemaš novih nominacija. Kad te savez delegira, utakmica se pojavi ovdje.</Empty>;

  return (
    <div className="flex flex-col gap-10">
      {pending.length > 0 && (
        <section>
          <SectionTitle count={pending.length}>Čeka tvoj odgovor</SectionTitle>
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
          <SectionTitle count={accepted.length}>Prihvaćene</SectionTitle>
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

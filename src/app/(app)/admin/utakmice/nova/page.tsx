import Link from "next/link";
import { Suspense } from "react";
import { ChevronLeft, CalendarPlus } from "lucide-react";
import { getCompetitions, getHalls, getNextMatchNumbers } from "@/lib/data/admin";
import { PageHeader, Panel } from "@/components/ui";
import { MatchForm, MatchFormSkeleton } from "../match-form";

export const metadata = { title: "Nova utakmica — KSKS" };

export default function NewMatchPage() {
  return (
    <>
      <Link href="/admin/utakmice" className="mb-4 inline-flex items-center gap-1 text-[15px] font-semibold text-fg-muted hover:text-fg">
        <ChevronLeft className="size-5" />
        Utakmice
      </Link>
      <PageHeader
        icon={<CalendarPlus />} title="Nova utakmica"
        subtitle="Broj utakmice, termin, dvorana i sastav ekipe. Sastav dolazi iz pravila takmičenja i može se promijeniti."
      />
      <Panel className="py-4 sm:py-6">
        <Suspense fallback={<MatchFormSkeleton />}>
          <NewMatch />
        </Suspense>
      </Panel>
    </>
  );
}

async function NewMatch() {
  const [competitions, halls, nextNumbers] = await Promise.all([getCompetitions(), getHalls(), getNextMatchNumbers()]);
  return <MatchForm competitions={competitions} halls={halls} nextNumbers={nextNumbers} />;
}

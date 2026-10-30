import { Suspense } from "react";
import { Plus, CalendarDays, FileText } from "lucide-react";
import { ButtonLink, PageHeader } from "@/components/ui";
import { MatchSchedule, ScheduleSkeleton, type ScheduleParams } from "./schedule";

export const metadata = { title: "Utakmice — KSKS" };

type SearchParams = Promise<ScheduleParams>;

export default function AdminMatchesPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <>
      <PageHeader icon={<CalendarDays />} title="Utakmice" subtitle="Predstojeće i odigrane utakmice po danima. Aktiviranje je na Pregledu.">
        <ButtonLink href="/admin/utakmice/satnice" variant="secondary">
          <FileText className="size-4" aria-hidden="true" />
          Satnice (PDF)
        </ButtonLink>
        <ButtonLink href="/admin/utakmice/nova">
          <Plus className="size-5" strokeWidth={2.2} />
          Nova utakmica
        </ButtonLink>
      </PageHeader>
      <Suspense fallback={<ScheduleSkeleton />}>
        <Matches searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Matches({ searchParams }: { searchParams: SearchParams }) {
  return <MatchSchedule sp={await searchParams} mode="browse" basePath="/admin/utakmice" />;
}

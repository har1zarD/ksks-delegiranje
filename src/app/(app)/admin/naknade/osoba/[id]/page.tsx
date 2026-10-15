import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { connection } from "next/server";
import { ChevronLeft, UserRound, Wallet } from "lucide-react";
import { getPeople } from "@/lib/data/admin";
import { getPersonPayroll, resolvePeriod } from "@/lib/data/finance";
import { formatMonth, matchesLabel, parsePayrollFilter } from "@/lib/finance";
import {
  PageHeaderSkeleton,
  PayrollFiltersSkeleton,
  PayrollItemsSkeleton,
  PayrollSummarySkeleton,
  PeriodPickerSkeleton,
  Skeleton,
} from "@/components/skeleton";
import { CARD, cx, Empty, PageHeader } from "@/components/ui";
import { MarkAllPaid } from "../../_components/paid-toggle";
import { describeFilter, PayrollFilters, PayrollItems, PayrollSummary, PeriodPicker } from "../../_components/payroll-view";

export const metadata = { title: "Naknade osobe — KSKS" };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

const ROLE: Record<string, string> = { admin: "Savez", official: "Službeno lice", commissioner: "Komesar" };

export default function PersonPayPage(props: Props) {
  return (
    <>
      <Link href="/admin/naknade" className="mb-4 inline-flex items-center gap-1 text-[15px] font-semibold text-fg-muted hover:text-fg">
        <ChevronLeft className="size-5" />
        Naknade
      </Link>
      <Suspense fallback={<PersonPaySkeleton />}>
        <PersonPay {...props} />
      </Suspense>
    </>
  );
}

async function PersonPay({ params, searchParams }: Props) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  await connection(); // "tekući mjesec" se računa po zahtjevu
  const people = await getPeople();
  const profile = people.find((p) => p.id === id);
  if (!profile) notFound();

  const period = resolvePeriod(sp.mjesec);
  const filter = parsePayrollFilter(sp);
  const { person, summary } = await getPersonPayroll(id, period, filter);
  const base = `/admin/naknade/osoba/${id}`;
  const current = {
    mjesec: typeof sp.mjesec === "string" ? sp.mjesec : undefined,
    isplata: typeof sp.isplata === "string" ? sp.isplata : undefined,
    q: filter.q,
  };
  const roles = [
    ROLE[profile.role],
    profile.role === "official" && profile.is_referee && "sudija",
    profile.role === "official" && profile.is_table && "zapisnički sto",
  ].filter(Boolean);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader icon={<UserRound />} title={profile.full_name} subtitle={[roles.join(", "), profile.email, profile.phone].filter(Boolean).join(", ")} />
      <PeriodPicker period={period} basePath={base} params={current} />
      <PayrollSummary
        total={summary?.total ?? 0}
        paid={summary?.paid ?? 0}
        unpaid={summary?.unpaid ?? 0}
        note={summary ? `${matchesLabel(summary.items.length)}, ${summary.unpaidCount} neisplaćeno` : undefined}
        aside={
          summary && (
            <MarkAllPaid ids={summary.items.filter((i) => !i.paidAt).map((i) => i.assignmentId)} amount={summary.unpaid} />
          )
        }
      />
      <PayrollFilters basePath={base} params={current} groups={false} />
      {!person ? (
        <Empty icon={<Wallet />}>
          Nema angažmana{describeFilter(filter)} {period === "sve" ? "na završenim utakmicama" : `u ${formatMonth(period)}`}.
        </Empty>
      ) : (
        <div className="rounded-lg border border-line bg-panel px-4 shadow-panel sm:px-6">
          <PayrollItems person={person} editable />
        </div>
      )}
    </div>
  );
}

/** Kao stranica osobe: ime i kontakt, mjesec, zbir, filteri i stavke */
function PersonPaySkeleton() {
  return (
    <Skeleton className="flex flex-col gap-5">
      <PageHeaderSkeleton icon />
      <PeriodPickerSkeleton />
      <PayrollSummarySkeleton />
      <PayrollFiltersSkeleton groups={false} />
      <div className={cx(CARD, "px-4 sm:px-6")}>
        <PayrollItemsSkeleton />
      </div>
    </Skeleton>
  );
}

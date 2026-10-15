import { Suspense } from "react";
import { connection } from "next/server";
import { Download, Wallet } from "lucide-react";
import { getFeeRules, getPayroll, resolvePeriod } from "@/lib/data/finance";
import { formatMonth, matchesLabel, parsePayrollFilter } from "@/lib/finance";
import {
  Bone,
  PayrollFiltersSkeleton,
  PayrollSummarySkeleton,
  PeriodPickerSkeleton,
  Skeleton,
  Text,
  times,
} from "@/components/skeleton";
import { buttonClass, Empty, PageHeader, ROWS, SectionTitle } from "@/components/ui";
import { MarkAllPaid } from "./_components/paid-toggle";
import { describeFilter, PayrollFilters, PayrollSummary, PayrollTable, PeriodPicker } from "./_components/payroll-view";
import { RulesForm } from "./rules-form";

export const metadata = { title: "Naknade — KSKS" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default function FeesPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <>
      <PageHeader
        icon={<Wallet />} title="Naknade"
        subtitle="Obračun i isplata po utakmici za sudije, zapisnički sto i komesare. Ispod su cijene po takmičenju."
      />
      <div className="flex flex-col gap-14">
        <section>
          <Suspense fallback={<PayrollSkeleton />}>
            <Payroll searchParams={searchParams} />
          </Suspense>
        </section>
        <section>
          <SectionTitle>Cijene po takmičenju</SectionTitle>
          <p className="-mt-1 pb-5 text-[14px] text-fg-muted">
            Broj sudija i ljudi za stolom ovdje je podrazumijevani za nove utakmice; na svakoj utakmici se može promijeniti.
          </p>
          <Suspense fallback={<RulesSkeleton />}>
            <Rules />
          </Suspense>
        </section>
      </div>
    </>
  );
}

async function Payroll({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  await connection(); // "tekući mjesec" se računa po zahtjevu
  const period = resolvePeriod(sp.mjesec);
  const filter = parsePayrollFilter(sp);
  const { people, totals } = await getPayroll(period, filter);

  // Trenutni parametri za linkove filtera (mjesec se ne upisuje kad je tekući)
  const params = {
    mjesec: typeof sp.mjesec === "string" ? sp.mjesec : undefined,
    grupa: typeof sp.grupa === "string" ? sp.grupa : undefined,
    isplata: typeof sp.isplata === "string" ? sp.isplata : undefined,
    q: filter.q,
  };
  const csv = `/admin/naknade/csv?${new URLSearchParams(Object.entries(params).filter((e): e is [string, string] => Boolean(e[1])))}`;
  const filtered = Boolean(filter.group || filter.paid || filter.q);
  const unpaidIds = people.flatMap((p) => p.items.filter((i) => !i.paidAt).map((i) => i.assignmentId));

  return (
    <div className="flex flex-col gap-5">
      <PeriodPicker period={period} basePath="/admin/naknade" params={params} />
      <PayrollFilters basePath="/admin/naknade" params={params} />
      <PayrollSummary
        total={totals.total}
        paid={totals.paid}
        unpaid={totals.unpaid}
        note={`${people.length} ${people.length % 10 >= 2 && people.length % 10 <= 4 && (people.length % 100 < 12 || people.length % 100 > 14) ? "osobe" : "osoba"}, ${matchesLabel(totals.items)}, ${totals.unpaidItems} neisplaćeno`}
        aside={
          <div className="flex flex-wrap items-center gap-2">
            {filtered && <MarkAllPaid ids={unpaidIds} amount={totals.unpaid} label="Označi sve prikazano isplaćeno" />}
            {people.length > 0 && (
              <a href={csv} download className={buttonClass("secondary")}>
                <Download className="size-4" /> CSV za Excel
              </a>
            )}
          </div>
        }
      />
      {people.length === 0 ? (
        <Empty icon={<Wallet />}>
          Nema angažmana{describeFilter(filter)} {period === "sve" ? "na završenim utakmicama" : `u ${formatMonth(period)}`}.
        </Empty>
      ) : (
        <PayrollTable
          people={people}
          open={Boolean(filter.q)}
          personHref={(id) => `/admin/naknade/osoba/${id}${period === "sve" ? "?mjesec=sve" : params.mjesec ? `?mjesec=${params.mjesec}` : ""}`}
        />
      )}
    </div>
  );
}

async function Rules() {
  const competitions = await getFeeRules();
  if (competitions.length === 0) return <Empty icon={<Wallet />}>Nema takmičenja u tekućoj sezoni.</Empty>;
  return (
    <div className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-panel shadow-panel [&>*]:px-4 sm:[&>*]:px-6">
      {competitions.map((c) => (
        <RulesForm key={c.id} competition={c} />
      ))}
    </div>
  );
}

/** Kao obračun: mjesec, filteri, zbir i osobe (ime, broj utakmica, iznos, dug) */
function PayrollSkeleton() {
  return (
    <Skeleton className="flex flex-col gap-5">
      <PeriodPickerSkeleton />
      <PayrollFiltersSkeleton />
      <PayrollSummarySkeleton />
      <ul className={ROWS}>
        {times(5, (i) => (
          <li key={i} className="flex items-center gap-3 py-4">
            <span className="min-w-0 flex-1">
              <Text className="font-semibold" w={i % 2 ? "w-36" : "w-44"} />
              <Text className="text-[13px]" w="w-24" />
            </span>
            <span className="flex flex-col items-end gap-0.5">
              <Text className="scoreboard text-[20px] font-semibold" w="w-24" />
              <Text className="text-[12px] font-semibold" w="w-28" />
            </span>
            <Bone className="size-5 shrink-0" />
          </li>
        ))}
      </ul>
    </Skeleton>
  );
}

/** Kao lista takmičenja s cijenama (zatvoreni redovi) */
function RulesSkeleton() {
  return (
    <Skeleton className={ROWS}>
      {times(5, (i) => (
        <div key={i} className="flex items-center gap-3 py-4">
          <span className="min-w-0 flex-1">
            <Text className="font-display text-[22px] font-semibold leading-tight" w={i % 2 ? "w-48" : "w-60"} />
            <Text className="text-[13px]" w="w-72" />
          </span>
          <Bone className="size-5 shrink-0" />
        </div>
      ))}
    </Skeleton>
  );
}

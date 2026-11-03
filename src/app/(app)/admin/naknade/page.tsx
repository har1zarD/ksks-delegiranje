import { Suspense } from "react";
import { connection } from "next/server";
import { Download, Wallet } from "lucide-react";
import { getFeeRules, getPayroll, resolvePeriod } from "@/lib/data/finance";
import { formatMonth, matchesLabel, parsePayrollFilter, payrollByMatch } from "@/lib/finance";
import {
  Bone,
  DateTileSkeleton,
  PayrollFiltersSkeleton,
  PayrollSummarySkeleton,
  PeriodPickerSkeleton,
  Skeleton,
  Text,
  TeamNameSkeleton,
  times,
} from "@/components/skeleton";
import { FilterContent, FilterNavProvider } from "@/components/filter-nav";
import { buttonClass, CARD, cx, Empty, PageHeader, ROWS, SectionTitle } from "@/components/ui";
import { MarkAllPaid } from "@/components/paid-toggle";
import { describeFilter, PayrollFilters, PayrollMatches, PayrollSelections, PayrollSummary, PayrollTable, PayrollViews, PeriodPicker } from "./_components/payroll-view";
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
  const { people, totals, selections } = await getPayroll(period, filter);
  const byMatch = sp.prikaz !== "osobe";

  // Trenutni parametri za linkove filtera (mjesec se ne upisuje kad je tekući)
  const params = {
    mjesec: typeof sp.mjesec === "string" ? sp.mjesec : undefined,
    grupa: typeof sp.grupa === "string" ? sp.grupa : undefined,
    isplata: typeof sp.isplata === "string" ? sp.isplata : undefined,
    selekcija: filter.selection,
    q: filter.q,
  };
  const csv = `/admin/naknade/csv?${new URLSearchParams(Object.entries(params).filter((e): e is [string, string] => Boolean(e[1])))}`;
  const viewParams = { ...params, prikaz: byMatch ? undefined : "osobe" };
  const filtered = Boolean(filter.group || filter.paid || filter.q || filter.selection);
  const unpaidIds = people.flatMap((p) => p.items.filter((i) => !i.paidAt).map((i) => i.assignmentId));

  return (
    <FilterNavProvider>
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-3">
          <PeriodPicker period={period} basePath="/admin/naknade" params={viewParams}>
            <PayrollViews basePath="/admin/naknade" params={viewParams} />
          </PeriodPicker>
          <PayrollSelections basePath="/admin/naknade" params={viewParams} selections={selections} />
          <PayrollFilters basePath="/admin/naknade" params={viewParams} />
        </div>
        {/* Klik na filter: odmah skelet zbira i liste dok server sprema novi obračun */}
        <FilterContent fallback={<PayrollContentSkeleton byMatch={byMatch} />}>
          <PayrollSummary
            total={totals.total}
            paid={totals.paid}
            unpaid={totals.unpaid}
            note={`${people.length} ${people.length % 10 >= 2 && people.length % 10 <= 4 && (people.length % 100 < 12 || people.length % 100 > 14) ? "osobe" : "osoba"}, ${matchesLabel(totals.items)}, ${totals.unpaidItems} neisplaćeno`}
            aside={
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                {filtered && <MarkAllPaid ids={unpaidIds} amount={totals.unpaid} label="Isplati prikazano" className="w-full sm:w-auto" />}
                {people.length > 0 && (
                  <a href={csv} download className={buttonClass("secondary", "h-9 w-full px-3 text-[13px] sm:w-auto")}>
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
          ) : byMatch ? (
            <PayrollMatches matches={payrollByMatch(people)} />
          ) : (
            <PayrollTable
              people={people}
              open={Boolean(filter.q)}
              personHref={(id) => `/admin/naknade/osoba/${id}${period === "sve" ? "?mjesec=sve" : params.mjesec ? `?mjesec=${params.mjesec}` : ""}`}
            />
          )}
        </FilterContent>
      </div>
    </FilterNavProvider>
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

/** Kao obračun: mjesec, filteri, zbir i kartice utakmica (podrazumijevani prikaz) */
function PayrollSkeleton() {
  return (
    <Skeleton className="flex flex-col gap-5">
      <div className="flex flex-col gap-3">
        <PeriodPickerSkeleton views />
        <PayrollFiltersSkeleton />
      </div>
      <PayrollSummarySkeleton />
      <MatchCardsSkeleton />
    </Skeleton>
  );
}

/** Ispod filtera dok se učitava novi izbor: zbir, pa kartice utakmica ili osobe */
function PayrollContentSkeleton({ byMatch }: { byMatch: boolean }) {
  return (
    <Skeleton className="flex flex-col gap-5">
      <PayrollSummarySkeleton />
      {byMatch ? <MatchCardsSkeleton /> : <PeopleSkeleton />}
    </Skeleton>
  );
}

/** Kao kartice utakmica: datum, ekipe, pa tri osobe s iznosom i isplatom */
function MatchCardsSkeleton() {
  return (
    <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {times(6, (c) => (
        <li key={c} className={cx(CARD, "flex flex-col p-4")}>
          <div className="flex items-start gap-3">
            <DateTileSkeleton />
            <div className="min-w-0 flex-1">
              <Text className="text-[12px]" w="w-32" />
              <div className="mt-1 flex flex-col gap-1 text-[15px] font-semibold">
                <TeamNameSkeleton w={c % 2 ? "w-28" : "w-32"} />
                <TeamNameSkeleton w={c % 2 ? "w-32" : "w-24"} />
              </div>
            </div>
          </div>
          <ul className="mt-3 divide-y divide-line border-t border-line">
            {times(3, (i) => (
              <li key={i} className="flex items-center gap-2 py-2">
                <span className="min-w-0 flex-1">
                  <Text className="text-[14px] font-semibold" w={i % 2 ? "w-28" : "w-32"} />
                  <Text className="text-[12px]" w="w-20" />
                </span>
                <Text className="text-[14px]" w="w-16" />
                <Bone className="h-6 w-24 shrink-0" />
              </li>
            ))}
          </ul>
          <div className="mt-auto flex flex-col gap-2 border-t border-line pt-3">
            <Text className="text-[13px]" w="w-28" />
            <Bone className="h-9 w-full rounded-lg" />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Kao lista osoba (ime, broj utakmica, iznos, dug) */
function PeopleSkeleton() {
  return (
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

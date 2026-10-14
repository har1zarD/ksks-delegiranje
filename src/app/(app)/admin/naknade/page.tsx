import { Suspense } from "react";
import { connection } from "next/server";
import { Download } from "lucide-react";
import { getFeeRules, getPayroll, resolveMonth } from "@/lib/data/finance";
import { formatMonth } from "@/lib/finance";
import { buttonClass, Empty, Loading, PageHeader, SectionTitle } from "@/components/ui";
import { MonthPicker, PayrollTable } from "./_components/payroll-view";
import { RulesForm } from "./rules-form";

export const metadata = { title: "Naknade — KSKS" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default function FeesPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <>
      <PageHeader
        title="Naknade"
        subtitle="Cijene po takmičenju i mjesečni obračun. Sudije se plaćaju zavisno od toga sude li dvojica ili trojica."
      />
      <div className="flex flex-col gap-14">
        <section>
          <Suspense fallback={<Loading />}>
            <Payroll searchParams={searchParams} />
          </Suspense>
        </section>
        <section>
          <SectionTitle>Cijene po takmičenju</SectionTitle>
          <p className="-mt-1 pb-5 text-[14px] text-fg-muted">
            Broj sudija i ljudi za stolom ovdje je podrazumijevani za nove utakmice; na svakoj utakmici se može promijeniti.
          </p>
          <Suspense fallback={<Loading />}>
            <Rules />
          </Suspense>
        </section>
      </div>
    </>
  );
}

async function Payroll({ searchParams }: { searchParams: SearchParams }) {
  const { mjesec } = await searchParams;
  await connection(); // "tekući mjesec" se računa po zahtjevu
  const month = resolveMonth(mjesec);
  const people = await getPayroll(month);
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4">
        <MonthPicker month={month} basePath="/admin/naknade" />
        {people.length > 0 && (
          <a href={`/admin/naknade/csv?mjesec=${month}`} download className={buttonClass("secondary")}>
            <Download className="size-4" /> CSV za Excel
          </a>
        )}
      </div>
      {people.length === 0 ? (
        <Empty>Nema završenih utakmica s prihvaćenim delegiranjem u {formatMonth(month)}.</Empty>
      ) : (
        <PayrollTable people={people} />
      )}
    </>
  );
}

async function Rules() {
  const competitions = await getFeeRules();
  if (competitions.length === 0) return <Empty>Nema takmičenja u tekućoj sezoni.</Empty>;
  return (
    <div className="divide-y divide-line rounded-lg border border-line bg-panel shadow-panel [&>*]:px-4 sm:[&>*]:px-6">
      {competitions.map((c) => (
        <RulesForm key={c.id} competition={c} />
      ))}
    </div>
  );
}

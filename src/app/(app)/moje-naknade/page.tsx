import { Suspense } from "react";
import { connection } from "next/server";
import { getMyPayroll, resolvePeriod } from "@/lib/data/finance";
import { formatMonth, matchesLabel } from "@/lib/finance";
import { Empty, Loading, PageHeader } from "@/components/ui";
import { PayrollItems, PayrollSummary, PeriodPicker } from "../admin/naknade/_components/payroll-view";

export const metadata = { title: "Moje naknade — KSKS" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default function MyPayPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <>
      <PageHeader title="Naknade" subtitle="Odsuđene utakmice, iznos i šta je savez već isplatio." />
      <Suspense fallback={<Loading />}>
        <MyPay searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function MyPay({ searchParams }: { searchParams: SearchParams }) {
  const { mjesec } = await searchParams;
  await connection(); // "tekući mjesec" se računa po zahtjevu
  const period = resolvePeriod(mjesec);
  const me = await getMyPayroll(period);
  return (
    <div className="flex flex-col gap-5">
      <PeriodPicker period={period} basePath="/moje-naknade" params={{ mjesec: typeof mjesec === "string" ? mjesec : undefined }} />
      {!me ? (
        <Empty>Nemaš odsuđenih utakmica {period === "sve" ? "" : `u ${formatMonth(period)}`}.</Empty>
      ) : (
        <>
          <PayrollSummary
            total={me.total}
            paid={me.paid}
            unpaid={me.unpaid}
            note={
              <>
                {matchesLabel(me.items.length)}
                {me.missing > 0 && <span className="text-orange">, {me.missing} bez određene cijene</span>}
              </>
            }
          />
          <div className="rounded-lg border border-line bg-panel px-4 shadow-panel sm:px-6">
            <PayrollItems person={me} />
          </div>
        </>
      )}
    </div>
  );
}

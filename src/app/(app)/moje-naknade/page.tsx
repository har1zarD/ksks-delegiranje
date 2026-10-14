import { Suspense } from "react";
import { connection } from "next/server";
import { getMyPayroll, resolveMonth } from "@/lib/data/finance";
import { formatKM, formatMonth, matchesLabel } from "@/lib/finance";
import { Empty, Loading, PageHeader } from "@/components/ui";
import { MonthPicker, PayrollItems } from "../admin/naknade/_components/payroll-view";

export const metadata = { title: "Moje naknade — KSKS" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default function MyPayPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <>
      <PageHeader title="Naknade" subtitle="Odsuđene utakmice i iznos za mjesec." />
      <Suspense fallback={<Loading />}>
        <MyPay searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function MyPay({ searchParams }: { searchParams: SearchParams }) {
  const { mjesec } = await searchParams;
  await connection(); // "tekući mjesec" se računa po zahtjevu
  const month = resolveMonth(mjesec);
  const me = await getMyPayroll(month);
  return (
    <div className="flex flex-col gap-4">
      <MonthPicker month={month} basePath="/moje-naknade" />
      {!me ? (
        <Empty>Nemaš odsuđenih utakmica u {formatMonth(month)}.</Empty>
      ) : (
        <div className="rounded-lg border border-line bg-panel shadow-panel px-4 sm:px-5">
          <div className="flex items-end justify-between gap-4 border-b border-line py-4 sm:py-6">
            <div>
              <div className="text-[13px] font-semibold text-fg-muted">Za {formatMonth(month)}</div>
              <div className="text-[13px] text-fg-faint">
                {matchesLabel(me.items.length)}
                {me.missing > 0 && <span className="text-orange">, {me.missing} bez određene cijene</span>}
              </div>
            </div>
            <div className="scoreboard whitespace-nowrap text-[28px] font-semibold leading-none sm:text-[32px]">{formatKM(me.total)}</div>
          </div>
          <div className="">
            <PayrollItems person={me} />
          </div>
        </div>
      )}
    </div>
  );
}

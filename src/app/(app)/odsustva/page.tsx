import { Suspense } from "react";
import { getMyUnavailability } from "@/lib/data/official";
import { formatDate, todayISO } from "@/lib/format";
import { ConfirmButton } from "@/components/confirm-button";
import { Loading, PageHeader, SectionTitle } from "@/components/ui";
import { AbsenceForm } from "./absence-form";
import { deleteAbsence } from "./actions";

export const metadata = { title: "Odsustva — KSKS" };

export default function AbsencesPage() {
  return (
    <>
      <PageHeader title="Odsustva" subtitle="Najavi dane kad nisi dostupan. Savez te tada neće delegirati." />
      <Suspense fallback={<Loading />}>
        <Absences />
      </Suspense>
    </>
  );
}

async function Absences() {
  const items = await getMyUnavailability();
  const today = todayISO();

  return (
    <div className="flex flex-col gap-10">
      <AbsenceForm today={today} />
      <section>
        <SectionTitle count={items.length}>Najavljena</SectionTitle>
        {items.length === 0 ? (
          <p className="rounded-lg border border-line bg-panel shadow-panel px-4 sm:px-5 py-8 text-center text-[15px] text-fg-muted">
            Nemaš najavljenih odsustava.
          </p>
        ) : (
          <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-panel shadow-panel [&>*]:px-4 sm:[&>*]:px-6">
            {items.map((u) => (
              <li key={u.id} className="flex items-center gap-4 py-4">
                <div className="min-w-0 flex-1">
                  <div className="scoreboard whitespace-nowrap text-[24px] font-semibold leading-tight">
                    {formatDate(u.from_date)}
                    {u.from_date !== u.to_date && (
                      <>
                        <span className="text-fg-faint">–</span>
                        {formatDate(u.to_date)}
                      </>
                    )}
                  </div>
                  {u.reason && <div className="truncate text-[14px] text-fg-muted">{u.reason}</div>}
                </div>
                <form action={deleteAbsence}>
                  <input type="hidden" name="id" value={u.id} />
                  <ConfirmButton message="Ukloniti ovo odsustvo?">Ukloni</ConfirmButton>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

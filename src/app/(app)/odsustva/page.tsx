import { CalendarOff } from "lucide-react";
import { Suspense } from "react";
import { getMyUnavailability } from "@/lib/data/official";
import { absenceParts, todayISO } from "@/lib/format";
import { ConfirmButton } from "@/components/confirm-button";
import { ButtonSkeleton, FieldSkeleton, SectionTitleSkeleton, Skeleton, Text, TextButtonSkeleton, times } from "@/components/skeleton";
import { Empty, PageHeader, ROWS, SectionTitle } from "@/components/ui";
import { AbsenceForm } from "./absence-form";
import { deleteAbsence } from "./actions";

export const metadata = { title: "Odsustva — KSKS" };

export default function AbsencesPage() {
  return (
    <>
      <PageHeader icon={<CalendarOff />} title="Odsustva" subtitle="Najavi od kad do kad nisi dostupan, s datumom i satom. U tom periodu te savez ne vidi pri delegiranju." />
      <Suspense fallback={<AbsencesSkeleton />}>
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
        <SectionTitle icon={<CalendarOff />} count={items.length}>Najavljena</SectionTitle>
        {items.length === 0 ? (
          <Empty icon={<CalendarOff />} title="Nema najavljenih odsustava">Kada nisi dostupan za delegiranje, dodaj period odsustva putem obrasca iznad.</Empty>
        ) : (
          <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-panel shadow-panel [&>*]:px-4 sm:[&>*]:px-6">
            {items.map((u) => {
              const { from, to, allDay } = absenceParts(u.starts_at, u.ends_at);
              return (
                <li key={u.id} className="flex items-center gap-4 py-4">
                  <div className="min-w-0 flex-1">
                    <div className="scoreboard flex flex-wrap items-baseline gap-x-2 text-[20px] font-semibold leading-tight sm:text-[22px]">
                      <span className="whitespace-nowrap">{from}</span>
                      {to && (
                        <>
                          <span className="text-fg-faint">–</span>
                          <span className="whitespace-nowrap">{to}</span>
                        </>
                      )}
                    </div>
                    <div className="mt-0.5 truncate text-[14px] text-fg-muted">
                      {[allDay ? (to ? "Cijeli dani" : "Cijeli dan") : null, u.reason].filter(Boolean).join(", ")}
                    </div>
                  </div>
                  <form action={deleteAbsence}>
                    <input type="hidden" name="id" value={u.id} />
                    <ConfirmButton title="Ukloniti ovo odsustvo?" confirmLabel="Ukloni">Ukloni</ConfirmButton>
                  </form>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

/** Kao forma za novo odsustvo i lista najavljenih */
function AbsencesSkeleton() {
  return (
    <Skeleton className="flex flex-col gap-10">
      <div className="grid grid-cols-2 items-start gap-3 rounded-lg border border-line bg-panel px-4 py-5 shadow-panel sm:px-5 lg:grid-cols-4">
        <FieldSkeleton label="Od" hint />
        <FieldSkeleton label="Od sati" hint />
        <FieldSkeleton label="Do" hint />
        <FieldSkeleton label="Do sati" hint />
        <FieldSkeleton label="Razlog" hint className="col-span-2 lg:col-span-3" />
        <div className="col-span-2 flex flex-col gap-1.5 lg:col-span-1">
          <span aria-hidden className="hidden text-[13px] font-medium lg:block">&nbsp;</span>
          <ButtonSkeleton className="lg:w-36" />
        </div>
      </div>
      <section>
        <SectionTitleSkeleton w="w-28" count />
        <ul className={ROWS}>
          {times(2, (i) => (
            <li key={i} className="flex items-center gap-4 py-4">
              <div className="min-w-0 flex-1">
                <Text className="scoreboard text-[20px] font-semibold leading-tight sm:text-[22px]" w={i ? "w-28" : "w-56"} />
                <Text className="text-[14px]" w="w-32" />
              </div>
              <TextButtonSkeleton />
            </li>
          ))}
        </ul>
      </section>
    </Skeleton>
  );
}

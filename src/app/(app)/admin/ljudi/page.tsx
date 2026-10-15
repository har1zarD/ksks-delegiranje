import { CalendarOff, Users } from "lucide-react";
import { Suspense } from "react";
import { getCurrentUser } from "@/lib/auth";
import { getAllAbsences, getPeople } from "@/lib/data/admin";
import { absenceParts } from "@/lib/format";
import { Bone, ButtonSkeleton, SegmentsSkeleton, Skeleton, Text, times } from "@/components/skeleton";
import { cx, Empty, PageHeader, Rows, ROWS, SectionTitle, Segment, Segments, Status } from "@/components/ui";
import { AddPerson } from "./add-person";
import { PersonRow } from "./person-row";

export const metadata = { title: "Službena lica — KSKS" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default function PeoplePage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <>
      <PageHeader icon={<Users />} title="Službena lica" subtitle="Sudije, zapisnički sto, komesari i savez. Dodirni osobu za izmjenu, ili otvori najavljena odsustva." />
      <Suspense fallback={<TabsSkeleton />}>
        <Tabs searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Tabs({ searchParams }: { searchParams: SearchParams }) {
  const absences = (await searchParams).prikaz === "odsustva";
  return (
    <div className="flex flex-col gap-4">
      <Segments full>
        <Segment href="/admin/ljudi" active={!absences}>Sva lica</Segment>
        <Segment href="/admin/ljudi?prikaz=odsustva" active={absences}>Odsustva</Segment>
      </Segments>
      <Suspense key={String(absences)} fallback={absences ? <AbsencesSkeleton /> : <PeopleSkeleton />}>
        {absences ? <Absences /> : <People />}
      </Suspense>
    </div>
  );
}

async function People() {
  const [people, me] = await Promise.all([getPeople(), getCurrentUser()]);
  const groups = [
    { title: "Sudije", list: people.filter((p) => p.role === "official" && p.is_referee) },
    { title: "Zapisnički sto", list: people.filter((p) => p.role === "official" && p.is_table && !p.is_referee) },
    { title: "Komesari", list: people.filter((p) => p.role === "commissioner") },
    { title: "Savez", list: people.filter((p) => p.role === "admin") },
  ];

  return (
    <div className="flex flex-col gap-8">
      <AddPerson />

      {people.length === 0 && <Empty icon={<Users />}>Još nema nikoga. Dodaj prvu osobu ili uvezi spisak iz CSV-a.</Empty>}

      {groups.map(
        (g) =>
          g.list.length > 0 && (
            <section key={g.title}>
              <SectionTitle count={g.list.length}>{g.title}</SectionTitle>
              <Rows>
                {g.list.map((p) => (
                  <PersonRow key={p.id} person={p} active={p.active} isMe={p.id === me.id} />
                ))}
              </Rows>
            </section>
          ),
      )}
    </div>
  );
}

async function Absences() {
  const items = await getAllAbsences();
  const now = new Date().toISOString();
  const upcoming = items.filter((u) => u.ends_at > now);
  const past = items.filter((u) => u.ends_at <= now).reverse(); // najskorije prvo

  if (items.length === 0) {
    return <Empty icon={<CalendarOff />} title="Nema odsustava">Kada neko najavi da nije dostupan, odsustvo će se pojaviti ovdje.</Empty>;
  }

  return (
    <div className="flex flex-col gap-8">
      <section>
        <SectionTitle icon={<CalendarOff />} count={upcoming.length}>Najavljena odsustva</SectionTitle>
        {upcoming.length > 0 ? (
          <Rows>
            {upcoming.map((u) => (
              <AbsenceRow key={u.id} absence={u} ongoing={u.starts_at <= now} />
            ))}
          </Rows>
        ) : (
          <Empty icon={<CalendarOff />}>Trenutno niko nije najavio odsustvo.</Empty>
        )}
      </section>

      {past.length > 0 && (
        <section>
          <SectionTitle count={past.length}>Prošla odsustva</SectionTitle>
          <Rows>
            {past.map((u) => (
              <AbsenceRow key={u.id} absence={u} past />
            ))}
          </Rows>
        </section>
      )}
    </div>
  );
}

type Absence = Awaited<ReturnType<typeof getAllAbsences>>[number];

function AbsenceRow({ absence: u, ongoing, past }: { absence: Absence; ongoing?: boolean; past?: boolean }) {
  const { from, to, allDay } = absenceParts(u.starts_at, u.ends_at);
  return (
    <li className="flex flex-col gap-1 py-4 sm:flex-row sm:items-center sm:gap-4">
      <div className="min-w-0 flex-1">
        <div className={cx("truncate text-[16px] font-semibold leading-tight", past && "text-fg-muted")}>{u.profile!.full_name}</div>
        <div className="mt-0.5 truncate text-[14px] text-fg-muted">
          {[allDay ? (to ? "Cijeli dani" : "Cijeli dan") : null, u.reason].filter(Boolean).join(", ")}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        {ongoing && <Status tone="orange">Trenutno odsutan</Status>}
        <span className={cx("scoreboard whitespace-nowrap text-[16px] font-semibold", past && "text-fg-muted")}>
          {from}
          {to && <span className="text-fg-faint"> – </span>}
          {to}
        </span>
      </div>
    </li>
  );
}

/** Tabovi pa spisak osoba (prvi tab je podrazumijevani) */
function TabsSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <SegmentsSkeleton widths={["w-16", "w-16"]} full />
      <PeopleSkeleton />
    </div>
  );
}

/** Kao lista odsustava: ime i razlog, pa period */
function AbsencesSkeleton() {
  return (
    <Skeleton>
      <SectionTitle icon={<CalendarOff />}>
        Najavljena odsustva
        <span className="inline-flex min-w-6 shrink-0 items-center justify-center rounded-md border border-line bg-panel px-1.5 py-0.5 text-[12px]">
          <Text w="w-2" />
        </span>
      </SectionTitle>
      <ul className={ROWS}>
        {times(4, (i) => (
          <li key={i} className="flex flex-col gap-1 py-4 sm:flex-row sm:items-center sm:gap-4">
            <div className="min-w-0 flex-1">
              <Text className="text-[16px] font-semibold leading-tight" w={i % 2 ? "w-36" : "w-44"} />
              <Text className="mt-0.5 text-[14px]" w="w-28" />
            </div>
            <Text className="scoreboard text-[16px] font-semibold" w={i % 2 ? "w-28" : "w-52"} />
          </li>
        ))}
      </ul>
    </Skeleton>
  );
}

/** Kao spisak: dugme za dodavanje, pa grupe osoba (ime, email i uloge, telefon, aktivnost) */
function PeopleSkeleton() {
  return (
    <Skeleton className="flex flex-col gap-8">
      <ButtonSkeleton className="w-full sm:w-36" />
      {[
        { title: "Sudije", rows: 6 },
        { title: "Zapisnički sto", rows: 3 },
      ].map((g) => (
        <section key={g.title}>
          <SectionTitle>
            {g.title}
            <span className="inline-flex min-w-6 shrink-0 items-center justify-center rounded-md border border-line bg-panel px-1.5 py-0.5 text-[12px]">
              <Text w="w-2" />
            </span>
          </SectionTitle>
          <ul className={ROWS}>
            {times(g.rows, (i) => (
              <li key={i} className="flex items-center gap-3 py-2.5">
                <span className="flex min-w-0 flex-1 items-center gap-3">
                  <Bone className="size-8 shrink-0 rounded-md" />
                  <span className="min-w-0 flex-1">
                    <Text className="text-[15px] font-semibold leading-tight" w={i % 2 ? "w-32" : "w-40"} />
                    <Text className="text-[12px]" w="w-16" />
                  </span>
                </span>
                <div className="flex shrink-0 items-center gap-1.5">
                  <Bone className="size-8 rounded-md" />
                  <Bone className="h-8 w-20 rounded-md" />
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </Skeleton>
  );
}

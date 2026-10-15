import { Users } from "lucide-react";
import { Suspense } from "react";
import { getCurrentUser } from "@/lib/auth";
import { getPeople } from "@/lib/data/admin";
import { Bone, ButtonSkeleton, Skeleton, Text, times } from "@/components/skeleton";
import { Empty, PageHeader, Rows, ROWS, SectionTitle } from "@/components/ui";
import { AddPerson } from "./add-person";
import { PersonRow } from "./person-row";

export const metadata = { title: "Službena lica — KSKS" };

export default function PeoplePage() {
  return (
    <>
      <PageHeader icon={<Users />} title="Službena lica" subtitle="Sudije, zapisnički sto, komesari i savez. Dodirni osobu za izmjenu." />
      <Suspense fallback={<PeopleSkeleton />}>
        <People />
      </Suspense>
    </>
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
    <div className="flex flex-col gap-10">
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

/** Kao spisak: dugme za dodavanje, pa grupe osoba (ime, email i uloge, telefon, aktivnost) */
function PeopleSkeleton() {
  return (
    <Skeleton className="flex flex-col gap-10">
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
              <li key={i} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center">
                <span className="flex min-w-0 flex-1 items-center gap-3">
                  <Bone className="size-10 shrink-0 rounded-lg" />
                  <span className="min-w-0 flex-1">
                    <Text className="text-[16px] font-semibold leading-tight" w={i % 2 ? "w-36" : "w-44"} />
                    <Text className="text-[13px]" w="w-72" />
                  </span>
                </span>
                <div className="flex flex-wrap items-center gap-2 pl-13 sm:pl-0">
                  <Bone className="h-10 w-36 rounded-lg" />
                  <Bone className="h-10 w-28 rounded-lg" />
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </Skeleton>
  );
}

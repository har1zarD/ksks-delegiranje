import { Users } from "lucide-react";
import { Suspense } from "react";
import { getCurrentUser } from "@/lib/auth";
import { getPeople } from "@/lib/data/admin";
import { ButtonSkeleton, SectionTitleSkeleton, Skeleton, Text, times } from "@/components/skeleton";
import { Empty, PageHeader, Rows, ROWS, SectionTitle } from "@/components/ui";
import { AddPerson } from "./add-person";
import { PersonRow } from "./person-row";

export const metadata = { title: "Ljudi — KSKS" };

export default function PeoplePage() {
  return (
    <>
      <PageHeader icon={<Users />} title="Ljudi" subtitle="Sudije, zapisnički sto, komesari i savez. Dodirni osobu za izmjenu." />
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
      {times(2, (g) => (
        <section key={g}>
          <SectionTitleSkeleton w="w-24" count />
          <ul className={ROWS}>
            {times(4, (i) => (
              <li key={i} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center">
                <span className="min-w-0 flex-1">
                  <Text className="text-[16px] font-semibold leading-tight" w={i % 2 ? "w-36" : "w-44"} />
                  <Text className="text-[13px]" w="w-72" />
                </span>
                <div className="flex items-center gap-2 pl-14 sm:pl-0">
                  <ButtonSkeleton className="h-10 w-36 sm:h-10" />
                  <ButtonSkeleton className="h-10 w-28 sm:h-10" />
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </Skeleton>
  );
}

import { Suspense } from "react";
import { getCurrentUser } from "@/lib/auth";
import { getPeople } from "@/lib/data/admin";
import { Empty, Loading, PageHeader, Rows, SectionTitle } from "@/components/ui";
import { AddPerson } from "./add-person";
import { PersonRow } from "./person-row";

export const metadata = { title: "Ljudi — KSKS" };

export default function PeoplePage() {
  return (
    <>
      <PageHeader title="Ljudi" subtitle="Sudije, zapisnički sto, komesari i savez. Dodirni osobu za izmjenu." />
      <Suspense fallback={<Loading />}>
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

      {people.length === 0 && <Empty>Još nema nikoga. Dodaj prvu osobu ili uvezi spisak iz CSV-a.</Empty>}

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

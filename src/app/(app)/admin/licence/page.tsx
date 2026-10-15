import { Suspense } from "react";
import { FolderPlus, IdCard } from "lucide-react";
import { CompetitionLogo } from "@/components/competition-logo";
import { Empty, PageHeader, Panel, SectionTitle } from "@/components/ui";
import { getLicenseCompetitions, getLicenseFolderOptions } from "@/lib/data/licenses";
import { Folder, FolderFormSkeleton, FolderGrid, FolderGridSkeleton } from "./_components/folder";
import { FolderForm } from "./_components/folder-form";

export const metadata = { title: "Licence — KSKS" };

export default function LicensesPage() {
  return (
    <>
      <PageHeader icon={<IdCard />} title="Licence" subtitle="Licencirani igrači i službena lica po takmičenju i klubu." />
      <div className="flex flex-col gap-12">
        <Suspense fallback={<FolderGridSkeleton count={1} />}>
          <Competitions />
        </Suspense>
        <section>
          <SectionTitle icon={<FolderPlus />}>Novi folder</SectionTitle>
          <Panel className="py-4 sm:py-6">
            <p className="mb-5 max-w-prose text-[14px] text-fg-muted">Izaberi takmičenje i klub, pa u folder dodaj igrače i službena lica.</p>
            <Suspense fallback={<FolderFormSkeleton />}>
              <NewFolder />
            </Suspense>
          </Panel>
        </section>
      </div>
    </>
  );
}

async function Competitions() {
  const competitions = await getLicenseCompetitions();
  if (competitions.length === 0) return <Empty icon={<IdCard />}>Nema foldera. Napravi prvi ispod.</Empty>;

  return (
    <FolderGrid>
      {competitions.map((c) => (
        <li key={c.id}>
          <Folder
            href={`/admin/licence/${c.id}`}
            logo={<CompetitionLogo name={c.name} category={c.category} />}
            title={c.name}
            meta={[c.season, `${c.clubCount} ${c.clubCount === 1 ? "klub" : "klubova"}`, `${c.count} licenci`].filter(Boolean).join(" · ")}
          />
        </li>
      ))}
    </FolderGrid>
  );
}

async function NewFolder() {
  return <FolderForm options={await getLicenseFolderOptions()} />;
}

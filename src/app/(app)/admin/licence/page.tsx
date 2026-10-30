import { Suspense } from "react";
import { FolderPlus, IdCard } from "lucide-react";
import { Empty, PageHeader, Panel, SectionTitle } from "@/components/ui";
import { getLicenseCompetitions, getLicenseFolderOptions } from "@/lib/data/licenses";
import { CompetitionFolders, Folder, FolderFormSkeleton, FolderGrid, FolderGridSkeleton, YOUTH_LEAGUE, YouthLeagueLogo } from "./_components/folder";
import { FolderForm } from "./_components/folder-form";

export const metadata = { title: "Licence — KSKS" };

export default function LicensesPage() {
  return (
    <>
      <PageHeader icon={<IdCard />} title="Licence" subtitle="Licencirani igrači i službena lica po takmičenju i klubu." />
      <div className="flex flex-col gap-12">
        <Suspense fallback={<FolderGridSkeleton count={4} />}>
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
  const { youth, others } = await getLicenseCompetitions();
  if (youth.length + others.length === 0) return <Empty icon={<IdCard />}>Nema foldera. Napravi prvi ispod.</Empty>;

  const clubs = youth.reduce((n, c) => n + c.clubCount, 0);
  const count = youth.reduce((n, c) => n + c.count, 0);
  return (
    <FolderGrid>
      {youth.length > 0 && (
        <li>
          <Folder
            href="/admin/licence/omladinska"
            logo={<YouthLeagueLogo />}
            title={YOUTH_LEAGUE}
            meta={`${youth.length} ${youth.length % 10 >= 2 && youth.length % 10 <= 4 && (youth.length % 100 < 12 || youth.length % 100 > 14) ? "kategorije" : "kategorija"} · ${clubs} klubova · ${count} licenci`}
          />
        </li>
      )}
      <CompetitionFolders competitions={others} />
    </FolderGrid>
  );
}

async function NewFolder() {
  return <FolderForm options={await getLicenseFolderOptions()} />;
}

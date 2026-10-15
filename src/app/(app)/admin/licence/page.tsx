import { Suspense } from "react";
import { IdCard } from "lucide-react";
import { CompetitionLogo } from "@/components/competition-logo";
import { Empty, PageHeader } from "@/components/ui";
import { getLicenseCompetitions } from "@/lib/data/licenses";
import { Folder, FolderGrid, FolderGridSkeleton } from "./_components/folder";

export const metadata = { title: "Licence — KSKS" };

export default function LicensesPage() {
  return (
    <>
      <PageHeader icon={<IdCard />} title="Licence" subtitle="Licencirani igrači i službena lica po takmičenju i klubu." />
      <Suspense fallback={<FolderGridSkeleton count={1} />}>
        <Competitions />
      </Suspense>
    </>
  );
}

async function Competitions() {
  const competitions = await getLicenseCompetitions();
  if (competitions.length === 0) return <Empty icon={<IdCard />}>Nema licenci.</Empty>;

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

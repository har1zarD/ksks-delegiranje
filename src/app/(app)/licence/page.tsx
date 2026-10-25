import { Suspense } from "react";
import { IdCard } from "lucide-react";
import { Empty, PageHeader } from "@/components/ui";
import { getYouthLicenseCompetitions } from "@/lib/data/licenses";
import { CompetitionFolders, FolderGrid, FolderGridSkeleton, YOUTH_LEAGUE } from "@/app/(app)/admin/licence/_components/folder";

export const metadata = { title: "Licence — KSKS" };

/** Komesar: licence Omladinske lige KS, samo pregled (kategorija → klub → licence) */
export default function YouthLicensesViewPage() {
  return (
    <>
      <PageHeader icon={<IdCard />} title="Licence" subtitle={`${YOUTH_LEAGUE}: licencirani igrači i službena lica po kategoriji i klubu.`} />
      <Suspense fallback={<FolderGridSkeleton />}>
        <Categories />
      </Suspense>
    </>
  );
}

async function Categories() {
  const youth = await getYouthLicenseCompetitions();
  if (youth.length === 0) return <Empty icon={<IdCard />}>Još nema licenci.</Empty>;
  const second = youth.filter((c) => c.tier === 2);
  // Grupe 2 i unobasket odvojeni linijom ispod
  return (
    <div className="flex flex-col gap-8">
      <FolderGrid>
        <CompetitionFolders competitions={youth.filter((c) => c.tier === 1)} base="/licence" />
      </FolderGrid>
      {second.length > 0 && (
        <div className="border-t border-line pt-8">
          <FolderGrid>
            <CompetitionFolders competitions={second} base="/licence" />
          </FolderGrid>
        </div>
      )}
    </div>
  );
}

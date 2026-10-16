import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ChevronLeft } from "lucide-react";
import { getLicenseCompetitions } from "@/lib/data/licenses";
import { CompetitionFolders, FolderGrid, FolderGridSkeleton, YOUTH_LEAGUE, YouthLeagueLogo } from "../_components/folder";

export const metadata = { title: "Omladinska liga — Licence — KSKS" };

/** Omladinska liga: folder po kategoriji (takmičenju), u njoj klubovi */
export default function YouthLicensesPage() {
  return (
    <>
      <Link href="/admin/licence" className="-my-2.5 inline-flex items-center gap-1 py-2.5 text-[15px] font-semibold text-brand hover:opacity-75">
        <ChevronLeft className="size-4" /> Licence
      </Link>
      <div className="flex flex-col gap-8">
        <header className="flex items-center gap-4 pt-4">
          <span aria-hidden="true" className="grid size-14 shrink-0 place-items-center rounded-lg border border-line bg-panel shadow-panel">
            <YouthLeagueLogo />
          </span>
          <div className="min-w-0">
            <h1 className="font-display text-[28px] font-semibold leading-tight tracking-[-0.04em] sm:text-[32px]">{YOUTH_LEAGUE}</h1>
            <p className="mt-1 text-[14px] text-fg-muted">Kategorije omladinske lige; u svakoj su klubovi koji u njoj imaju ekipu.</p>
          </div>
        </header>
        <Suspense fallback={<FolderGridSkeleton />}>
          <Categories />
        </Suspense>
      </div>
    </>
  );
}

async function Categories() {
  const { youth } = await getLicenseCompetitions();
  if (youth.length === 0) notFound();
  const second = youth.filter((c) => c.tier === 2);
  // Grupe 2 i unobasket odvojeni linijom ispod
  return (
    <>
      <FolderGrid>
        <CompetitionFolders competitions={youth.filter((c) => c.tier === 1)} />
      </FolderGrid>
      {second.length > 0 && (
        <div className="border-t border-line pt-8">
          <FolderGrid>
            <CompetitionFolders competitions={second} />
          </FolderGrid>
        </div>
      )}
    </>
  );
}

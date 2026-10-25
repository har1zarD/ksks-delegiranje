import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ChevronLeft } from "lucide-react";
import { CompetitionLogo } from "@/components/competition-logo";
import { Bone, Text } from "@/components/skeleton";
import { getYouthLicenseClubs } from "@/lib/data/licenses";
import { Folder, FolderClubLogo, FolderGrid, FolderGridSkeleton, YOUTH_LEAGUE } from "@/app/(app)/admin/licence/_components/folder";

export const metadata = { title: "Licence — KSKS" };

/** Komesar: klubovi u kategoriji Omladinske lige KS */
export default function YouthLicenseCompetitionPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<ClubsSkeleton />}>
      <Clubs params={params} />
    </Suspense>
  );
}

async function Clubs({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getYouthLicenseClubs(id);
  if (!data) notFound();
  const { competition: c, clubs } = data;

  return (
    <>
      <Link href="/licence" className="-my-2.5 inline-flex items-center gap-1 py-2.5 text-[15px] font-semibold text-brand hover:opacity-75">
        <ChevronLeft className="size-4" /> {YOUTH_LEAGUE}
      </Link>
      <div className="flex flex-col gap-8">
        <header className="pt-4">
          <div className="flex items-center gap-4">
            <CompetitionLogo name={c.name} category={c.category} />
            <h1 className="min-w-0 font-display text-[28px] font-semibold leading-tight tracking-[-0.04em] sm:text-[32px]">{c.name}</h1>
          </div>
          {c.season && <p className="mt-2 text-[14px] text-fg-muted">Sezona {c.season}</p>}
        </header>
        <FolderGrid>
          {clubs.map((club) => (
            <li key={club.id}>
              <Folder
                href={`/licence/${c.id}/${club.id}`}
                logo={<FolderClubLogo src={club.logoUrl} />}
                title={club.name}
                meta={`${club.players} igrača · ${club.officials} službenih lica`}
              />
            </li>
          ))}
        </FolderGrid>
      </div>
    </>
  );
}

function ClubsSkeleton() {
  return (
    <>
      <Text className="-my-2.5 py-2.5 text-[15px]" w="w-24" />
      <div className="flex flex-col gap-8">
        <header className="pt-4">
          <div className="flex items-center gap-4">
            <Bone className="h-8 w-12 shrink-0" />
            <Text className="font-display text-[28px] font-semibold leading-tight sm:text-[32px]" w="w-56" />
          </div>
          <Text className="mt-2 text-[14px]" w="w-28" />
        </header>
        <FolderGridSkeleton />
      </div>
    </>
  );
}

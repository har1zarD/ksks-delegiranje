import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ChevronLeft, Download, FileText, ShieldUser, Users } from "lucide-react";
import { Bone, ButtonSkeleton, SectionTitleSkeleton, Text } from "@/components/skeleton";
import { buttonClass, SectionTitle } from "@/components/ui";
import { getClubLicenses } from "@/lib/data/licenses";
import { FolderClubLogo } from "../../_components/folder";
import { LicenseCard, LicenseGrid, LicenseGridSkeleton } from "../../_components/license-card";

export const metadata = { title: "Licence kluba — KSKS" };

type Params = Promise<{ id: string; clubId: string }>;

export default function ClubLicensesPage({ params }: { params: Params }) {
  return (
    <Suspense fallback={<LicensesSkeleton />}>
      <Licenses params={params} />
    </Suspense>
  );
}

async function Licenses({ params }: { params: Params }) {
  const { id, clubId } = await params;
  const data = await getClubLicenses(id, clubId);
  if (!data) notFound();
  const { competition, club, players, officials } = data;
  const pdf = `/admin/licence/${competition.id}/${club.id}/pdf`;

  return (
    <>
      <Link href={`/admin/licence/${competition.id}`} className="-my-2.5 inline-flex items-center gap-1 py-2.5 text-[15px] font-semibold text-brand hover:opacity-75">
        <ChevronLeft className="size-4" /> {competition.name}
      </Link>
      <div className="flex flex-col gap-10">
        <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4 pt-4">
          <div className="flex min-w-0 items-center gap-4">
            <span aria-hidden="true" className="grid size-14 shrink-0 place-items-center rounded-lg border border-line bg-panel shadow-panel">
              <FolderClubLogo src={club.logoUrl} />
            </span>
            <div className="min-w-0">
              <h1 className="font-display text-[28px] font-semibold leading-tight tracking-[-0.04em] sm:text-[32px]">{club.name}</h1>
              <p className="mt-1 text-[14px] text-fg-muted">{[competition.name, competition.season && `sezona ${competition.season}`].filter(Boolean).join(" · ")}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <a href={pdf} target="_blank" rel="noopener" className={buttonClass("secondary")}>
              <FileText className="size-4" aria-hidden="true" /> PDF pregled
            </a>
            <a href={`${pdf}?preuzmi`} download className={buttonClass()}>
              <Download className="size-4" aria-hidden="true" /> Preuzmi PDF
            </a>
          </div>
        </header>

        <section>
          <SectionTitle icon={<Users />} count={players.length}>Igrači</SectionTitle>
          <LicenseGrid>
            {players.map((l) => (
              <li key={l.id}>
                <LicenseCard license={l} competition={competition} club={club} />
              </li>
            ))}
          </LicenseGrid>
        </section>

        {officials.length > 0 && (
          <section>
            <SectionTitle icon={<ShieldUser />} count={officials.length}>Službena lica</SectionTitle>
            <LicenseGrid>
              {officials.map((l) => (
                <li key={l.id}>
                  <LicenseCard license={l} competition={competition} club={club} />
                </li>
              ))}
            </LicenseGrid>
          </section>
        )}
      </div>
    </>
  );
}

function LicensesSkeleton() {
  return (
    <>
      <span className="-my-2.5 inline-flex items-center gap-1 py-2.5">
        <ChevronLeft className="size-4 text-fg-faint" />
        <Text className="text-[15px]" w="w-28" />
      </span>
      <div className="flex flex-col gap-10">
        <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4 pt-4">
          <div className="flex min-w-0 items-center gap-4">
            <Bone className="size-14 shrink-0 rounded-lg" />
            <div className="min-w-0">
              <Text className="font-display text-[28px] font-semibold leading-tight sm:text-[32px]" w="w-48" />
              <Text className="mt-1 text-[14px]" w="w-56" />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <ButtonSkeleton className="w-36" />
            <ButtonSkeleton className="w-36" />
          </div>
        </header>
        <section>
          <SectionTitleSkeleton count icon />
          <LicenseGridSkeleton />
        </section>
      </div>
    </>
  );
}

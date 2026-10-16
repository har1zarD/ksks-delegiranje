import Image from "next/image";
import Link from "next/link";
import { ChevronRight, Shield } from "lucide-react";
import { CompetitionLogo } from "@/components/competition-logo";
import { Bone, ButtonSkeleton, FieldSkeleton, Text, times } from "@/components/skeleton";
import { cx } from "@/components/ui";
import type { getLicenseCompetitions } from "@/lib/data/licenses";

/** Folder svih omladinskih takmičenja (kategorije) */
export const YOUTH_LEAGUE = "Omladinska liga KS";

/** KSKS logo za folder omladinske lige */
export function YouthLeagueLogo({ size = 44 }: { size?: number }) {
  return <Image src="/brand/ksks-logo.png" alt="" width={size} height={size} sizes={`${size}px`} className="object-contain" style={{ width: size, height: size }} />;
}

type LicenseCompetition = Awaited<ReturnType<typeof getLicenseCompetitions>>["others"][number];

/** Folderi takmičenja (kategorija): logo takmičenja, broj klubova i licenci */
export function CompetitionFolders({ competitions }: { competitions: LicenseCompetition[] }) {
  return competitions.map((c) => (
    <li key={c.id}>
      <Folder
        href={`/admin/licence/${c.id}`}
        logo={<CompetitionLogo name={c.name} category={c.category} size={44} />}
        title={c.name}
        meta={[c.season, `${c.clubCount} ${c.clubCount === 1 ? "klub" : "klubova"}`, `${c.count} licenci`].filter(Boolean).join(" · ")}
      />
    </li>
  ));
}

const TAB = "absolute left-0 top-0 z-10 h-[13px] w-24 rounded-t-lg border border-b-0 border-line bg-panel";
const BODY = "relative flex items-center gap-4 rounded-lg rounded-tl-none border border-line bg-panel px-4 py-5 shadow-panel sm:px-5";

/** Folder: jezičak gore lijevo, grb, naziv i brojke; vodi u sadržaj */
export function Folder({ href, logo, title, meta }: { href: string; logo: React.ReactNode; title: string; meta: string }) {
  return (
    <Link href={href} className="group relative block pt-3">
      <span aria-hidden="true" className={cx(TAB, "transition-colors group-hover:border-line-hover")} />
      <span className={cx(BODY, "transition-colors group-hover:border-line-hover group-hover:bg-panel-2")}>
        <span aria-hidden="true" className="grid size-14 shrink-0 place-items-center rounded-lg border border-line bg-panel-2 group-hover:bg-panel">
          {logo}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-display text-[19px] font-semibold leading-tight tracking-[-0.02em]">{title}</span>
          <span className="mt-1 block text-[13px] text-fg-muted">{meta}</span>
        </span>
        <ChevronRight className="size-5 shrink-0 text-fg-faint" aria-hidden="true" />
      </span>
    </Link>
  );
}

export function FolderGrid({ children }: { children: React.ReactNode }) {
  return <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</ul>;
}

/** Grb kluba u folderu (veći od ClubLogo) */
export function FolderClubLogo({ src }: { src: string | null }) {
  return src ? (
    <Image src={src} alt="" width={44} height={44} sizes="44px" className="size-11 object-contain" />
  ) : (
    <Shield className="size-7 text-fg-faint" strokeWidth={1.5} />
  );
}

export function FolderGridSkeleton({ count = 3 }: { count?: number }) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {times(count, (i) => (
        <li key={i} className="relative pt-3">
          <span aria-hidden="true" className={TAB} />
          <span className={BODY}>
            <Bone className="size-14 shrink-0 rounded-lg" />
            <span className="min-w-0 flex-1">
              <Text className="font-display text-[19px] font-semibold leading-tight" w={i % 2 ? "w-28" : "w-36"} />
              <Text className="mt-1 text-[13px]" w="w-32" />
            </span>
            <Bone className="size-5 shrink-0" />
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Kao FolderForm: takmičenje (ako nije zadano) i klub, dugme */
export function FolderFormSkeleton({ competition = true }: { competition?: boolean }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        {competition && <FieldSkeleton label="Takmičenje" />}
        <FieldSkeleton label="Klub" />
      </div>
      <ButtonSkeleton className="w-full sm:w-40" />
    </div>
  );
}

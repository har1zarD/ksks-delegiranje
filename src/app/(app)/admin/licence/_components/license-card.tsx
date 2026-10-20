import Image from "next/image";
import { Bone, Text, times } from "@/components/skeleton";
import { ClubLogo } from "@/components/team-name";
import { CARD, cx } from "@/components/ui";
import type { ClubLicenses, License } from "@/lib/data/licenses";
import { formatDate } from "@/lib/format";
import { LicensePortrait } from "./license-portrait";

const GRID = "grid grid-cols-[repeat(auto-fill,minmax(min(100%,320px),1fr))] gap-5";
const HEAD = "flex items-center gap-2.5 border-b border-line px-4 py-2.5";
const BODY = "grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] items-start gap-4 p-4";
const PHOTO = "aspect-[4/5] w-full rounded-lg";
const FACTS = "mx-4 mb-4 grid grid-cols-2 gap-x-5 gap-y-3 rounded-lg bg-panel-2 p-3";
const FOOT = "mt-auto flex min-h-14 items-center gap-2 border-t border-line px-3 py-2";

export function LicenseCard({ license: l, competition, club }: { license: License } & Pick<ClubLicenses, "competition" | "club">) {
  const player = l.kind === "player";
  const role = player ? (competition.category === "seniorke" ? "Igračica" : "Igrač") : (l.role ?? "Službeno lice");
  return (
    <article className={cx(CARD, "flex h-full flex-col overflow-hidden")}>
      <header className={HEAD}>
        <Image src="/brand/ksks-logo.svg" alt="" width={24} height={24} className="size-6 shrink-0" />
        <span className="min-w-0 flex-1 text-[12px] font-medium leading-snug text-fg-muted">{competition.name}</span>
        {competition.season && <span className="tabular shrink-0 rounded-md bg-panel-2 px-2 py-1 text-[11px] font-medium text-fg-muted">{competition.season}</span>}
      </header>

      <div className={BODY}>
        <LicensePortrait src={l.photoUrl} name={`${l.firstName} ${l.lastName}`} />
        <div className="flex min-w-0 flex-col items-start py-1">
          <span className="max-w-full rounded-md bg-panel-2 px-2 py-1 text-[11px] font-medium leading-snug text-fg-muted">{role}</span>
          <h3 className="mt-3 break-words font-display text-[22px] font-semibold leading-[1.15] tracking-[-0.03em]">
            <span className="block text-[16px] font-normal tracking-normal text-fg-muted">{l.firstName}</span>
            <span className="mt-1 block">{l.lastName}</span>
          </h3>
          {l.licenseNo && (
            <dl className="mt-4">
              <Fact label="Broj licence" value={l.licenseNo} />
            </dl>
          )}
        </div>
      </div>

      {player && (
        <dl className={FACTS}>
          <Fact label="Datum rođenja" value={l.birthDate && formatDate(l.birthDate)} />
          <Fact label="Mjesto rođenja" value={l.birthPlace} />
          <Fact label="Visina" value={l.heightCm ? `${l.heightCm} cm` : null} />
          <Fact label="Pozicija" value={l.position} />
        </dl>
      )}

      <footer className={FOOT}>
        <ClubLogo src={club.logoUrl} />
        <span className="min-w-0 flex-1 break-words text-[13px] font-medium">{club.name}</span>
      </footer>
    </article>
  );
}

function Fact({ label, value }: { label: string; value: string | number | null }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] text-fg-muted">{label}</dt>
      <dd className="tabular mt-0.5 break-words text-[13px] font-medium leading-snug">{value || "—"}</dd>
    </div>
  );
}

export function LicenseGrid({ children }: { children: React.ReactNode }) {
  return <ul className={GRID}>{children}</ul>;
}

export function LicenseGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <ul className={GRID}>
      {times(count, (i) => (
        <li key={i} className={cx(CARD, "flex flex-col overflow-hidden")}>
          <div className={HEAD}>
            <Bone className="size-6 shrink-0" />
            <Text className="text-[12px]" w="w-28" />
          </div>
          <div className={BODY}>
            <Bone className={PHOTO} />
            <div className="min-w-0 py-1">
              <Bone className="h-6 w-16 rounded-md" />
              <Text className="mt-3 text-[16px]" w="w-16" />
              <Text className="mt-1 font-display text-[22px] leading-tight" w={i % 2 ? "w-28" : "w-24"} />
            </div>
          </div>
          <div className={FACTS}>
            {times(4, (j) => (
              <div key={j}>
                <Text className="text-[11px]" w="w-20" />
                <Text className="mt-0.5 text-[13px]" w="w-16" />
              </div>
            ))}
          </div>
          <div className={FOOT}>
            <Bone className="h-8 w-12 shrink-0" />
            <Text className="text-[13px]" w="w-24" />
          </div>
        </li>
      ))}
    </ul>
  );
}

import Image from "next/image";
import { UserRound } from "lucide-react";
import { Bone, Text, times } from "@/components/skeleton";
import { ClubLogo } from "@/components/team-name";
import { CARD, cx } from "@/components/ui";
import type { ClubLicenses, License } from "@/lib/data/licenses";
import { formatDate } from "@/lib/format";

const HEAD = "flex items-center gap-2 border-b border-line bg-panel-2 py-1.5 pl-2 pr-4";
const PHOTO = "aspect-[3/4] w-[88px] shrink-0 overflow-hidden rounded-md border border-line bg-panel-2 sm:w-24";
const FOOT = "flex min-h-12 items-center gap-2 border-t border-line py-2 pl-2 pr-4";

/** Licenca kao kartica: grb saveza, takmičenje i sezona gore, fotografija i podaci, klub i broj licence dole */
export function LicenseCard({ license: l, competition, club }: { license: License } & Pick<ClubLicenses, "competition" | "club">) {
  const player = l.kind === "player";
  return (
    <article className={cx(CARD, "overflow-hidden")}>
      <header className={HEAD}>
        <Image src="/brand/ksks-logo.svg" alt="" width={32} height={32} className="size-8 shrink-0" />
        <span className="min-w-0 flex-1 truncate text-[12px] font-semibold uppercase tracking-[0.06em]">{competition.name}</span>
        {competition.season && <span className="tabular shrink-0 text-[12px] font-medium text-fg-muted">{competition.season}</span>}
      </header>

      <div className="flex gap-4 p-4">
        <div className={PHOTO}>
          {l.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- privremeni potpisani link iz Storagea
            <img src={l.photoUrl} alt={`${l.firstName} ${l.lastName}`} loading="lazy" className="size-full object-cover object-[50%_30%]" />
          ) : (
            <span className="grid size-full place-items-center text-fg-faint" aria-label="Bez fotografije">
              <UserRound className="size-9" strokeWidth={1.3} />
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-fg-faint">{player ? "Igrač" : (l.role ?? "Službeno lice")}</div>
          <h3 className="mt-0.5 break-words font-display text-[19px] font-semibold uppercase leading-tight tracking-[-0.01em]">{l.lastName}</h3>
          <div className="text-[15px] leading-snug">{l.firstName}</div>
          {player && (
            <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2">
              <Fact label="Rođen" value={l.birthDate && formatDate(l.birthDate)} />
              <Fact label="Mjesto" value={l.birthPlace} />
              <Fact label="Visina" value={l.heightCm && `${l.heightCm} cm`} />
              <Fact label="Pozicija" value={l.position} />
            </dl>
          )}
        </div>
      </div>

      <footer className={FOOT}>
        <ClubLogo src={club.logoUrl} />
        <span className="min-w-0 flex-1 truncate text-[13px] font-semibold">{club.name}</span>
        <span className="shrink-0 text-[12px] text-fg-muted">
          Br. licence <span className="tabular font-semibold text-fg">{l.licenseNo ?? "—"}</span>
        </span>
      </footer>
    </article>
  );
}

function Fact({ label, value }: { label: string; value: string | number | null }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-medium text-fg-faint">{label}</dt>
      <dd className="tabular truncate text-[13px] font-medium">{value || "—"}</dd>
    </div>
  );
}

export function LicenseGrid({ children }: { children: React.ReactNode }) {
  return <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{children}</ul>;
}

export function LicenseGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {times(count, (i) => (
        <li key={i} className={cx(CARD, "overflow-hidden")}>
          <div className={HEAD}>
            <Bone className="size-8 shrink-0" />
            <Text className="text-[12px]" w="w-28" />
          </div>
          <div className="flex gap-4 p-4">
            <Bone className={PHOTO} />
            <div className="min-w-0 flex-1">
              <Text className="text-[11px]" w="w-12" />
              <Text className="mt-0.5 font-display text-[19px] leading-tight" w={i % 2 ? "w-28" : "w-24"} />
              <Text className="text-[15px] leading-snug" w="w-16" />
              <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2">
                {times(4, (j) => (
                  <div key={j}>
                    <Text className="text-[11px]" w="w-10" />
                    <Text className="text-[13px]" w="w-16" />
                  </div>
                ))}
              </div>
            </div>
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

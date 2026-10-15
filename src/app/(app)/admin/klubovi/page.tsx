import { Suspense } from "react";
import { MapPin, Shield } from "lucide-react";
import { getClubs } from "@/lib/data/clubs";
import { ClubLogo } from "@/components/team-name";
import { Skeleton, Text, times } from "@/components/skeleton";
import { Empty, PageHeader, Rows, ROWS } from "@/components/ui";
import { ClubForm } from "./club-form";

export const metadata = { title: "Klubovi — KSKS" };

export default function ClubsPage() {
  return (
    <>
      <PageHeader
        icon={<Shield />}
        title="Klubovi"
        subtitle="Kontakti klubova: na ove adrese ide raspored utakmica (datum, vrijeme, dvorana, ekipe), bez službenih lica."
      />
      <Suspense fallback={<ClubsSkeleton />}>
        <Clubs />
      </Suspense>
    </>
  );
}

async function Clubs() {
  const clubs = await getClubs();
  const withEmail = clubs.filter((c) => c.email).length;
  if (clubs.length === 0) return <Empty icon={<Shield />}>Nema klubova. Klubovi nastaju kad dodaš ekipe u Takmičenjima.</Empty>;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[14px] text-fg-muted">
        {clubs.length} klubova, {withEmail} s emailom. Mailing lista za raspored su sve upisane adrese.
      </p>
      <Rows>
        {clubs.map((c) => (
          <li key={c.id} className="flex flex-col gap-4 py-5">
            <div className="flex items-start gap-3">
              <ClubLogo src={c.logoUrl} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <span className="text-[17px] font-semibold tracking-[-0.02em]">{c.name}</span>
                  {c.competitions.length > 0 && <span className="text-[13px] text-fg-faint">{c.competitions.join(" · ")}</span>}
                </div>
                {(c.city || c.hall) && (
                  <div className="mt-0.5 flex items-center gap-1 text-[13px] text-fg-muted">
                    <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
                    {[c.hall, c.city].filter(Boolean).join(", ")}
                  </div>
                )}
              </div>
            </div>
            <ClubForm clubId={c.id} email={c.email} phone={c.phone} />
          </li>
        ))}
      </Rows>
    </div>
  );
}

/** Kao lista klubova: grb, naziv i forma s kontaktima */
function ClubsSkeleton() {
  return (
    <Skeleton className="flex flex-col gap-4">
      <Text className="text-[14px]" w="w-72" />
      <ul className={ROWS}>
        {times(5, (i) => (
          <li key={i} className="flex flex-col gap-4 py-5">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-8 w-12 shrink-0 items-center justify-center" />
              <Text className="text-[17px] font-semibold" w={i % 2 ? "w-36" : "w-44"} />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_12rem_auto]">
              <Text className="h-11" w="w-full" />
              <Text className="h-11" w="w-full" />
              <Text className="h-11" w="w-24" />
            </div>
          </li>
        ))}
      </ul>
    </Skeleton>
  );
}

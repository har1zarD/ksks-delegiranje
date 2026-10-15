import Link from "next/link";
import { Suspense } from "react";
import { ChevronRight, GitBranch, Layers } from "lucide-react";
import { CompetitionLogo } from "@/components/competition-logo";
import { getCompetitionsOverview } from "@/lib/data/results";
import { Bone, ButtonSkeleton, FieldSkeleton, SectionTitleSkeleton, Skeleton, Text, times } from "@/components/skeleton";
import { Empty, Field, PageHeader, Panel, Rows, ROWS, SectionTitle } from "@/components/ui";
import { SENIOR_CATEGORIES } from "@/lib/crew";
import { ActionForm, Check } from "./action-form";
import { createSystemA } from "./actions";

export const metadata = { title: "Takmičenja — KSKS" };

export default function CompetitionsPage() {
  return (
    <>
      <PageHeader icon={<Layers />} title="Takmičenja" subtitle="Lige tekuće sezone, njihove ekipe, raspored i faze." />
      <Suspense fallback={<CompetitionsSkeleton />}>
        <Competitions />
      </Suspense>
    </>
  );
}

async function Competitions() {
  const competitions = await getCompetitionsOverview();
  // Sistem A pravi se iz omladinskih liga (seniorske nemaju tabelu u aplikaciji)
  const leagues = competitions.filter((c) => !c.parent_id && !(SENIOR_CATEGORIES as readonly string[]).includes(c.category));

  if (competitions.length === 0) return <Empty icon={<Layers />}>Nema takmičenja u tekućoj sezoni.</Empty>;

  return (
    <div className="flex flex-col gap-12">
      <Rows>
        {competitions.map((c) => (
          <li key={c.id}>
            <Link href={`/admin/takmicenja/${c.id}`} className="-mx-4 flex items-center gap-4 px-4 py-4 transition-colors hover:bg-panel-2 sm:-mx-6 sm:px-6">
              <CompetitionLogo name={c.name} category={c.category} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  {c.parent_id && <GitBranch className="size-4 shrink-0 text-brand" aria-label="Faza" />}
                  <span className="truncate font-display text-[22px] font-semibold leading-tight">{c.name}</span>
                </div>
                {c.format && <p className="mt-1 line-clamp-2 text-[13px] text-fg-muted">{c.format}</p>}
              </div>
              <div className="flex shrink-0 gap-4 text-center sm:gap-6">
                <Count value={c.teamCount} label="ekipa" />
                <Count value={c.matchCount} label="utakmica" />
              </div>
              <ChevronRight className="hidden size-5 shrink-0 text-fg-faint sm:block" />
            </Link>
          </li>
        ))}
      </Rows>

      {leagues.length > 0 && (
        <section>
          <SectionTitle icon={<GitBranch />}>Sistem A</SectionTitle>
          <Panel className="py-4 sm:py-6">
            <p className="mb-5 max-w-prose text-[14px] text-fg-muted">
              Novo takmičenje s prvih N ekipa iz izabranih liga, po tabeli nakon zadanog kola. Bodovi se ne prenose.
            </p>
            <ActionForm action={createSystemA} submit="Napravi takmičenje" pendingLabel="Pravim…">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Naziv" name="name" placeholder="Npr. Sistem A — kadeti" required />
                <Field label="Kratki naziv" name="short_name" placeholder="Sistem A K" />
                <Field label="Prvih N ekipa iz svake lige" name="top_n" type="number" inputMode="numeric" min={1} defaultValue={3} required />
                <Field label="Tabela nakon kola" name="max_round" type="number" inputMode="numeric" min={1} required />
              </div>
              <fieldset>
                <legend className="pb-2 text-[13px] font-medium text-fg-muted">Iz takmičenja</legend>
                <div className="grid gap-2 sm:grid-cols-2">
                  {leagues.map((c) => (
                    <Check key={c.id} name="source_ids" value={c.id} label={c.name} />
                  ))}
                </div>
              </fieldset>
            </ActionForm>
          </Panel>
        </section>
      )}
    </div>
  );
}

function Count({ value, label }: { value: number; label: string }) {
  return (
    <div className="min-w-10">
      <div className="scoreboard whitespace-nowrap text-[26px] font-semibold leading-none">{value}</div>
      <div className="mt-1 text-[11px] font-semibold text-fg-faint">{label}</div>
    </div>
  );
}

/** Kao lista takmičenja (naziv, sistem, broj ekipa i utakmica) i forma Sistem A */
function CompetitionsSkeleton() {
  return (
    <Skeleton className="flex flex-col gap-12">
      <ul className={ROWS}>
        {times(6, (i) => (
          <li key={i} className="flex items-center gap-4 py-4">
            <div className="min-w-0 flex-1">
              <Text className="font-display text-[22px] font-semibold leading-tight" w={i % 2 ? "w-44" : "w-56"} />
              <Text className="mt-1 text-[13px]" w="w-64" />
            </div>
            <div className="flex shrink-0 gap-4 text-center sm:gap-6">
              {times(2, (j) => (
                <div key={j} className="flex min-w-10 flex-col items-center">
                  <Text className="scoreboard text-[26px] font-semibold leading-none" w="w-7" />
                  <Text className="mt-1 text-[11px] font-semibold" w={j ? "w-12" : "w-8"} />
                </div>
              ))}
            </div>
            <Bone className="hidden size-5 shrink-0 sm:block" />
          </li>
        ))}
      </ul>
      <section>
        <SectionTitleSkeleton w="w-24" />
        <Panel className="py-4 sm:py-6">
          <Text className="mb-5 text-[14px]" w="w-96" />
          <div className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FieldSkeleton label="Naziv" />
              <FieldSkeleton label="Kratki naziv" />
              <FieldSkeleton label="Prvih N ekipa iz svake lige" />
              <FieldSkeleton label="Tabela nakon kola" />
            </div>
            <div>
              <span className="block pb-2 text-[13px] font-medium text-fg-muted">Iz takmičenja</span>
              <div className="grid gap-2 sm:grid-cols-2">
                {times(4, (i) => (
                  <span key={i} className="block h-12 rounded-md bg-panel-2" />
                ))}
              </div>
            </div>
            <ButtonSkeleton className="w-full sm:w-44" />
          </div>
        </Panel>
      </section>
    </Skeleton>
  );
}

import Link from "next/link";
import { Suspense } from "react";
import { ChevronRight, GitBranch } from "lucide-react";
import { getCompetitionsOverview } from "@/lib/data/results";
import { Empty, Field, Loading, PageHeader, Panel, Rows, SectionTitle } from "@/components/ui";
import { ActionForm, Check } from "./action-form";
import { createSystemA } from "./actions";

export const metadata = { title: "Takmičenja — KSKS" };

export default function CompetitionsPage() {
  return (
    <>
      <PageHeader title="Takmičenja" subtitle="Lige tekuće sezone, njihove ekipe, raspored i faze." />
      <Suspense fallback={<Loading />}>
        <Competitions />
      </Suspense>
    </>
  );
}

async function Competitions() {
  const competitions = await getCompetitionsOverview();
  const leagues = competitions.filter((c) => !c.parent_id);

  if (competitions.length === 0) return <Empty>Nema takmičenja u tekućoj sezoni.</Empty>;

  return (
    <div className="flex flex-col gap-12">
      <Rows>
        {competitions.map((c) => (
          <li key={c.id}>
            <Link href={`/admin/takmicenja/${c.id}`} className="-mx-3 px-3 rounded-md flex items-center gap-4 py-4 hover:bg-panel-2">
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
          <SectionTitle>Sistem A</SectionTitle>
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

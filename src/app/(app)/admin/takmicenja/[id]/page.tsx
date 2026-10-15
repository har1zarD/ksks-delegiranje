import { TeamSelect } from "@/components/team-select";
import { TeamName } from "@/components/team-name";
import { CompetitionLogo } from "@/components/competition-logo";
import Link from "next/link";
import { crewDefaultsOf, crewSummary } from "@/lib/crew";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ChevronDown, ChevronLeft, Trophy, Users, CalendarDays } from "lucide-react";
import { getCompetitionAdmin } from "@/lib/data/results";
import { Bone, ButtonSkeleton, FieldSkeleton, SectionTitleSkeleton, Skeleton, StandingsSkeleton, Text, TextButtonSkeleton, times } from "@/components/skeleton";
import { DateField, TimeField } from "@/components/date-picker";
import { ButtonLink, Field, Panel, SectionTitle, Textarea } from "@/components/ui";
import { StandingsTable } from "@/app/(app)/rezultati/standings-table";
import { ActionForm, Check } from "../action-form";
import { addTeam, createPhase, deleteCompetition, generateSchedule, removeTeam, updateCompetition } from "../actions";

export const metadata = { title: "Takmičenje — KSKS" };

export default function CompetitionPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <>
      <Link href="/admin/takmicenja" className="inline-flex items-center gap-1 text-[15px] font-semibold text-brand hover:opacity-75">
        <ChevronLeft className="size-4" /> Takmičenja
      </Link>
      <Suspense fallback={<CompetitionSkeleton />}>
        <Competition params={params} />
      </Suspense>
    </>
  );
}

async function Competition({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getCompetitionAdmin(id);
  if (!data) notFound();
  const { competition: c, teams, clubs, matchCount, standings, children } = data;
  const half = Math.ceil(teams.length / 2);

  return (
    <div className="flex flex-col gap-10">
      <header className="pt-4">
        <div className="flex items-center gap-4"><CompetitionLogo name={c.name} category={c.category} /><h1 className="min-w-0 font-display text-[28px] font-semibold leading-tight tracking-[-0.04em] sm:text-[32px]">{c.name}</h1></div>
        {c.parent && (
          <p className="mt-2 text-[14px] text-fg-muted">
            Faza takmičenja{" "}
            <Link href={`/admin/takmicenja/${c.parent.id}`} className="font-semibold text-brand underline-offset-4 hover:underline">
              {c.parent.name}
            </Link>
            {c.carry_over_h2h && ", prenose se međusobni rezultati"}
          </p>
        )}
        {children.length > 0 && (
          <p className="mt-2 text-[14px] text-fg-muted">
            Faze:{" "}
            {children.map((ch, i) => (
              <span key={ch.id}>
                {i > 0 && ", "}
                <Link href={`/admin/takmicenja/${ch.id}`} className="font-semibold text-brand underline-offset-4 hover:underline">
                  {ch.name}
                </Link>
              </span>
            ))}
          </p>
        )}
        <div className="mt-5 flex flex-wrap gap-2">
          <ButtonLink href={`/rezultati?takmicenje=${c.id}`} variant="secondary">
            Rezultati i tabela
          </ButtonLink>
          <ButtonLink href={`/admin/utakmice?takmicenje=${c.id}`} variant="secondary">
            Utakmice
          </ButtonLink>
        </div>
      </header>

      {/* Brojke takmičenja; broj sudija i stola dolazi iz pravila u Naknadama */}
      <Panel className="grid grid-cols-2 gap-x-4 gap-y-6 py-4 sm:grid-cols-4 sm:py-6">
        <Fact value={teams.length} label="ekipa" />
        <Fact value={matchCount} label="utakmica" />
        <div className="col-span-2 min-w-0">
          <div className="text-[15px] font-semibold">{crewSummary(crewDefaultsOf(c))}</div>
          <div className="mt-1 text-[13px] text-fg-muted">{c.split_nominations ? "sastav, sudije i sto odvojeno" : "sastav na utakmici"}</div>
        </div>
        <p className="col-span-2 text-[13px] text-fg-muted sm:col-span-4">
          Sastav ekipe i cijene naknada mijenjaš u{" "}
          <Link href="/admin/naknade" className="font-semibold text-brand underline-offset-4 hover:underline">
            Naknadama
          </Link>
          .
        </p>
      </Panel>

      <section>
        <SectionTitle icon={<Users />} count={teams.length}>Ekipe</SectionTitle>
        <Panel className="overflow-hidden">
          {teams.length > 0 && (
            <ul className="divide-y divide-line border-b border-line">
              {teams.map((t) => (
                <li key={t.id} className="flex items-center gap-3 py-2">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-display text-[19px] font-semibold"><TeamName name={t.name} logoUrl={t.club?.logo_url} /></span>
                    {t.club && t.club.short_name !== t.name && (
                      <span className="block truncate text-[13px] text-fg-muted">{t.club.short_name}</span>
                    )}
                  </span>
                  <ActionForm action={removeTeam} submit="Ukloni" pendingLabel="…" variant="destructive">
                    <input type="hidden" name="id" value={t.id} />
                  </ActionForm>
                </li>
              ))}
            </ul>
          )}
          <div className="py-4 sm:py-5">
            <ActionForm action={addTeam} submit="Dodaj ekipu" success="Ekipa dodana.">
              <input type="hidden" name="competition_id" value={c.id} />
              <div className="grid gap-4 sm:grid-cols-2">
                <TeamSelect label="Klub" name="club_id" placeholder="Izaberi klub" required allowNew options={clubs.map((club) => ({ id: club.id, name: club.name, logoUrl: club.logo_url }))} />
                <Field label="Naziv ekipe u takmičenju" name="name" placeholder="Npr. Ilidža Orange, Čelik" required />
              </div>
            </ActionForm>
          </div>
        </Panel>
      </section>

      {matchCount === 0 && teams.length >= 2 && (
        <section>
          <SectionTitle icon={<CalendarDays />}>Raspored</SectionTitle>
          <Panel className="py-4 sm:py-6">
            <p className="mb-5 max-w-prose text-[14px] text-fg-muted">
              Svako sa svakim (Bergerove tablice). Kola idu sedmično od prvog datuma, u dvorani domaćina; datume poslije
              mijenjaš po utakmici.
            </p>
            <ActionForm action={generateSchedule} submit="Napravi raspored" pendingLabel="Pravim…">
              <input type="hidden" name="competition_id" value={c.id} />
              <div className="grid gap-4 sm:grid-cols-2">
                <DateField label="Prvo kolo" name="start_date" defaultValue={c.starts_on ?? undefined} required />
                <TimeField label="Vrijeme" name="time" step={300} defaultValue="18:00" required />
              </div>
              <Check name="double" label="Dvokružno (domaćin i gost)" defaultChecked />
            </ActionForm>
          </Panel>
        </section>
      )}

      {standings.length > 0 && (
        <section>
          <SectionTitle icon={<Trophy />}>Tabela</SectionTitle>
          <StandingsTable rows={standings} />
        </section>
      )}

      {!c.parent_id && teams.length >= 2 && (
        <Collapsible title="Druga faza" hint="Liga 4 za prvaka ili liga za plasman, po trenutnoj tabeli">
          <ActionForm action={createPhase} submit="Napravi fazu" pendingLabel="Pravim…">
            <input type="hidden" name="source_id" value={c.id} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Naziv" name="name" placeholder="Npr. Kadeti — Liga 4 za prvaka" required />
              <Field label="Kratki naziv" name="short_name" placeholder="Kadeti L4" />
              <Field label="Od mjesta" name="from" type="number" inputMode="numeric" min={1} max={teams.length} defaultValue={1} required />
              <Field
                label="Do mjesta"
                name="to"
                type="number"
                inputMode="numeric"
                min={1}
                max={teams.length}
                defaultValue={Math.min(4, half)}
                required
              />
            </div>
            <Check name="carry_over" label="Prenose se rezultati međusobnih utakmica" defaultChecked />
          </ActionForm>
        </Collapsible>
      )}

      <Collapsible title="Podaci takmičenja" hint="Naziv, početak, kotizacija, trajanje perioda">
        <ActionForm action={updateCompetition} submit="Sačuvaj" success="Sačuvano.">
          <input type="hidden" name="id" value={c.id} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Naziv" name="name" defaultValue={c.name} required />
            <Field label="Kratki naziv" name="short_name" defaultValue={c.short_name ?? ""} />
            <DateField label="Početak" name="starts_on" defaultValue={c.starts_on ?? ""} />
            <DateField label="Rok uplate kotizacije" name="fee_due_on" defaultValue={c.fee_due_on ?? ""} />
            <Field label="Kotizacija (KM)" name="fee_km" inputMode="decimal" defaultValue={c.fee_km ?? ""} />
            <Field label="Prvi dio kotizacije (KM)" name="fee_first_km" inputMode="decimal" defaultValue={c.fee_first_km ?? ""} />
            <Field label="Broj perioda" name="periods" type="number" inputMode="numeric" min={1} max={8} defaultValue={c.periods} required />
            <Field label="Trajanje perioda (min)" name="period_min" type="number" inputMode="numeric" min={1} max={20} defaultValue={c.period_min} required />
          </div>
          <Textarea label="Sistem takmičenja" name="format" rows={3} defaultValue={c.format ?? ""} />
        </ActionForm>
      </Collapsible>

      {teams.length === 0 && matchCount === 0 && (
        <section className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
          <p className="text-[13px] text-fg-muted">Takmičenje nema ekipa ni utakmica i može se obrisati.</p>
          <ActionForm action={deleteCompetition} submit="Obriši takmičenje" pendingLabel="Brišem…" variant="destructive">
            <input type="hidden" name="id" value={c.id} />
          </ActionForm>
        </section>
      )}
    </div>
  );
}

function Fact({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <div className="scoreboard whitespace-nowrap text-[28px] font-semibold leading-none">{value}</div>
      <div className="mt-1.5 text-[13px] text-fg-muted">{label}</div>
    </div>
  );
}

/** Panel koji se otvara klikom na naslov (rijetke radnje) */
function Collapsible({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) {
  return (
    <details className="group overflow-hidden rounded-lg border border-line bg-panel shadow-panel px-4 sm:px-5">
      <summary className="-mx-4 flex cursor-pointer list-none items-center gap-4 px-4 py-4 transition-colors hover:bg-panel-2 sm:-mx-5 sm:px-5 [&::-webkit-details-marker]:hidden">
        <span className="min-w-0 flex-1">
          <span className="block font-display text-[22px] font-semibold tracking-tight">{title}</span>
          <span className="block text-[13px] text-fg-muted">{hint}</span>
        </span>
        <ChevronDown className="size-5 shrink-0 text-fg-faint transition-transform group-open:rotate-180" />
      </summary>
      <div className="border-t border-line py-4 sm:py-6">{children}</div>
    </details>
  );
}

/** Kao stranica takmičenja: naziv i linkovi, brojke, ekipe s formom, tabela, rijetke radnje */
function CompetitionSkeleton() {
  return (
    <Skeleton className="flex flex-col gap-10">
      <div className="pt-4">
        <Text className="font-display text-[28px] font-semibold leading-tight sm:text-[32px]" w="w-64" />
        <div className="mt-5 flex flex-wrap gap-2">
          <ButtonSkeleton className="w-40" />
          <ButtonSkeleton className="w-28" />
        </div>
      </div>
      <Panel className="grid grid-cols-2 gap-x-4 gap-y-6 py-4 sm:grid-cols-4 sm:py-6">
        {times(2, (i) => (
          <div key={i}>
            <Text className="scoreboard text-[28px] font-semibold leading-none" w="w-8" />
            <Text className="mt-1.5 text-[13px]" w="w-14" />
          </div>
        ))}
        <div className="col-span-2 min-w-0">
          <Text className="text-[15px] font-semibold" w="w-64" />
          <Text className="mt-1 text-[13px]" w="w-40" />
        </div>
        <Text className="col-span-2 text-[13px] sm:col-span-4" w="w-80" />
      </Panel>
      <section>
        <SectionTitleSkeleton w="w-20" count />
        <Panel className="overflow-hidden">
          <ul className="divide-y divide-line border-b border-line">
            {times(6, (i) => (
              <li key={i} className="flex items-center gap-3 py-2">
                <span className="min-w-0 flex-1">
                  <Text className="font-display text-[19px] font-semibold" w={i % 2 ? "w-36" : "w-48"} />
                </span>
                <TextButtonSkeleton />
              </li>
            ))}
          </ul>
          <div className="flex flex-col gap-4 py-4 sm:py-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <FieldSkeleton label="Klub" />
              <FieldSkeleton label="Naziv ekipe u takmičenju" />
            </div>
            <ButtonSkeleton className="w-full sm:w-32" />
          </div>
        </Panel>
      </section>
      <section>
        <SectionTitleSkeleton w="w-16" />
        <StandingsSkeleton rows={6} />
      </section>
      {times(2, (i) => (
        <div key={i} className="flex items-center gap-4 rounded-lg border border-line bg-panel px-4 py-4 shadow-panel sm:px-5">
          <span className="min-w-0 flex-1">
            <Text className="font-display text-[22px] font-semibold" w="w-44" />
            <Text className="text-[13px]" w="w-72" />
          </span>
          <Bone className="size-5 shrink-0" />
        </div>
      ))}
    </Skeleton>
  );
}

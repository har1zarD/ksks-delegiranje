import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ChevronDown, ChevronLeft } from "lucide-react";
import { getCompetitionAdmin } from "@/lib/data/results";
import { ButtonLink, Field, Loading, Panel, SectionTitle, Textarea } from "@/components/ui";
import { StandingsTable } from "@/app/(app)/rezultati/standings-table";
import { ActionForm, Check, Select } from "../action-form";
import { addTeam, createPhase, generateSchedule, removeTeam, updateCompetition } from "../actions";

export const metadata = { title: "Takmičenje — KSKS" };

export default function CompetitionPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <>
      <Link href="/admin/takmicenja" className="inline-flex items-center gap-1 text-[15px] font-semibold text-gold hover:opacity-75">
        <ChevronLeft className="size-4" /> Takmičenja
      </Link>
      <Suspense fallback={<Loading />}>
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
        <h1 className="font-display text-[28px] font-semibold leading-tight tracking-[-0.04em] sm:text-[32px]">{c.name}</h1>
        {c.parent && (
          <p className="mt-2 text-[14px] text-fg-muted">
            Faza takmičenja{" "}
            <Link href={`/admin/takmicenja/${c.parent.id}`} className="font-semibold text-gold">
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
                <Link href={`/admin/takmicenja/${ch.id}`} className="font-semibold text-gold">
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
        <Fact value={c.referee_count_default} label="sudije po utakmici" />
        <Fact value={c.table_count_default} label="za zapisničkim stolom" />
        <p className="col-span-2 text-[13px] text-fg-muted sm:col-span-4">
          Broj sudija, stola i cijene naknada mijenjaš u{" "}
          <Link href="/admin/naknade" className="font-semibold text-gold">
            Naknadama
          </Link>
          .
        </p>
      </Panel>

      <section>
        <SectionTitle count={teams.length}>Ekipe</SectionTitle>
        <Panel className="overflow-hidden">
          {teams.length > 0 && (
            <ul className="divide-y divide-line border-b border-line">
              {teams.map((t) => (
                <li key={t.id} className="flex items-center gap-3 py-2">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-display text-[19px] font-semibold">{t.name}</span>
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
                <Select label="Klub" name="club_id" defaultValue="" required>
                  <option value="" disabled>
                    Izaberi klub
                  </option>
                  {clubs.map((cl) => (
                    <option key={cl.id} value={cl.id}>
                      {cl.name}
                    </option>
                  ))}
                </Select>
                <Field label="Naziv ekipe u takmičenju" name="name" placeholder="Npr. Ilidža Orange" required />
              </div>
            </ActionForm>
          </div>
        </Panel>
      </section>

      {matchCount === 0 && teams.length >= 2 && (
        <section>
          <SectionTitle>Raspored</SectionTitle>
          <Panel className="py-4 sm:py-6">
            <p className="mb-5 max-w-prose text-[14px] text-fg-muted">
              Svako sa svakim (Bergerove tablice). Kola idu sedmično od prvog datuma, u dvorani domaćina; datume poslije
              mijenjaš po utakmici.
            </p>
            <ActionForm action={generateSchedule} submit="Napravi raspored" pendingLabel="Pravim…">
              <input type="hidden" name="competition_id" value={c.id} />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Prvo kolo" name="start_date" type="date" defaultValue={c.starts_on ?? undefined} required />
                <Field label="Vrijeme" name="time" type="time" step={300} defaultValue="18:00" required />
              </div>
              <Check name="double" label="Dvokružno (domaćin i gost)" defaultChecked />
            </ActionForm>
          </Panel>
        </section>
      )}

      {standings.length > 0 && (
        <section>
          <SectionTitle>Tabela</SectionTitle>
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
            <Field label="Početak" name="starts_on" type="date" defaultValue={c.starts_on ?? ""} />
            <Field label="Rok uplate kotizacije" name="fee_due_on" type="date" defaultValue={c.fee_due_on ?? ""} />
            <Field label="Kotizacija (KM)" name="fee_km" inputMode="decimal" defaultValue={c.fee_km ?? ""} />
            <Field label="Prvi dio kotizacije (KM)" name="fee_first_km" inputMode="decimal" defaultValue={c.fee_first_km ?? ""} />
            <Field label="Broj perioda" name="periods" type="number" inputMode="numeric" min={1} max={8} defaultValue={c.periods} required />
            <Field label="Trajanje perioda (min)" name="period_min" type="number" inputMode="numeric" min={1} max={20} defaultValue={c.period_min} required />
          </div>
          <Textarea label="Sistem takmičenja" name="format" rows={3} defaultValue={c.format ?? ""} />
        </ActionForm>
      </Collapsible>
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
    <details className="group rounded-lg border border-line bg-panel px-4 sm:px-5">
      <summary className="flex cursor-pointer list-none items-center gap-4 py-4 [&::-webkit-details-marker]:hidden">
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

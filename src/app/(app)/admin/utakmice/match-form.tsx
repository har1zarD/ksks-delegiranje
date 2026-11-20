"use client";

import { useActionState, useState } from "react";
import { CalendarDays, Clock } from "lucide-react";
import { TeamSelect } from "@/components/team-select";
import { CrewEditor } from "@/components/crew-editor";
import { DateField, TimeField } from "@/components/date-picker";
import { Bone, ButtonSkeleton, FieldSkeleton, Text } from "@/components/skeleton";
import { Select } from "@/components/select";
import { confirmSubmit } from "@/components/confirm";
import { Button, cx, Field } from "@/components/ui";
import { crewDefaultsOf, type Crew } from "@/lib/crew";
import { formatKM, matchCost, type FeeRules } from "@/lib/finance";
import { MATCH_KIND_LABEL, MATCH_STATUS_LABEL, type MatchKind, type MatchStatus } from "@/lib/format";
import { saveMatch, type MatchFormState } from "./actions";

const NUMBER_HINT = "Sljedeći slobodan u takmičenju; možeš upisati broj iz rasporeda.";

type Competition = FeeRules &
  Parameters<typeof crewDefaultsOf>[0] & {
  id: string;
  name: string;
  teams: { id: string; name: string; club: { hall_id: string | null; logo_url: string | null } | null }[];
};

export type MatchFormValues = {
  id?: string;
  number?: number;
  kind?: MatchKind;
  kind_label?: string | null;
  competition_id?: string;
  round?: number | null;
  home_team_id?: string;
  away_team_id?: string;
  hall_id?: string | null;
  date?: string;
  time?: string;
  crew?: Crew;
  status?: MatchStatus;
  notes?: string | null;
  /** Aktivirana utakmica: izmjena termina, dvorane ili statusa ide mailom službenim licima i klubovima */
  published_at?: string | null;
};

export function MatchForm({
  competitions,
  halls,
  values = {},
  nextNumbers = {},
}: {
  competitions: Competition[];
  halls: { id: string; name: string }[];
  values?: MatchFormValues;
  /** Sljedeći slobodan broj po takmičenju (nova utakmica) */
  nextNumbers?: Record<string, number>;
}) {
  const [state, action, pending] = useActionState<MatchFormState, FormData>(saveMatch, {});
  const [competitionId, setCompetitionId] = useState(values.competition_id ?? competitions[0]?.id ?? "");
  const competition = competitions.find((c) => c.id === competitionId);
  const [hallId, setHallId] = useState(values.hall_id ?? "");
  const [kind, setKind] = useState<MatchKind>(values.kind ?? "league");
  // Nova utakmica preuzima sastav iz pravila takmičenja; postojeća zadržava svoj
  const [crew, setCrew] = useState<Crew | null>(values.crew ?? (competition ? crewDefaultsOf(competition) : null));
  const teams = competition?.teams ?? [];
  const isEdit = Boolean(values.id);
  // Broj se broji po takmičenju: nova utakmica predlaže sljedeći slobodan u izabranom takmičenju
  const [number, setNumber] = useState(String(values.number ?? (isEdit ? "" : nextNumbers[competitionId] ?? 1)));
  const cost = crew ? matchCost(competition ?? null, crew) : null;

  return (
    <form
      action={action}
      className="grid gap-4 sm:grid-cols-2"
      onSubmit={(e) => {
        // Aktivirana utakmica: promjena termina, dvorane ili statusa ide mailom, pa prvo upozorenje
        if (!isEdit || !values.published_at) return;
        const f = new FormData(e.currentTarget);
        // Odgođena vraćena u zakazane ne šalje izmjenu: ponovo čeka aktiviranje kao nova nominacija
        if (values.status === "postponed" && f.get("status") === "scheduled") return;
        const changed =
          f.get("date") !== values.date || f.get("time") !== values.time || String(f.get("hall_id") ?? "") !== (values.hall_id ?? "") || f.get("status") !== values.status;
        if (!changed) return;
        confirmSubmit({
          title: "Poslati izmjenu?",
          message: "Ova izmjena će biti poslana na email svim službenim licima na utakmici i klubovima (omladinska liga). Promijenjeni podaci su označeni crveno.",
          confirmLabel: "Sačuvaj i pošalji",
        })(e);
      }}
    >
      {values.id && <input type="hidden" name="id" value={values.id} />}
      <input type="hidden" name="kind" value={kind} />

      <Field
        label="Broj utakmice"
        name="number"
        type="number"
        inputMode="numeric"
        min={1}
        value={number}
        onChange={(e) => setNumber(e.target.value)}
        placeholder="Sljedeći slobodan"
        hint={isEdit ? undefined : NUMBER_HINT}
        required={isEdit}
      />
      <Field label="Kolo" name="round" type="number" inputMode="numeric" min={1} defaultValue={values.round ?? ""} />
      {/* Vrsta: samo liga ulazi u tabelu */}
      <div className="flex flex-col gap-1.5 sm:col-span-2">
        <span className="text-[13px] font-medium text-fg-muted">Vrsta utakmice</span>
        <div role="radiogroup" aria-label="Vrsta utakmice" className="grid grid-cols-2 gap-0.5 rounded-lg bg-track p-[3px] sm:inline-grid sm:w-fit sm:grid-cols-4">
          {(Object.keys(MATCH_KIND_LABEL) as MatchKind[]).map((k) => (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={kind === k}
              onClick={() => setKind(k)}
              className={cx(
                "h-10 rounded-md px-4 text-[14px] font-semibold transition-colors sm:h-9",
                kind === k ? "bg-panel-3 text-fg shadow-segment" : "text-fg-muted hover:bg-panel-3/60 hover:text-fg",
              )}
            >
              {MATCH_KIND_LABEL[k]}
            </button>
          ))}
        </div>
        {kind !== "league" && <span className="text-[12px] text-faint">Ne ulazi u tabelu takmičenja; delegira se i plaća normalno.</span>}
      </div>
      {kind === "custom" && (
        <Field
          className="sm:col-span-2"
          label="Naziv"
          name="kind_label"
          defaultValue={values.kind_label ?? ""}
          placeholder="Npr. Memorijalni turnir, revijalna utakmica"
          required
          maxLength={80}
        />
      )}

      <Select
        className="sm:col-span-2"
        label="Takmičenje"
        name="competition_id"
        value={competitionId}
        onChange={(e) => {
          setCompetitionId(e.target.value);
          const next = competitions.find((c) => c.id === e.target.value);
          if (next && !isEdit) {
            setCrew(crewDefaultsOf(next));
            setNumber(String(nextNumbers[next.id] ?? 1));
          }
        }}
        required
      >
        {competitions.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </Select>

      {/* key: kad se promijeni takmičenje, izbor ekipa se resetuje */}
      <TeamSelect
        key={`home-${competitionId}`}
        label="Domaćin"
        name="home_team_id"
        defaultValue={values.competition_id === competitionId ? values.home_team_id : ""}
        options={teams.map((t) => ({ id: t.id, name: t.name, logoUrl: t.club?.logo_url ?? null }))}
        onChange={(e) => {
          const hall = teams.find((t) => t.id === e.target.value)?.club?.hall_id;
          if (hall && !hallId) setHallId(hall);
        }}
        required
      />
      <TeamSelect
        key={`away-${competitionId}`}
        label="Gost"
        name="away_team_id"
        defaultValue={values.competition_id === competitionId ? values.away_team_id : ""}
        options={teams.map((t) => ({ id: t.id, name: t.name, logoUrl: t.club?.logo_url ?? null }))}
        required
      />

      <DateField label="Datum" name="date" defaultValue={values.date} required />
      <TimeField label="Vrijeme" name="time" step={300} defaultValue={values.time ?? "18:00"} required />

      <Select label="Dvorana" name="hall_id" value={hallId} onChange={(e) => setHallId(e.target.value)}>
        <option value="">Nije određena</option>
        {halls.map((h) => (
          <option key={h.id} value={h.id}>
            {h.name}
          </option>
        ))}
      </Select>
      {isEdit ? (
        <Select label="Status" name="status" defaultValue={values.status}>
          {(Object.keys(MATCH_STATUS_LABEL) as MatchStatus[]).map((s) => (
            <option key={s} value={s}>
              {MATCH_STATUS_LABEL[s]}
            </option>
          ))}
        </Select>
      ) : (
        <Field label="Napomena" name="notes" defaultValue={values.notes ?? ""} />
      )}

      {/* Sastav ekipe (iz pravila takmičenja, može se promijeniti) i trošak */}
      {crew && cost && (
        <div className="flex flex-col gap-5 rounded-lg border border-line bg-panel px-4 py-4 shadow-panel sm:col-span-2 sm:px-5 sm:py-5">
          <div>
            <p className="text-[15px] font-semibold">Sastav ekipe</p>
            <p className="mt-0.5 text-[13px] text-fg-muted">
              {competition && !competition.referees_default && !competition.commissioner_default
                ? "U ovom takmičenju se delegiraju samo pomoćne sudije."
                : "Ko se delegira na ovu utakmicu. Podrazumijevano iz pravila takmičenja."}
            </p>
          </div>
          <CrewEditor
            value={crew}
            onChange={setCrew}
            // Takmičenje bez sudija i komesara: samo pomoćne sudije (red sa sudijama se ne prikazuje)
            tableOnly={Boolean(competition && !competition.referees_default && !competition.commissioner_default && !crew.referees && !crew.commissioner)}
          />
          <div className="flex items-baseline justify-between gap-3 border-t border-line pt-4">
            <span className="text-[13px] text-fg-muted">
              Trošak utakmice
              {cost.missing && <span className="text-orange">, neke cijene nisu određene</span>}
            </span>
            <span className="scoreboard whitespace-nowrap text-[26px] font-semibold">{formatKM(cost.total)}</span>
          </div>
        </div>
      )}

      {isEdit && <Field label="Napomena" name="notes" defaultValue={values.notes ?? ""} className="sm:col-span-2" />}

      <div className="flex flex-wrap items-center gap-4 sm:col-span-2">
        <Button type="submit" disabled={pending} className="w-full sm:w-auto">
          {pending ? "Čuvam…" : isEdit ? "Sačuvaj izmjene" : "Dodaj utakmicu"}
        </Button>
        {state.error && (
          <p role="alert" className="text-[14px] text-crest">
            {state.error}
          </p>
        )}
      </div>
    </form>
  );
}

/** Kao MatchForm dok se učitavaju takmičenja i dvorane: ista polja, sastav ekipe i trošak */
export function MatchFormSkeleton({ edit }: { edit?: boolean }) {
  return (
    <div role="status" aria-busy="true" aria-label="Učitavam" className="grid gap-4 sm:grid-cols-2">
      <div className="flex min-w-0 flex-col gap-1.5">
        <FieldSkeleton label="Broj utakmice" />
        {!edit && <span className="text-[12px] text-faint">{NUMBER_HINT}</span>}
      </div>
      <FieldSkeleton label="Kolo" />
      <div className="flex flex-col gap-1.5 sm:col-span-2">
        <span className="text-[13px] font-medium text-fg-muted">Vrsta utakmice</span>
        <div className="grid grid-cols-2 gap-0.5 rounded-lg bg-track p-[3px] sm:inline-grid sm:w-fit sm:grid-cols-4">
          {(Object.keys(MATCH_KIND_LABEL) as MatchKind[]).map((k, i) => (
            <span
              key={k}
              className={cx("flex h-10 items-center justify-center rounded-md px-4 text-[14px] font-semibold text-fg-muted sm:h-9", i === 0 && "bg-panel-3 text-fg shadow-segment")}
            >
              {MATCH_KIND_LABEL[k]}
            </span>
          ))}
        </div>
      </div>
      <FieldSkeleton label="Takmičenje" className="sm:col-span-2" />
      <FieldSkeleton label="Domaćin" />
      <FieldSkeleton label="Gost" />
      <FieldSkeleton label="Datum" icon={<CalendarDays />} />
      <FieldSkeleton label="Vrijeme" icon={<Clock />} />
      <FieldSkeleton label="Dvorana" />
      <FieldSkeleton label={edit ? "Status" : "Napomena"} />
      <div className="flex flex-col gap-5 rounded-lg border border-line bg-panel px-4 py-4 shadow-panel sm:col-span-2 sm:px-5 sm:py-5">
        <div>
          <p className="text-[15px] font-semibold">Sastav ekipe</p>
          <Text className="mt-0.5 text-[13px]" w="w-80" />
          <Text className="text-[13px] sm:hidden" w="w-24" />
        </div>
        {/* Kao CrewEditor: izbori i prekidači istih visina, bez stanja */}
        <div className="flex flex-col gap-4">
          {[
            { label: "Sudije", choice: ["Bez", "2", "3"], toggles: ["Komesar"] },
            { label: "Sto", toggles: ["Zapisnik", "Pom. zapisnik", "Glavno vrijeme", "24/14"] },
            { label: "Statistika", choice: ["0", "1", "2", "3"], check: "Digitalni zapisnik" },
          ].map((row) => (
            <div key={row.label} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
              <span className="w-24 shrink-0 text-[13px] font-semibold text-fg-muted">{row.label}</span>
              <div className="flex flex-wrap items-center gap-2">
                {row.choice && (
                  <span className="inline-flex gap-0.5 rounded-lg bg-track p-[3px]">
                    {row.choice.map((c) => (
                      <span key={c} className="flex h-10 min-w-10 items-center justify-center rounded-md px-3 text-[14px] font-semibold text-fg-muted sm:h-8">
                        {c}
                      </span>
                    ))}
                  </span>
                )}
                {row.toggles?.map((t) => (
                  <span key={t} className="flex h-10 items-center rounded-md border border-line-strong bg-panel px-3 text-[14px] font-semibold text-fg-muted sm:h-9">
                    {t}
                  </span>
                ))}
                {row.check && (
                  <span className="flex h-10 items-center gap-2 px-1 text-[14px] font-medium text-fg-muted sm:h-9">
                    <Bone className="size-4 rounded-[4px]" />
                    {row.check}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-baseline justify-between gap-3 border-t border-line pt-4">
          <span className="text-[13px] text-fg-muted">Trošak utakmice</span>
          <Text className="scoreboard text-[26px] font-semibold" w="w-28" />
        </div>
      </div>
      {edit && <FieldSkeleton label="Napomena" className="sm:col-span-2" />}
      <div className="sm:col-span-2">
        <ButtonSkeleton className="w-full sm:w-40" />
      </div>
    </div>
  );
}

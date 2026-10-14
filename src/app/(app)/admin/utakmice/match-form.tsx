"use client";

import { useActionState, useState } from "react";
import { CrewEditor } from "@/components/crew-editor";
import { Button, cx, Field, Select } from "@/components/ui";
import { crewDefaultsOf, type Crew } from "@/lib/crew";
import { formatKM, matchCost, type FeeRules } from "@/lib/finance";
import { MATCH_KIND_LABEL, MATCH_STATUS_LABEL, type MatchKind, type MatchStatus } from "@/lib/format";
import { saveMatch, type MatchFormState } from "./actions";

type Competition = FeeRules &
  Parameters<typeof crewDefaultsOf>[0] & {
  id: string;
  name: string;
  teams: { id: string; name: string; club: { hall_id: string | null } | null }[];
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
};

export function MatchForm({
  competitions,
  halls,
  values = {},
}: {
  competitions: Competition[];
  halls: { id: string; name: string }[];
  values?: MatchFormValues;
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
  const cost = crew ? matchCost(competition ?? null, crew) : null;

  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      {values.id && <input type="hidden" name="id" value={values.id} />}
      <input type="hidden" name="kind" value={kind} />

      <Field
        label="Broj utakmice"
        name="number"
        type="number"
        inputMode="numeric"
        min={1}
        defaultValue={values.number ?? ""}
        placeholder="Sljedeći slobodan"
        hint={isEdit ? undefined : "Sljedeći slobodan u sezoni; možeš upisati broj iz rasporeda."}
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
                "h-9 rounded-md px-4 text-[14px] font-semibold transition-colors",
                kind === k ? "bg-panel-3 text-fg shadow-segment" : "text-fg-muted hover:text-fg",
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
          if (next && !isEdit) setCrew(crewDefaultsOf(next));
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
      <Select
        key={`home-${competitionId}`}
        label="Domaćin"
        name="home_team_id"
        defaultValue={values.competition_id === competitionId ? values.home_team_id : ""}
        onChange={(e) => {
          // Dvorana domaćina kao prijedlog, ako dvorana još nije izabrana
          const hall = teams.find((t) => t.id === e.target.value)?.club?.hall_id;
          if (hall && !hallId) setHallId(hall);
        }}
        required
      >
        <option value="" disabled>
          Izaberi ekipu
        </option>
        {teams.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </Select>
      <Select
        key={`away-${competitionId}`}
        label="Gost"
        name="away_team_id"
        defaultValue={values.competition_id === competitionId ? values.away_team_id : ""}
        required
      >
        <option value="" disabled>
          Izaberi ekipu
        </option>
        {teams.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </Select>

      <Field label="Datum" name="date" type="date" defaultValue={values.date} required />
      <Field label="Vrijeme" name="time" type="time" step={300} defaultValue={values.time ?? "18:00"} required />

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
            <p className="mt-0.5 text-[13px] text-fg-muted">Ko se delegira na ovu utakmicu. Podrazumijevano iz pravila takmičenja.</p>
          </div>
          <CrewEditor value={crew} onChange={setCrew} />
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

"use client";

import { useActionState, useState } from "react";
import { Button, cx, Field, Select } from "@/components/ui";
import { formatKM, matchCost, type FeeRules } from "@/lib/finance";
import { MATCH_STATUS_LABEL, type MatchStatus } from "@/lib/format";
import { saveMatch, type MatchFormState } from "./actions";

type Competition = FeeRules & {
  id: string;
  name: string;
  referee_count_default: number;
  table_count_default: number;
  teams: { id: string; name: string; club: { hall_id: string | null } | null }[];
};

export type MatchFormValues = {
  id?: string;
  competition_id?: string;
  round?: number | null;
  home_team_id?: string;
  away_team_id?: string;
  hall_id?: string | null;
  date?: string;
  time?: string;
  referee_count?: number;
  table_count?: number;
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
  // Nova utakmica preuzima broj sudija/stola iz pravila takmičenja; postojeća zadržava svoj
  const [refs, setRefs] = useState(values.referee_count ?? competition?.referee_count_default ?? 2);
  const [table, setTable] = useState(values.table_count ?? competition?.table_count_default ?? 2);
  const teams = competition?.teams ?? [];
  const isEdit = Boolean(values.id);
  const cost = matchCost(competition ?? null, refs, table);

  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      {values.id && <input type="hidden" name="id" value={values.id} />}
      <input type="hidden" name="referee_count" value={refs} />
      <input type="hidden" name="table_count" value={table} />

      <Select
        label="Takmičenje"
        name="competition_id"
        value={competitionId}
        onChange={(e) => {
          setCompetitionId(e.target.value);
          const next = competitions.find((c) => c.id === e.target.value);
          if (next && !isEdit) {
            setRefs(next.referee_count_default);
            setTable(next.table_count_default);
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
      <Field label="Kolo" name="round" type="number" inputMode="numeric" min={1} defaultValue={values.round ?? ""} />

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

      {/* Ekipa službenih lica i trošak po pravilima takmičenja */}
      <div className="flex flex-col gap-4 rounded-lg border border-line bg-panel shadow-panel px-4 sm:px-5 py-4 sm:col-span-2 sm:flex-row sm:items-center">
        <div className="flex flex-wrap gap-2">
          <Count label="Sudije" value={refs} onChange={setRefs} />
          <Count label="Sto" value={table} onChange={setTable} />
        </div>
        <div className="flex flex-1 items-baseline justify-between gap-3 sm:justify-end">
          <span className="text-[13px] text-fg-muted">
            Trošak utakmice
            {cost.missing && <span className="text-orange"> · neke cijene nisu određene</span>}
          </span>
          <span className="scoreboard whitespace-nowrap text-[28px] font-semibold text-brand">{formatKM(cost.total)}</span>
        </div>
      </div>

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

function Count({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-2 rounded-md bg-panel py-1 pl-3 pr-1" role="group" aria-label={label}>
      <span className="text-[13px] font-semibold text-fg-muted">{label}</span>
      {[2, 3].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          aria-pressed={value === n}
          className={cx(
            "scoreboard whitespace-nowrap grid size-10 place-items-center rounded-md text-[20px] font-semibold transition-colors",
            value === n ? "bg-brand text-[color:var(--brand-ink)]" : "text-fg-muted hover:text-fg",
          )}
        >
          {n}
        </button>
      ))}
    </div>
  );
}

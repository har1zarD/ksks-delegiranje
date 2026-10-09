"use client";

import { useActionState, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { Button, cx, inputClass } from "@/components/ui";
import { formatKM, matchCost, type FeeRules } from "@/lib/finance";
import { saveFeeRules, type RulesState } from "./actions";

export type CompetitionRules = {
  id: string;
  name: string;
  refereeCountDefault: number;
  tableCountDefault: number;
  rules: FeeRules;
};

const FIELDS: { key: keyof FeeRules; label: string; unit: string }[] = [
  {
    key: "fee_referee_2_km",
    label: "Sudija kad sude dvojica",
    unit: "po sudiji",
  },
  {
    key: "fee_referee_3_km",
    label: "Sudija kad sude trojica",
    unit: "po sudiji",
  },
  { key: "fee_table_km", label: "Zapisnički sto", unit: "po osobi" },
  { key: "fee_commissioner_km", label: "Komesar", unit: "po utakmici" },
];

function toNumber(v: string) {
  const n = Number(v.replace(",", "."));
  return v.trim() === "" || !Number.isFinite(n) ? null : n;
}

/** Pravila jednog takmičenja, s izračunom troška utakmice dok se kuca */
export function RulesForm({ competition }: { competition: CompetitionRules }) {
  const [state, action, pending] = useActionState<RulesState, FormData>(
    saveFeeRules,
    {},
  );
  const [values, setValues] = useState(
    () =>
      Object.fromEntries(
        FIELDS.map((f) => [
          f.key,
          competition.rules[f.key]?.toString().replace(".", ",") ?? "",
        ]),
      ) as Record<keyof FeeRules, string>,
  );
  const [refs, setRefs] = useState(competition.refereeCountDefault);
  const [table, setTable] = useState(competition.tableCountDefault);
  const [dirty, setDirty] = useState(false);

  const rules: FeeRules = {
    fee_referee_2_km: toNumber(values.fee_referee_2_km),
    fee_referee_3_km: toNumber(values.fee_referee_3_km),
    fee_table_km: toNumber(values.fee_table_km),
    fee_commissioner_km: toNumber(values.fee_commissioner_km),
  };
  const two = matchCost(rules, 2, table);
  const three = matchCost(rules, 3, table);
  const saved = state.saved !== undefined && !dirty && !state.error;

  const km = (v: number | null) =>
    v == null ? "—" : formatKM(v).replace(",00", "");
  const summary = Object.values(competition.rules).every((v) => v == null)
    ? null
    : `Dvojka ${km(competition.rules.fee_referee_2_km)}, trojka ${km(competition.rules.fee_referee_3_km)}, sto ${km(competition.rules.fee_table_km)}, komesar ${km(competition.rules.fee_commissioner_km)}`;

  return (
    <details className="group">
      <summary className="flex cursor-pointer list-none items-center gap-3 py-4 [&::-webkit-details-marker]:hidden">
        <span className="min-w-0 flex-1">
          <span className="block font-display text-[22px] font-semibold leading-tight tracking-tight">
            {competition.name}
          </span>
          <span
            className={cx(
              "block text-[13px]",
              summary ? "text-fg-muted" : "text-orange",
            )}
          >
            {summary ?? "Cijene nisu određene"}
          </span>
        </span>
        <ChevronDown className="size-5 shrink-0 text-fg-faint transition-transform group-open:rotate-180" />
      </summary>
      <form
        action={(fd) => {
          setDirty(false);
          return action(fd);
        }}
        onChange={() => setDirty(true)}
        className="flex flex-col gap-5 border-t border-line py-4 sm:py-6"
      >
        <input type="hidden" name="competition_id" value={competition.id} />
        <input type="hidden" name="referee_count_default" value={refs} />
        <input type="hidden" name="table_count_default" value={table} />

        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-[13px] text-fg-muted">
            Obično na utakmici
          </span>
          <div className="flex flex-wrap gap-2">
            <Toggle
              label="Sudije"
              value={refs}
              onChange={(v) => {
                setRefs(v);
                setDirty(true);
              }}
            />
            <Toggle
              label="Sto"
              value={table}
              onChange={(v) => {
                setTable(v);
                setDirty(true);
              }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {FIELDS.map((f) => (
            <label key={f.key} className="flex min-w-0 flex-col gap-1.5">
              <span className="text-[13px] font-medium leading-tight text-fg-muted">
                {f.label}
              </span>
              <div className="relative">
                <input
                  name={f.key}
                  inputMode="decimal"
                  value={values[f.key]}
                  onChange={(e) =>
                    setValues((v) => ({ ...v, [f.key]: e.target.value }))
                  }
                  placeholder="—"
                  className={cx(
                    inputClass,
                    "scoreboard whitespace-nowrap pr-12 text-[22px] font-semibold",
                  )}
                />
                <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[13px] font-semibold text-fg-faint">
                  KM
                </span>
              </div>
              <span className="text-[12px] text-fg-faint">{f.unit}</span>
            </label>
          ))}
        </div>

        {/* Trošak jedne utakmice za obje varijante sudija */}
        <div className="grid gap-x-8 gap-y-2 sm:grid-cols-2">
          <Cost
            title="Utakmica s dvojicom sudija"
            cost={two}
            highlight={refs === 2}
          />
          <Cost
            title="Utakmica s trojicom sudija"
            cost={three}
            highlight={refs === 3}
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={pending}>
            {pending ? "Čuvam…" : "Sačuvaj pravila"}
          </Button>
          {saved && (
            <span className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-mint">
              <Check className="size-4" /> Sačuvano
            </span>
          )}
          {state.error && (
            <p role="alert" className="text-[14px] text-crest">
              {state.error}
            </p>
          )}
        </div>
      </form>
    </details>
  );
}

function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div
      className="flex items-center gap-2 rounded-md bg-panel-2 py-1 pl-3 pr-1"
      role="group"
      aria-label={`${label}: koliko obično`}
    >
      <span className="text-[13px] font-semibold text-fg-muted">{label}</span>
      {[2, 3].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          aria-pressed={value === n}
          className={cx(
            "scoreboard whitespace-nowrap grid size-9 place-items-center rounded-md text-[18px] font-semibold transition-colors",
            value === n
              ? "bg-gold text-[color:var(--gold-ink)]"
              : "text-fg-muted hover:text-fg",
          )}
        >
          {n}
        </button>
      ))}
    </div>
  );
}

function Cost({
  title,
  cost,
  highlight,
}: {
  title: string;
  cost: ReturnType<typeof matchCost>;
  highlight: boolean;
}) {
  return (
    <div
      className={cx(
        "border-t border-line py-3",
      )}
    >
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[13px] font-semibold text-fg-muted">
          {title}
          {highlight && <span className="text-gold">, obično</span>}
        </span>
        <span className="scoreboard whitespace-nowrap text-[26px] font-semibold">
          {formatKM(cost.total)}
        </span>
      </div>
      <ul className="mt-2 flex flex-col gap-0.5 text-[13px] text-fg-muted">
        {cost.lines.map((l) => (
          <li key={l.label} className="tabular flex justify-between gap-3">
            <span>
              {l.label}
              {l.count > 1 &&
                l.unit != null &&
                `, ${l.count} × ${formatKM(l.unit)}`}
            </span>
            <span className={l.total == null ? "text-orange" : undefined}>
              {l.total == null ? "nije određeno" : formatKM(l.total)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

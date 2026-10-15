"use client";

import { useActionState, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { CrewEditor } from "@/components/crew-editor";
import { Button, cx, inputClass } from "@/components/ui";
import { crewSummary, type Crew } from "@/lib/crew";
import { formatKM, matchCost, type FeeRules } from "@/lib/finance";
import { saveFeeRules, type RulesState } from "./actions";

export type CompetitionRules = {
  id: string;
  name: string;
  crew: Crew;
  /** Seniori: sudije i pomoćne sudije se šalju odvojeno */
  split: boolean;
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
  { key: "fee_digital_km", label: "Digitalni zapisnik", unit: "zapisničar, umjesto cijene stola" },
  { key: "fee_stats_km", label: "Statistika", unit: "po osobi" },
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
  const [crew, setCrew] = useState(competition.crew);
  const [split, setSplit] = useState(competition.split);
  const [dirty, setDirty] = useState(false);

  const rules: FeeRules = {
    fee_referee_2_km: toNumber(values.fee_referee_2_km),
    fee_referee_3_km: toNumber(values.fee_referee_3_km),
    fee_table_km: toNumber(values.fee_table_km),
    fee_stats_km: toNumber(values.fee_stats_km),
    fee_commissioner_km: toNumber(values.fee_commissioner_km),
    fee_digital_km: toNumber(values.fee_digital_km),
  };
  const cost = matchCost(rules, crew);
  // Polja samo za ono što se u ovom takmičenju delegira (npr. seniori: samo pomoćne sudije)
  const fields = FIELDS.filter(
    (f) =>
      ((f.key !== "fee_referee_2_km" && f.key !== "fee_referee_3_km") || crew.referees) &&
      (f.key !== "fee_commissioner_km" || crew.commissioner),
  );
  const officials = crew.referees || crew.commissioner;
  const saved = state.saved !== undefined && !dirty && !state.error;

  const km = (v: number | null) =>
    v == null ? "—" : formatKM(v).replace(",00", "");
  const r = competition.rules;
  const c0 = competition.crew;
  const summary = Object.values(r).every((v) => v == null)
    ? null
    : [
        c0.referees && `dvojka ${km(r.fee_referee_2_km)}, trojka ${km(r.fee_referee_3_km)}`,
        `sto ${km(r.fee_table_km)}`,
        r.fee_digital_km != null && `dig. zapisnik ${km(r.fee_digital_km)}`,
        c0.stats > 0 && `statistika ${km(r.fee_stats_km ?? null)}`,
        c0.commissioner && `komesar ${km(r.fee_commissioner_km)}`,
      ]
        .filter(Boolean)
        .join(", ")
        .replace(/^./, (ch) => ch.toUpperCase());

  return (
    <details className="group">
      <summary className="-mx-4 flex cursor-pointer list-none items-center gap-3 px-4 py-4 transition-colors hover:bg-panel-2 sm:-mx-6 sm:px-6 [&::-webkit-details-marker]:hidden">
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
        <input type="hidden" name="split_nominations" value={split ? "1" : "0"} />

        <div className="flex flex-col gap-3">
          <div>
            <p className="text-[15px] font-semibold">Obično na utakmici</p>
            <p className="mt-0.5 text-[13px] text-fg-muted">Nova utakmica preuzima ovaj sastav; na svakoj se može promijeniti.</p>
          </div>
          <CrewEditor
            value={crew}
            onChange={(c) => {
              setCrew(c);
              setDirty(true);
            }}
          />
          {officials && (
          <label className="flex cursor-pointer items-start gap-2.5 text-[14px]">
            <input
              type="checkbox"
              checked={split}
              onChange={(e) => {
                setSplit(e.target.checked);
                setDirty(true);
              }}
              className="mt-0.5 size-4 accent-[var(--brand)]"
            />
            <span>
              <span className="font-semibold">Odvojene nominacije</span>
              <span className="block text-fg-muted">Sudije i komesar se šalju posebno od pomoćnih sudija.</span>
            </span>
          </label>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          {fields.map((f) => (
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

        <Cost title={`Utakmica: ${crewSummary(crew)}`} cost={cost} />

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

function Cost({
  title,
  cost,
}: {
  title: string;
  cost: ReturnType<typeof matchCost>;
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

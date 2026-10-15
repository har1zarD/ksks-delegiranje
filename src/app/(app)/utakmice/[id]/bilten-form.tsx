"use client";

import { ClubLogo, TeamName } from "@/components/team-name";
import { useActionState, useState } from "react";
import { Check, Plus, Trash2 } from "lucide-react";
import { TimeField } from "@/components/date-picker";
import { SelectInput } from "@/components/select";
import { Button, cx, Field, inputClass, Textarea } from "@/components/ui";
import { FOUL_TYPE_LABEL, type TechnicalFoul } from "@/lib/data/report-selects";
import { saveReport, type ReportState } from "./actions";

export type BiltenValues = {
  spectators: number | null;
  started_at: string | null;
  ended_at: string | null;
  home_fouls: number | null;
  away_fouls: number | null;
  technicals: TechnicalFoul[];
  incidents: string | null;
  remarks: string | null;
  submitted_at: string | null;
};

const SAVED_TEXT: Record<NonNullable<ReportState["saved"]>, string> = {
  draft: "Nacrt sačuvan",
  submitted: "Bilten poslan savezu",
  unlocked: "Bilten vraćen na doradu",
};

const PANEL = "border-t border-line pt-5 disabled:opacity-80";
const LEGEND = "float-left mb-4 w-full font-display text-[20px] font-semibold tracking-tight";

export function BiltenForm({
  matchId,
  homeName,
  awayName,
  homeLogoUrl,
  awayLogoUrl,
  values,
  isAdmin,
}: {
  matchId: string;
  homeName: string;
  awayName: string;
  homeLogoUrl: string | null;
  awayLogoUrl: string | null;
  values: BiltenValues | null;
  isAdmin: boolean;
}) {
  const [state, action, pending] = useActionState<ReportState, FormData>(saveReport, {});
  const [technicals, setTechnicals] = useState<TechnicalFoul[]>(values?.technicals ?? []);
  const submitted = Boolean(values?.submitted_at);
  const locked = submitted && !isAdmin;
  // "HH:MM:SS" iz baze → "HH:MM" za input
  const hhmm = (t: string | null | undefined) => (t ? t.slice(0, 5) : "");

  const setFoul = (i: number, patch: Partial<TechnicalFoul>) =>
    setTechnicals((prev) => prev.map((t, j) => (j === i ? { ...t, ...patch } : t)));

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="match_id" value={matchId} />
      <input type="hidden" name="technicals" value={JSON.stringify(technicals)} />

      <fieldset disabled={locked} className={PANEL}>
        <legend className={LEGEND}>Utakmica</legend>
        <div className="clear-both grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Field label="Gledalaca" name="spectators" type="number" inputMode="numeric" min={0} defaultValue={values?.spectators ?? ""} className="col-span-2 sm:col-span-1" />
          <TimeField label="Početak" name="started_at" defaultValue={hhmm(values?.started_at)} />
          <TimeField label="Kraj" name="ended_at" defaultValue={hhmm(values?.ended_at)} />
          <Field label={<TeamName name={`Lične greške, ${homeName}`} logoUrl={homeLogoUrl} wrap />} name="home_fouls" type="number" inputMode="numeric" min={0} max={99} defaultValue={values?.home_fouls ?? ""} />
          <Field label={<TeamName name={`Lične greške, ${awayName}`} logoUrl={awayLogoUrl} wrap />} name="away_fouls" type="number" inputMode="numeric" min={0} max={99} defaultValue={values?.away_fouls ?? ""} />
        </div>
      </fieldset>

      <fieldset disabled={locked} className={PANEL}>
        <legend className={LEGEND}>Tehničke, nesportske i diskvalifikujuće greške</legend>
        <div className="clear-both">
          {technicals.length > 0 && (
            <ul className="flex flex-col gap-3">
              {technicals.map((t, i) => (
                <li
                  key={i}
                  className="grid grid-cols-2 gap-2 rounded-md bg-panel p-3 sm:grid-cols-[1fr_2fr_5.5rem_1fr_auto] sm:items-center"
                >
                  <SelectInput aria-label="Ekipa" value={t.team} onChange={(e) => setFoul(i, { team: e.target.value as TechnicalFoul["team"] })}>
                    <option value="home" data-icon={<ClubLogo src={homeLogoUrl} />}>{homeName}</option>
                    <option value="away" data-icon={<ClubLogo src={awayLogoUrl} />}>{awayName}</option>
                  </SelectInput>
                  <SelectInput aria-label="Vrsta" value={t.type} onChange={(e) => setFoul(i, { type: e.target.value as TechnicalFoul["type"] })} className="sm:order-4">
                    {(Object.keys(FOUL_TYPE_LABEL) as TechnicalFoul["type"][]).map((k) => (
                      <option key={k} value={k}>
                        {FOUL_TYPE_LABEL[k]}
                      </option>
                    ))}
                  </SelectInput>
                  <input aria-label="Igrač ili trener" placeholder="Igrač / trener (broj, ime)" value={t.player} onChange={(e) => setFoul(i, { player: e.target.value })} className={cx(inputClass, "sm:order-2")} />
                  <input aria-label="Minuta" type="number" inputMode="numeric" min={1} max={60} placeholder="Minuta" value={t.minute ?? ""} onChange={(e) => setFoul(i, { minute: e.target.value ? Number(e.target.value) : null })} className={cx(inputClass, "sm:order-3")} />
                  {!locked && (
                    <button
                      type="button"
                      onClick={() => setTechnicals((prev) => prev.filter((_, j) => j !== i))}
                      className="col-span-2 inline-flex h-11 items-center justify-center gap-2 rounded-md text-[14px] font-semibold text-crest hover:bg-panel-2 sm:order-5 sm:col-span-1 sm:w-11"
                      aria-label="Ukloni grešku"
                    >
                      <Trash2 className="size-5" />
                      <span className="sm:hidden">Ukloni</span>
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
          {!locked && (
            <button
              type="button"
              onClick={() => setTechnicals((prev) => [...prev, { team: "home", player: "", minute: null, type: "T" }])}
              className="-mx-3 px-3 rounded-md mt-3 inline-flex h-11 items-center gap-2 rounded-md text-[15px] font-semibold text-brand hover:bg-panel-2"
            >
              <Plus className="size-5" /> Dodaj grešku
            </button>
          )}
          {locked && technicals.length === 0 && <p className="text-[15px] text-fg-muted">Nije bilo.</p>}
        </div>
      </fieldset>

      <fieldset disabled={locked} className={PANEL}>
        <legend className={LEGEND}>Izvještaj</legend>
        <div className="clear-both flex flex-col gap-4">
          <Textarea label="Incidenti (ponašanje publike, ekipa, službenih lica)" name="incidents" rows={3} defaultValue={values?.incidents ?? ""} />
          <Textarea label="Napomene komesara" name="remarks" rows={3} defaultValue={values?.remarks ?? ""} />
        </div>
      </fieldset>

      <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:flex-wrap sm:items-center">
        {!locked && (
          <>
            {!submitted && (
              <Button type="submit" name="intent" value="submit" disabled={pending}>
                Pošalji bilten
              </Button>
            )}
            <Button type="submit" name="intent" value="draft" variant={submitted ? "primary" : "secondary"} disabled={pending}>
              {submitted ? "Sačuvaj izmjene" : "Sačuvaj nacrt"}
            </Button>
          </>
        )}
        {isAdmin && submitted && (
          <Button type="submit" name="intent" value="unlock" variant="secondary" disabled={pending}>
            Vrati komesaru na doradu
          </Button>
        )}
        {locked && <p className="text-[15px] text-fg-muted">Bilten je poslan. Za izmjene se javi savezu.</p>}
        {state.error ? (
          <p role="alert" className="text-[14px] text-crest">
            {state.error}
          </p>
        ) : (
          state.saved && (
            <p className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-mint">
              <Check className="size-4" /> {SAVED_TEXT[state.saved]}
            </p>
          )
        )}
      </div>
    </form>
  );
}

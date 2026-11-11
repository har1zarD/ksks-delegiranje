"use client";

import { TeamName } from "@/components/team-name";
import { useActionState } from "react";
import { Check } from "lucide-react";
import { confirmSubmit } from "@/components/confirm";
import { Button, Field } from "@/components/ui";
import { formatDayMonth, formatTime, formatWeekday, SCORE_UNDO_HOURS } from "@/lib/format";
import { saveFinalScore, undoFinalScore, type FinalScoreState, type UndoScoreState } from "./actions";

/**
 * Konačni rezultat sa zapisnika. Nakon slanja utakmica je završena; pomoćni sudija ga u roku
 * (undoUntil) još može ispraviti ili poništiti, poslije toga samo savez.
 */
export function FinalScoreForm({
  matchId,
  homeName,
  awayName,
  homeLogoUrl,
  awayLogoUrl,
  home,
  away,
  byTable,
  undoUntil,
  hint,
}: {
  matchId: string;
  homeName: string;
  awayName: string;
  homeLogoUrl: string | null;
  awayLogoUrl: string | null;
  home: number | null;
  away: number | null;
  /** Upisuje pomoćni sudija (ima rok za ispravku), ne savez */
  byTable: boolean;
  undoUntil: string | null;
  /** Uputa iznad polja, npr. minibasket: upisuju se dobijene četvrtine */
  hint?: string;
}) {
  const [state, action, pending] = useActionState<FinalScoreState, FormData>(saveFinalScore, {});

  return (
    <div className="flex flex-col gap-4">
    {hint && <p className="text-[14px] text-fg-muted">{hint}</p>}
    <form
      action={action}
      onSubmit={confirmSubmit((form) => {
        const data = new FormData(form);
        return {
          title: home != null ? "Ispraviti rezultat?" : "Upisati konačni rezultat?",
          message: `${homeName} ${data.get("home")} : ${data.get("away")} ${awayName}. Utakmica postaje završena.${
            byTable ? ` Grešku možeš ispraviti ili poništiti u roku od ${SCORE_UNDO_HOURS} sata.` : ""
          }`,
          confirmLabel: home != null ? "Ispravi" : "Upiši",
        };
      })}
      className="grid grid-cols-2 items-end gap-3 sm:grid-cols-[1fr_1fr_auto] sm:gap-4"
    >
      <input type="hidden" name="match_id" value={matchId} />
      <ScoreField logoUrl={homeLogoUrl} label={homeName} name="home" value={home} />
      <ScoreField logoUrl={awayLogoUrl} label={awayName} name="away" value={away} />
      <Button type="submit" disabled={pending} className="col-span-2 h-12 sm:col-span-1 sm:h-14">
        {pending ? "Čuvam…" : home != null ? "Ispravi rezultat" : "Upiši rezultat"}
      </Button>
      {state.error ? (
        <p role="alert" className="col-span-2 text-[14px] font-medium text-crest sm:col-span-3">
          {state.error}
        </p>
      ) : (
        state.saved && (
          <p role="status" className="col-span-2 inline-flex items-center gap-1.5 text-[14px] font-semibold text-mint sm:col-span-3">
            <Check className="size-4" /> Rezultat je upisan, utakmica je završena.
          </p>
        )
      )}
    </form>
    {byTable && undoUntil && <UndoScore matchId={matchId} until={undoUntil} />}
    </div>
  );
}

/** Poništavanje pogrešno upisanog rezultata: utakmica se vraća na zakazanu, pa se rezultat upisuje ponovo */
export function UndoScore({ matchId, until }: { matchId: string; until: string }) {
  const [state, action, pending] = useActionState<UndoScoreState, FormData>(undoFinalScore, {});

  return (
    <form
      action={action}
      onSubmit={confirmSubmit({
        title: "Poništiti rezultat?",
        message: "Utakmica se vraća na zakazanu i rezultat se upisuje ponovo.",
        confirmLabel: "Poništi",
        tone: "danger",
      })}
      className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-md bg-panel-2 px-3.5 py-3"
    >
      <input type="hidden" name="match_id" value={matchId} />
      <p className="text-[14px] text-fg-muted">
        Pogrešan rezultat možeš ispraviti ili poništiti do{" "}
        <span className="font-semibold text-fg">
          {formatWeekday(until)} {formatDayMonth(until)} u {formatTime(until)}
        </span>
        .
      </p>
      <Button type="submit" variant="destructive" disabled={pending}>
        {pending ? "Poništavam…" : "Poništi rezultat"}
      </Button>
      {state.error && (
        <p role="alert" className="w-full text-[14px] font-medium text-crest">
          {state.error}
        </p>
      )}
    </form>
  );
}

function ScoreField({ label, logoUrl, name, value }: { label: string; logoUrl: string | null; name: string; value: number | null }) {
  return (
    <Field
      label={<TeamName name={label} logoUrl={logoUrl} />}
      name={name}
      type="number"
      inputMode="numeric"
      min={0}
      max={200}
      required
      defaultValue={value ?? ""}
      placeholder="0"
      className="[&_input]:font-display [&_input]:tabular-nums [&_input]:h-14 [&_input]:text-center [&_input]:text-[28px] [&_input]:font-semibold sm:[&_input]:h-14 sm:[&_input]:text-[28px]"
    />
  );
}

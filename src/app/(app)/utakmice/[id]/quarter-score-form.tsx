"use client";

import { TeamName } from "@/components/team-name";
import { useActionState, useState } from "react";
import { Check } from "lucide-react";
import { confirmSubmit } from "@/components/confirm";
import { Button } from "@/components/ui";
import { periodLabel, periodShort, SCORE_UNDO_HOURS } from "@/lib/format";
import { formatScore, quarterPoint, quarterPoints } from "@/lib/quarter-points";
import { saveQuarterScore, type QuarterScoreState } from "./actions";
import { UndoScore } from "./final-score-form";

type Quarter = { home: string; away: string };

const QUARTERS = [1, 2, 3, 4];
const GRID = "grid grid-cols-[2.5rem_1fr_1fr_3.75rem] items-center gap-2 px-3 py-2 sm:grid-cols-[8rem_1fr_1fr_5rem] sm:px-4";

/**
 * Minibasket: koševi po četvrtinama, upisani odjednom na kraju utakmice. Svaka četvrtina nosi bod
 * (dobijena 1, neriješena 0,5, izgubljena 0); zbir bodova je rezultat utakmice. Nakon slanja utakmica je završena;
 * sudije i pomoćne sudije ga u roku (undoUntil) još mogu ispraviti ili poništiti, poslije toga samo savez.
 */
export function QuarterScoreForm({
  matchId,
  homeName,
  awayName,
  homeLogoUrl,
  awayLogoUrl,
  periods,
  entered,
  byCrew,
  undoUntil,
}: {
  matchId: string;
  homeName: string;
  awayName: string;
  homeLogoUrl: string | null;
  awayLogoUrl: string | null;
  /** Već upisane četvrtine (ispravka) */
  periods: { period: number; home_points: number; away_points: number }[];
  /** Rezultat je već upisan: forma ga ispravlja */
  entered: boolean;
  /** Upisuje sudija ili pomoćni sudija (ima rok za ispravku), ne savez */
  byCrew: boolean;
  undoUntil: string | null;
}) {
  const [state, action, pending] = useActionState<QuarterScoreState, FormData>(saveQuarterScore, {});
  const [quarters, setQuarters] = useState<Quarter[]>(() =>
    QUARTERS.map((q) => {
      const p = periods.find((x) => x.period === q);
      return p ? { home: String(p.home_points), away: String(p.away_points) } : { home: "", away: "" };
    }),
  );

  const filled = quarters.filter((q) => q.home !== "" && q.away !== "").map((q) => ({ home: Number(q.home), away: Number(q.away) }));
  const total = quarterPoints(filled);
  const result = `${formatScore(total.home)} : ${formatScore(total.away)}`;

  function update(index: number, side: keyof Quarter, value: string) {
    if (value !== "" && !/^\d{1,3}$/.test(value)) return;
    setQuarters((prev) => prev.map((q, i) => (i === index ? { ...q, [side]: value } : q)));
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[14px] text-fg-muted">
        Upiši koševe obje ekipe za svaku četvrtinu. Dobijena četvrtina je 1 bod, neriješena 0,5 svakoj ekipi; zbir bodova je rezultat utakmice.
      </p>
      <form
        action={action}
        onSubmit={confirmSubmit(() => ({
          title: entered ? "Ispraviti rezultat?" : "Upisati rezultat?",
          message: `${homeName} ${result} ${awayName}. Utakmica postaje završena.${
            byCrew ? ` Grešku možeš ispraviti ili poništiti u roku od ${SCORE_UNDO_HOURS} sata.` : ""
          }`,
          confirmLabel: entered ? "Ispravi" : "Upiši",
        }))}
        className="flex flex-col gap-4"
      >
        <input type="hidden" name="match_id" value={matchId} />
        <div className="rounded-lg border border-line">
          <div className={`${GRID} border-b border-line text-[12px] font-semibold text-fg-faint`}>
            <span aria-hidden />
            <TeamName name={homeName} logoUrl={homeLogoUrl} className="flex-col justify-center sm:flex-row" />
            <TeamName name={awayName} logoUrl={awayLogoUrl} className="flex-col justify-center sm:flex-row" />
            <span className="text-right">Bodovi</span>
          </div>
          <ul className="divide-y divide-line">
            {quarters.map((q, i) => {
              const period = QUARTERS[i];
              const done = q.home !== "" && q.away !== "";
              const point = done ? quarterPoint(Number(q.home), Number(q.away)) : null;
              return (
                <li key={period} className={GRID}>
                  <span className="scoreboard whitespace-nowrap text-[20px] font-semibold text-fg-muted sm:hidden">{periodShort(period)}</span>
                  <span className="hidden text-[15px] font-semibold text-fg-muted sm:block">{periodLabel(period)}</span>
                  {(["home", "away"] as const).map((side) => (
                    <input
                      key={side}
                      name={`${side}_${period}`}
                      type="number"
                      inputMode="numeric"
                      min={0}
                      max={200}
                      required
                      aria-label={`${periodLabel(period)}, ${side === "home" ? homeName : awayName}`}
                      value={q[side]}
                      placeholder="0"
                      onChange={(e) => update(i, side, e.target.value)}
                      onFocus={(e) => e.target.select()}
                      className="scoreboard h-14 w-full min-w-0 whitespace-nowrap rounded-md bg-panel-2 text-center text-[28px] font-semibold text-fg outline-none [appearance:textfield] placeholder:text-fg-faint focus:ring-2 focus:ring-brand [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    />
                  ))}
                  <span className="scoreboard whitespace-nowrap text-right text-[17px] font-semibold">
                    {point ? `${formatScore(point.home)} : ${formatScore(point.away)}` : <span className="text-fg-faint">–</span>}
                  </span>
                </li>
              );
            })}
          </ul>
          <div className="flex items-center justify-between gap-3 border-t border-line px-3 py-3 sm:px-4">
            <span className="text-[13px] font-semibold text-fg-muted">Rezultat utakmice</span>
            <span role="status" className="scoreboard whitespace-nowrap text-[26px] font-semibold">
              {result}
            </span>
          </div>
        </div>
        <Button type="submit" disabled={pending} className="h-12 sm:w-auto sm:self-start">
          {pending ? "Čuvam…" : entered ? "Ispravi rezultat" : "Upiši rezultat"}
        </Button>
        {state.error ? (
          <p role="alert" className="text-[14px] font-medium text-crest">
            {state.error}
          </p>
        ) : (
          state.saved && (
            <p role="status" className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-mint">
              <Check className="size-4" /> Rezultat je upisan, utakmica je završena.
            </p>
          )
        )}
      </form>
      {byCrew && undoUntil && <UndoScore matchId={matchId} until={undoUntil} />}
    </div>
  );
}

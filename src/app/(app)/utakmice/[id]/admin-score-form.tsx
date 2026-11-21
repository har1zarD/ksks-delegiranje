"use client";

import { TeamName } from "@/components/team-name";
import { useActionState, useState } from "react";
import { Check, Plus, X } from "lucide-react";
import { confirmSubmit } from "@/components/confirm";
import { Button, cx } from "@/components/ui";
import { periodLabel, periodShort } from "@/lib/format";
import { formatScore, quarterPoints } from "@/lib/quarter-points";
import { adminSaveScore, type AdminScoreState } from "./actions";

type Mode = "quarters" | "final";
type Row = { home: string; away: string };

const GRID = "grid grid-cols-[2.5rem_1fr_1fr] items-center gap-2 px-3 py-2 sm:grid-cols-[8rem_1fr_1fr] sm:px-4";
const INPUT =
  "scoreboard h-14 w-full min-w-0 whitespace-nowrap rounded-md bg-panel-2 text-center text-[28px] font-semibold text-fg outline-none [appearance:textfield] placeholder:text-fg-faint focus:ring-2 focus:ring-brand [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";

/**
 * Ispravka rezultata (savez), na svakoj utakmici koja nije u toku. Rezultat ima jedan izvor:
 * - po četvrtinama: ukupni rezultat se računa iz njih (Minibasket: bodovi četvrtina, zaokruženo naviše; ostalo: zbir koševa);
 * - samo konačni rezultat: četvrtine se brišu, da se ne bi kosile s ukupnim.
 * FIBA utakmica se ispravlja samo po četvrtinama (ispravljene FIBA više ne prepisuje), Unobasket samo konačnim rezultatom.
 */
export function AdminScoreForm({
  matchId,
  homeName,
  awayName,
  homeLogoUrl,
  awayLogoUrl,
  periods,
  home,
  away,
  quarterPointsLeague,
  allowQuarters,
  allowFinal,
}: {
  matchId: string;
  homeName: string;
  awayName: string;
  homeLogoUrl: string | null;
  awayLogoUrl: string | null;
  periods: { period: number; home_points: number; away_points: number }[];
  home: number | null;
  away: number | null;
  /** Minibasket: rezultat su bodovi četvrtina (bez produžetaka) */
  quarterPointsLeague: boolean;
  allowQuarters: boolean;
  allowFinal: boolean;
}) {
  const [state, action, pending] = useActionState<AdminScoreState, FormData>(adminSaveScore, {});
  const [mode, setMode] = useState<Mode>(allowQuarters && (periods.length > 0 || quarterPointsLeague || !allowFinal) ? "quarters" : "final");
  const [rows, setRows] = useState<Row[]>(() => {
    const count = Math.max(4, ...periods.map((p) => p.period));
    return Array.from({ length: quarterPointsLeague ? 4 : count }, (_, i) => {
      const p = periods.find((x) => x.period === i + 1);
      return p ? { home: String(p.home_points), away: String(p.away_points) } : { home: "", away: "" };
    });
  });
  const [final, setFinal] = useState<Row>({ home: home != null ? String(home) : "", away: away != null ? String(away) : "" });

  const entered = home != null;
  const filled = rows.every((r) => r.home !== "" && r.away !== "");
  const nums = rows.map((r) => ({ home: Number(r.home || 0), away: Number(r.away || 0) }));
  const total = quarterPointsLeague
    ? quarterPoints(nums)
    : nums.reduce((t, r) => ({ home: t.home + r.home, away: t.away + r.away }), { home: 0, away: 0 });
  const result = mode === "quarters" ? `${formatScore(total.home)} : ${formatScore(total.away)}` : `${final.home || "–"} : ${final.away || "–"}`;
  // Produžetak ima smisla samo kad je nakon regularnog dijela neriješeno
  const tied = nums.reduce((d, r) => d + r.home - r.away, 0) === 0;
  const canAddOvertime = !quarterPointsLeague && filled && tied && rows.length < 12;

  const digits = (v: string) => v === "" || /^\d{1,3}$/.test(v);
  const setRow = (i: number, side: keyof Row, v: string) => digits(v) && setRows((prev) => prev.map((r, j) => (j === i ? { ...r, [side]: v } : r)));

  const dropsQuarters = mode === "final" && periods.length > 0;

  return (
    <div className="flex flex-col gap-4">
      {allowQuarters && allowFinal && (
        <div role="radiogroup" aria-label="Način upisa" className="inline-flex gap-0.5 self-start rounded-lg bg-track p-[3px]">
          {(
            [
              ["quarters", "Po četvrtinama"],
              ["final", "Samo konačni rezultat"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={mode === value}
              onClick={() => setMode(value)}
              className={cx(
                "whitespace-nowrap rounded-md px-3.5 py-2.5 text-[14px] font-semibold transition-colors sm:py-1.5",
                mode === value ? "bg-panel-3 text-fg shadow-segment" : "text-fg-muted hover:bg-panel-3/60 hover:text-fg",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      <p className="text-[14px] text-fg-muted">
        {mode === "quarters"
          ? quarterPointsLeague
            ? "Upiši koševe po četvrtinama. Rezultat utakmice su bodovi četvrtina (dobijena 1, neriješena 0,5), zaokruženi naviše; kod 2:2 ekipa s više koševa dobija još 1 bod."
            : "Upiši poene po četvrtinama. Konačni rezultat je njihov zbir."
          : allowQuarters
            ? "Upiši samo konačni rezultat."
            : "Upiši konačni rezultat: broj dobijenih četvrtina, npr. 3:1."}
        {dropsQuarters && <span className="font-semibold text-fg"> Upisane četvrtine se brišu, da se ne bi kosile s konačnim rezultatom.</span>}
      </p>

      <form
        action={action}
        onSubmit={confirmSubmit({
          title: entered ? "Ispraviti rezultat?" : "Upisati rezultat?",
          message: `${homeName} ${result} ${awayName}. Utakmica postaje završena, a delegirani rezultat više ne mijenjaju.${dropsQuarters ? " Četvrtine se brišu." : ""}`,
          confirmLabel: entered ? "Ispravi" : "Upiši",
        })}
        className="flex flex-col gap-4"
      >
        <input type="hidden" name="match_id" value={matchId} />
        <input type="hidden" name="mode" value={mode} />
        {mode === "quarters" ? (
          <>
            <input type="hidden" name="periods" value={rows.length} />
            <div className="rounded-lg border border-line">
              <div className={`${GRID} border-b border-line text-[12px] font-semibold text-fg-faint`}>
                <span aria-hidden />
                <TeamName name={homeName} logoUrl={homeLogoUrl} className="flex-col justify-center sm:flex-row" />
                <TeamName name={awayName} logoUrl={awayLogoUrl} className="flex-col justify-center sm:flex-row" />
              </div>
              <ul className="divide-y divide-line">
                {rows.map((r, i) => {
                  const period = i + 1;
                  return (
                    <li key={period} className={GRID}>
                      <span className="scoreboard whitespace-nowrap text-[20px] font-semibold text-fg-muted sm:hidden">{periodShort(period)}</span>
                      <span className="hidden items-center gap-1 text-[15px] font-semibold text-fg-muted sm:flex">
                        {periodLabel(period)}
                      </span>
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
                          value={r[side]}
                          placeholder="0"
                          onChange={(e) => setRow(i, side, e.target.value)}
                          onFocus={(e) => e.target.select()}
                          className={INPUT}
                        />
                      ))}
                    </li>
                  );
                })}
              </ul>
              {!quarterPointsLeague && (canAddOvertime || rows.length > 4) && (
                <div className="flex flex-wrap gap-2 border-t border-line px-3 py-2 sm:px-4">
                  {canAddOvertime && (
                    <Button type="button" variant="plain" onClick={() => setRows((prev) => [...prev, { home: "", away: "" }])}>
                      <Plus className="size-4" /> Dodaj produžetak
                    </Button>
                  )}
                  {rows.length > 4 && (
                    <Button type="button" variant="destructive" onClick={() => setRows((prev) => prev.slice(0, -1))}>
                      <X className="size-4" /> Ukloni {periodLabel(rows.length)}
                    </Button>
                  )}
                </div>
              )}
              <div className="flex items-center justify-between gap-3 border-t border-line px-3 py-3 sm:px-4">
                <span className="text-[13px] font-semibold text-fg-muted">Konačni rezultat</span>
                <span role="status" className="scoreboard whitespace-nowrap text-[26px] font-semibold">
                  {result}
                </span>
              </div>
            </div>
          </>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:max-w-md">
            {(["home", "away"] as const).map((side) => (
              <label key={side} className="flex min-w-0 flex-col gap-2">
                <TeamName name={side === "home" ? homeName : awayName} logoUrl={side === "home" ? homeLogoUrl : awayLogoUrl} className="text-[13px] font-semibold" />
                <input
                  name={side}
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={200}
                  required
                  value={final[side]}
                  placeholder="0"
                  onChange={(e) => digits(e.target.value) && setFinal((f) => ({ ...f, [side]: e.target.value }))}
                  onFocus={(e) => e.target.select()}
                  className={INPUT}
                />
              </label>
            ))}
          </div>
        )}
        <Button type="submit" disabled={pending} className="h-12 sm:w-auto sm:self-start">
          {pending ? "Čuvam…" : entered ? "Ispravi rezultat" : "Upiši rezultat"}
        </Button>
        {state.error ? (
          <p role="alert" className="text-[14px] font-medium text-crest">
            {state.error}
          </p>
        ) : (
          state.saved &&
          state.done !== "cleared" && (
            <p role="status" className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-mint">
              <Check className="size-4" /> Rezultat je sačuvan.
            </p>
          )
        )}
      </form>

      {entered && allowFinal && (
        <form
          action={action}
          onSubmit={confirmSubmit({
            title: "Obrisati rezultat?",
            message: "Rezultat i četvrtine se brišu; utakmica ostaje bez rezultata dok ga neko ponovo ne upiše.",
            confirmLabel: "Obriši",
            tone: "danger",
          })}
          className="border-t border-line pt-4"
        >
          <input type="hidden" name="match_id" value={matchId} />
          <input type="hidden" name="mode" value="clear" />
          <Button type="submit" variant="destructive" disabled={pending}>
            Obriši rezultat
          </Button>
        </form>
      )}
    </div>
  );
}

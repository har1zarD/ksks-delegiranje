"use client";

import { TeamName } from "@/components/team-name";
import { useEffect, useState, useTransition } from "react";
import { Check, Plus, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cx } from "@/components/ui";
import { periodLabel, periodShort } from "@/lib/format";
import { removePeriod, savePeriod } from "./actions";

type Period = { period: number; home_points: number; away_points: number };

/**
 * Rezultat po četvrtinama. Komesar upisuje (čuva se kad napusti polje),
 * ostali gledaju uživo preko Supabase Realtime.
 */
export function ScoreBoard({
  matchId,
  homeName,
  awayName,
  homeLogoUrl,
  awayLogoUrl,
  initial,
  canEdit,
}: {
  matchId: string;
  homeName: string;
  awayName: string;
  homeLogoUrl: string | null;
  awayLogoUrl: string | null;
  initial: Period[];
  canEdit: boolean;
}) {
  const [periods, setPeriods] = useState<Period[]>(() => withRegular(initial));
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);
  const [pending, startTransition] = useTransition();

  // Uživo: promjene koje unese komesar stižu svima koji gledaju utakmicu
  useEffect(() => {
    if (canEdit) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`match_periods:${matchId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "match_periods", filter: `match_id=eq.${matchId}` },
        (payload) => {
          setPeriods((prev) => {
            if (payload.eventType === "DELETE") {
              const gone = (payload.old as Partial<Period>).period;
              return withRegular(prev.filter((p) => p.period !== gone));
            }
            const row = payload.new as Period;
            return withRegular([...prev.filter((p) => p.period !== row.period), row]);
          });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [matchId, canEdit]);

  const total = periods.reduce(
    (t, p) => ({ home: t.home + p.home_points, away: t.away + p.away_points }),
    { home: 0, away: 0 },
  );

  function update(period: number, side: "home_points" | "away_points", value: string) {
    const n = value === "" ? 0 : Number(value);
    if (!Number.isInteger(n) || n < 0) return;
    setPeriods((prev) => prev.map((p) => (p.period === period ? { ...p, [side]: n } : p)));
  }

  function save(p: Period) {
    startTransition(async () => {
      const r = await savePeriod(matchId, p.period, String(p.home_points), String(p.away_points));
      setMessage(r.error ? { text: r.error, error: true } : { text: `${periodLabel(p.period)} sačuvana` });
    });
  }

  function addOvertime() {
    const next = Math.max(...periods.map((p) => p.period)) + 1;
    if (next > 12) return;
    setPeriods((prev) => [...prev, { period: next, home_points: 0, away_points: 0 }]);
  }

  function dropOvertime(period: number) {
    startTransition(async () => {
      const r = await removePeriod(matchId, period);
      if (r.error) setMessage({ text: r.error, error: true });
      else setPeriods((prev) => prev.filter((p) => p.period !== period));
    });
  }

  const last = periods[periods.length - 1];
  const homeTrails = total.home < total.away;
  const awayTrails = total.away < total.home;

  return (
    <div>
      {/* Semafor */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 py-2 text-center sm:gap-6">
        <TeamScore logoUrl={homeLogoUrl} name={homeName} points={total.home} trails={homeTrails} />
        <div className="scoreboard whitespace-nowrap pb-6 text-[40px] font-semibold text-fg-faint sm:text-[64px]">:</div>
        <TeamScore logoUrl={awayLogoUrl} name={awayName} points={total.away} trails={awayTrails} />
      </div>

      {/* Po četvrtinama */}
      <div className="mt-4 rounded-lg border border-line bg-panel px-4 sm:px-5">
        <div className="grid grid-cols-[3.25rem_1fr_1fr_2.75rem] items-center gap-2 border-b border-line px-3 py-2 text-[12px] font-semibold text-fg-faint sm:grid-cols-[8rem_1fr_1fr_2.75rem] sm:px-4">
          <span>Period</span>
          <TeamName name={homeName} logoUrl={homeLogoUrl} className="flex-col justify-center sm:flex-row" />
          <TeamName name={awayName} logoUrl={awayLogoUrl} className="flex-col justify-center sm:flex-row" />
          <span aria-hidden />
        </div>
        <ul className="divide-y divide-line">
          {periods.map((p) => (
            <li
              key={p.period}
              className="grid grid-cols-[3.25rem_1fr_1fr_2.75rem] items-center gap-2 px-3 py-2 sm:grid-cols-[8rem_1fr_1fr_2.75rem] sm:px-4"
            >
              <span className="scoreboard whitespace-nowrap text-[20px] font-semibold text-fg-muted sm:hidden">{periodShort(p.period)}</span>
              <span className="hidden text-[15px] font-semibold text-fg-muted sm:block">{periodLabel(p.period)}</span>
              {(["home_points", "away_points"] as const).map((side) =>
                canEdit ? (
                  <input
                    key={side}
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={200}
                    aria-label={`${periodLabel(p.period)}, ${side === "home_points" ? homeName : awayName}`}
                    value={p[side] || ""}
                    placeholder="0"
                    onChange={(e) => update(p.period, side, e.target.value)}
                    onBlur={() => save(p)}
                    onFocus={(e) => e.target.select()}
                    className="scoreboard whitespace-nowrap h-14 w-full min-w-0 rounded-md [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none bg-panel-2 text-center text-[28px] font-semibold text-fg outline-none placeholder:text-fg-faint focus:ring-2 focus:ring-brand"
                  />
                ) : (
                  <span key={side} className="scoreboard whitespace-nowrap py-2 text-center text-[26px] font-semibold">
                    {p[side]}
                  </span>
                ),
              )}
              <span className="flex justify-end">
                {canEdit && p.period > 4 && p === last && (
                  <button
                    type="button"
                    onClick={() => dropOvertime(p.period)}
                    aria-label="Ukloni produžetak"
                    className="grid size-10 place-items-center rounded-md text-crest hover:bg-panel-2"
                  >
                    <X className="size-5" />
                  </button>
                )}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {canEdit ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={addOvertime}
            className="inline-flex h-11 items-center gap-2 rounded-md px-3 text-[15px] font-semibold text-brand hover:bg-panel-2"
          >
            <Plus className="size-5" /> Dodaj produžetak
          </button>
          <p
            role="status"
            className={cx(
              "inline-flex items-center gap-1.5 text-[14px] font-medium",
              message?.error ? "text-crest" : "text-fg-muted",
            )}
          >
            {pending ? (
              "Čuvam…"
            ) : (
              message && (
                <>
                  {!message.error && <Check className="size-4 text-mint" />}
                  {message.text}
                </>
              )
            )}
          </p>
        </div>
      ) : (
        <p className="mt-3 text-[13px] text-fg-muted">Rezultat se osvježava uživo.</p>
      )}
    </div>
  );
}

/** Samo konačni rezultat (bez četvrtina): upisao ga je pomoćni sudija ili savez; "–" dok nije upisan */
export function FinalScore({ homeName, awayName, homeLogoUrl, awayLogoUrl, home, away }: { homeName: string; awayName: string; homeLogoUrl: string | null; awayLogoUrl: string | null; home: number | null; away: number | null }) {
  const done = home != null && away != null;
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 py-2 text-center sm:gap-6">
      <TeamScore logoUrl={homeLogoUrl} name={homeName} points={home ?? "–"} trails={done && home! < away!} />
      <div className="scoreboard whitespace-nowrap pb-6 text-[40px] font-semibold text-fg-faint sm:text-[64px]">:</div>
      <TeamScore logoUrl={awayLogoUrl} name={awayName} points={away ?? "–"} trails={done && away! < home!} />
    </div>
  );
}

function TeamScore({ name, logoUrl, points, trails }: { name: string; logoUrl: string | null; points: number | string; trails: boolean }) {
  return (
    <div className="min-w-0">
      <div className={cx("scoreboard whitespace-nowrap text-[clamp(52px,19vw,84px)] font-semibold leading-[0.9] sm:text-[112px] lg:text-[128px]", trails ? "text-fg-faint" : "text-fg")}>
        {points}
      </div>
      <TeamName name={name} logoUrl={logoUrl} wrap className="mt-3 justify-center font-display text-[17px] font-semibold leading-tight text-fg-muted sm:text-[22px]" />
    </div>
  );
}

/** Uvijek prikaži 4 regularne četvrtine, pa produžetke redom */
function withRegular(list: Period[]): Period[] {
  const byPeriod = new Map(list.map((p) => [p.period, p]));
  for (let i = 1; i <= 4; i++) if (!byPeriod.has(i)) byPeriod.set(i, { period: i, home_points: 0, away_points: 0 });
  return [...byPeriod.values()].sort((a, b) => a.period - b.period);
}

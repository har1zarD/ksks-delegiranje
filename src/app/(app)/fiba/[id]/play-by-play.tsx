"use client";

import { useState } from "react";
import type { FibaAction } from "@/lib/fiba";
import { periodLabel, periodShort } from "@/lib/format";
import { cx } from "@/components/ui";

// Tok utakmice akciju po akciju (kao play-by-play na EuroLeague): domaćin lijevo, gost desno, rezultat u sredini.

const SHOT: Record<string, string> = { layup: "polaganje", jumpshot: "šut", dunk: "zakucavanje", tipinlayup: "tip-in", hookshot: "kuka", fadeaway: "fade-away", pullup: "šut iz dribla", floatingjumpshot: "floater", alleyoop: "alley-oop" };
const TURNOVER: Record<string, string> = { badpass: "loše dodavanje", travel: "koraci", ballhandling: "greška u vođenju", offensive: "napadačka greška", "24sec": "24 sekunde", "3sec": "3 sekunde", "5sec": "5 sekundi", "8sec": "8 sekundi", outofbounds: "aut", doubledribble: "dupla lopta", backcourt: "vraćena lopta", other: "" };
const FOUL: Record<string, string> = { personal: "Lična greška", offensive: "Napadačka greška", technical: "Tehnička greška", unsportsmanlike: "Nesportska greška", disqualifying: "Diskvalifikujuća greška", coachTechnical: "Tehnička greška trenera", benchTechnical: "Tehnička greška klupe" };

/** Opis akcije; null = ne prikazuje se (izmjene, iznuđene greške…) */
function describe(a: FibaAction, all: boolean): string | null {
  switch (a.type) {
    case "2pt":
    case "3pt": {
      const kind = SHOT[a.subType] ? ` (${SHOT[a.subType]})` : "";
      const label = a.type === "3pt" ? "trica" : "dvojka";
      return a.success ? `${label.charAt(0).toUpperCase()}${label.slice(1)}${kind}` : `Promašena ${label}${kind}`;
    }
    case "freethrow": {
      const [n, of] = a.subType.split("of");
      return `Slobodno bacanje${of ? ` ${n}/${of}` : ""} ${a.success ? "pogođeno" : "promašeno"}`;
    }
    case "rebound":
      return a.subType === "offensive" ? "Skok u napadu" : "Skok u odbrani";
    case "assist":
      return "Asistencija";
    case "steal":
      return "Ukradena lopta";
    case "block":
      return "Blokada";
    case "turnover":
      return `Izgubljena lopta${TURNOVER[a.subType] ? `, ${TURNOVER[a.subType]}` : ""}`;
    case "foul":
      return FOUL[a.subType] ?? "Greška";
    case "timeout":
      return "Tajm-aut";
    case "substitution":
      return all ? (a.subType === "in" ? "Ulazi u igru" : "Izlazi iz igre") : null;
    case "period":
      return a.subType === "start" ? `Početak: ${periodLabel(a.period)}` : `Kraj: ${periodLabel(a.period)}`;
    case "game":
      return a.subType === "end" ? "Kraj utakmice" : null;
    default:
      return null;
  }
}

export function PlayByPlay({ actions, home, away }: { actions: FibaAction[]; home: string; away: string }) {
  const periods = [...new Set(actions.map((a) => a.period))].sort((a, b) => a - b);
  const [period, setPeriod] = useState<number | null>(null);
  const [mode, setMode] = useState<"key" | "scoring" | "all">("key");

  const shown = actions
    .filter((a) => period === null || a.period === period)
    .map((a) => ({ a, text: describe(a, mode === "all") }))
    .filter(({ a, text }) => text && (mode !== "scoring" || (a.scoring && a.success) || a.type === "period"))
    .reverse();

  const chip = (on: boolean) => cx("whitespace-nowrap rounded-md px-3 py-1.5 text-[13px] font-semibold transition-colors", on ? "bg-panel-3 text-fg shadow-segment" : "text-fg-muted hover:text-fg");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0">
          <div className="inline-flex gap-0.5 rounded-lg bg-track p-[3px]">
            <button type="button" className={chip(period === null)} onClick={() => setPeriod(null)}>Sve</button>
            {periods.map((p) => (
              <button key={p} type="button" className={chip(period === p)} onClick={() => setPeriod(p)}>{periodShort(p)}</button>
            ))}
          </div>
        </div>
        <div className="inline-flex gap-0.5 rounded-lg bg-track p-[3px]">
          <button type="button" className={chip(mode === "key")} onClick={() => setMode("key")}>Akcije</button>
          <button type="button" className={chip(mode === "scoring")} onClick={() => setMode("scoring")}>Koševi</button>
          <button type="button" className={chip(mode === "all")} onClick={() => setMode("all")}>Sve s izmjenama</button>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-line bg-panel shadow-panel">
        <div className="grid grid-cols-[1fr_auto_1fr] border-b border-line bg-panel-2 px-3 py-2 text-[12px] font-semibold text-fg-muted sm:px-5">
          <span className="truncate">{home}</span>
          <span className="px-3 text-center">Rezultat</span>
          <span className="truncate text-right">{away}</span>
        </div>
        <ol className="max-h-[70vh] divide-y divide-line overflow-y-auto">
          {shown.map(({ a, text }) => {
            const made = a.scoring && a.success;
            const body = (
              <span className={cx("min-w-0 text-[14px] leading-snug", made ? "font-semibold text-fg" : "text-fg-muted")}>
                {a.player && (
                  <span className="text-fg">
                    {a.number && <span className="scoreboard text-fg-faint">{a.number} </span>}
                    {a.player}
                    <br className="sm:hidden" />
                    <span className="max-sm:hidden">, </span>
                  </span>
                )}
                {text}
              </span>
            );
            if (a.side === 0) {
              return (
                <li key={a.n} className="bg-panel-2/60 px-3 py-2 text-center text-[13px] font-semibold text-fg-muted sm:px-5">
                  {text} <span className="scoreboard ml-2 text-fg">{a.home}:{a.away}</span>
                </li>
              );
            }
            return (
              <li key={a.n} className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-3 py-2 sm:px-5">
                <div className="min-w-0 text-right">{a.side === 1 && body}</div>
                <div className="flex w-16 flex-col items-center sm:w-20">
                  <span className={cx("scoreboard text-[15px] leading-tight", made ? "font-bold" : "text-fg-muted")}>
                    <span className={cx(made && a.side === 1 && "text-fg")}>{a.home}</span>
                    <span className="text-fg-faint">:</span>
                    <span className={cx(made && a.side === 2 && "text-fg")}>{a.away}</span>
                  </span>
                  <span className="scoreboard text-[11px] text-fg-faint">{periodShort(a.period)} {a.clock}</span>
                </div>
                <div className="min-w-0">{a.side === 2 && body}</div>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}

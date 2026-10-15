"use client";

import { createContext, useContext, useState, useTransition } from "react";
import { Check, Wallet } from "lucide-react";
import { Button, buttonClass, cx } from "@/components/ui";
import { setMatchesPaid } from "@/app/(app)/admin/utakmice/actions";

// Lista odigranih utakmica: kvačice uz utakmice i traka "Označi plaćeno / neplaćeno".
// Plaćanje utakmice = isplata svim prihvaćenim delegiranjima (isto što i Naknade, po osobi).

type Selection = { selected: Set<string>; toggle: (id: string) => void; setMany: (ids: string[], on: boolean) => void };
const SelectionContext = createContext<Selection | null>(null);

export function PaidSelection({ children }: { children: React.ReactNode }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const setMany = (ids: string[], on: boolean) =>
    setSelected((s) => {
      const n = new Set(s);
      for (const id of ids) {
        if (on) n.add(id);
        else n.delete(id);
      }
      return n;
    });
  return (
    <SelectionContext.Provider value={{ selected, toggle, setMany }}>
      {children}
      <PaidBar />
    </SelectionContext.Provider>
  );
}

/** Kvačica uz odigranu utakmicu */
export function SelectPaid({ id, label }: { id: string; label: string }) {
  const ctx = useContext(SelectionContext)!;
  return (
    <label className="flex size-11 shrink-0 cursor-pointer items-center justify-center" title="Označi za plaćanje">
      <input
        type="checkbox"
        checked={ctx.selected.has(id)}
        onChange={() => ctx.toggle(id)}
        aria-label={`Označi: ${label}`}
        className="size-[18px] accent-[var(--brand)]"
      />
    </label>
  );
}

/** "Označi neplaćene" za cijeli dan */
export function SelectAllPaid({ ids, label = "Označi neplaćene" }: { ids: string[]; label?: string }) {
  const ctx = useContext(SelectionContext)!;
  if (ids.length === 0) return null;
  const all = ids.every((id) => ctx.selected.has(id));
  return (
    <button type="button" onClick={() => ctx.setMany(ids, !all)} className="text-[13px] font-semibold text-fg-muted underline-offset-4 hover:text-fg hover:underline">
      {all ? "Poništi oznake" : `${label} (${ids.length})`}
    </button>
  );
}

function PaidBar() {
  const ctx = useContext(SelectionContext)!;
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);
  const ids = [...ctx.selected];
  if (ids.length === 0 && !message) return null;

  const apply = (paid: boolean) =>
    start(async () => {
      const r = await setMatchesPaid(ids, paid);
      if (!r.error) ctx.setMany(ids, false);
      setMessage(
        r.error
          ? { text: r.error, error: true }
          : { text: `${paid ? "Plaćeno" : "Vraćeno na neplaćeno"}: ${r.matches} ${r.matches === 1 ? "utakmica" : "utakmice"}.` },
      );
    });

  return (
    <>
      {/* Prostor ispod liste da traka ne prekrije zadnje utakmice */}
      <div aria-hidden className="h-20 md:h-6 print:hidden" />
      <div className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+68px)] z-40 px-4 md:bottom-6 print:hidden">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-3 rounded-lg border border-line bg-panel px-4 py-3 shadow-pop">
          {ids.length > 0 ? (
            <>
              <span className="text-[14px] font-semibold">Označeno: {ids.length}</span>
              <button type="button" onClick={() => ctx.setMany(ids, false)} className="-my-2.5 h-10 text-[13px] font-medium text-fg-muted hover:text-fg">
                Poništi
              </button>
              <div className="ml-auto flex flex-wrap items-center gap-2">
                <button type="button" disabled={pending} onClick={() => apply(false)} className={buttonClass("secondary")}>
                  Nije plaćeno
                </button>
                <Button disabled={pending} onClick={() => apply(true)}>
                  <Wallet className="size-4" />
                  {pending ? "Čuvam…" : "Označi plaćeno"}
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className={cx("flex-1 text-[14px]", message?.error ? "text-crest" : "text-fg")}>
                {!message?.error && <Check className="mr-1.5 inline size-4 text-mint" />}
                {message?.text}
              </p>
              <button type="button" onClick={() => setMessage(null)} className="-my-2.5 h-10 text-[13px] font-medium text-fg-muted hover:text-fg">
                Zatvori
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}

/** Oznaka plaćanja utakmice u listi: plaćena / djelimično / nije plaćena */
export function MatchPaidBadge({ state, paid, total }: { state: "paid" | "partial" | "unpaid" | "none"; paid: number; total: number }) {
  if (state === "none") return null;
  const tone = state === "paid" ? "bg-mint/12 text-mint" : state === "partial" ? "bg-amber/15 text-amber-ink" : "bg-crest/10 text-crest";
  const text = state === "paid" ? "Plaćena" : state === "partial" ? `Plaćeno ${paid}/${total}` : "Nije plaćena";
  return (
    <span className={cx("inline-flex h-6 items-center gap-1 whitespace-nowrap rounded-md px-2 text-[12px] font-semibold", tone)}>
      {state === "paid" && <Check className="size-3.5" strokeWidth={2.6} />}
      {text}
    </span>
  );
}

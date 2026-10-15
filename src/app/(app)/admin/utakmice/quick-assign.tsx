"use client";

import { useEffect, useId, useRef, useState, useTransition, type ComponentType } from "react";
import { ChartColumn, ClipboardPen, LoaderCircle, Search, ShieldUser, Timer, TimerReset, Whistle } from "lucide-react";
import { Popover } from "@/components/popover";
import { cx } from "@/components/ui";
import type { CrewSlot } from "@/lib/data/admin";
import { ASSIGNMENT_STATUS_LABEL, positionName, type Position } from "@/lib/format";
import { candidateHint, groupCandidates } from "./[id]/assign-form";
import { quickAssign, quickCandidates, quickUnassign, type QuickPick } from "./actions";

type Icon = ComponentType<{ className?: string; "aria-hidden"?: boolean }>;

function iconOf(position: Position): Icon {
  if (position === "commissioner") return ShieldUser;
  if (position.startsWith("referee")) return Whistle;
  if (position === "scorer" || position === "assistant_scorer") return ClipboardPen;
  if (position === "shot_clock") return TimerReset;
  if (position.startsWith("statistician")) return ChartColumn;
  return Timer;
}

/** Broj uz ikonu kad utakmica ima više istih pozicija (1. i 2. sudija, statistika 2) */
function numberOf(position: Position) {
  const n = position.match(/_(\d)$/)?.[1];
  return n && (position.startsWith("referee") || n !== "1") ? n : null;
}

/**
 * Brzo delegiranje iz liste: ikonica za svaku poziciju utakmice. Klik otvara listu ljudi
 * koji mogu na poziciju (slobodni prvi); izbor odmah delegira ili zamjenjuje.
 */
export function QuickAssign({ matchId, slots, digital, label, className }: { matchId: string; slots: CrewSlot[]; digital: boolean; label: string; className?: string }) {
  if (slots.length === 0) return null;
  return (
    <div role="group" aria-label={`Delegiranje: ${label}`} className={cx("items-center gap-1", className)}>
      {slots.map((s) => (
        <SlotButton key={s.position} matchId={matchId} slot={s} digital={digital} />
      ))}
    </div>
  );
}

function SlotButton({ matchId, slot, digital }: { matchId: string; slot: CrewSlot; digital: boolean }) {
  const [open, setOpen] = useState(false);
  const anchor = useRef<HTMLSpanElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const id = useId();
  const name = positionName(slot.position, digital);
  const Icon = iconOf(slot.position);
  const n = numberOf(slot.position);
  const active = slot.name && (slot.status === "accepted" || slot.status === "pending");
  const title = slot.name ? `${name}: ${slot.name} (${ASSIGNMENT_STATUS_LABEL[slot.status!]})` : `${name}: niko nije delegiran`;

  const close = (refocus = true) => {
    setOpen(false);
    if (refocus) trigger.current?.focus();
  };

  return (
    <span ref={anchor} className="inline-flex">
      <button
        ref={trigger}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        aria-label={title}
        title={title}
        onClick={() => (open ? close() : setOpen(true))}
        className={cx(
          "relative grid size-9 place-items-center rounded-md border transition-colors sm:size-8",
          active
            ? slot.status === "accepted"
              ? "border-mint/30 bg-mint/10 text-mint hover:bg-mint/15"
              : "border-amber/40 bg-amber/15 text-amber-ink hover:bg-amber/25"
            : slot.name
              ? "border-crest/30 bg-crest/10 text-crest hover:bg-crest/15"
              : "border-dashed border-line-strong text-fg-muted hover:border-line-hover hover:text-fg",
          open && "ring-4 ring-fg/8",
        )}
      >
        <Icon className="size-4" aria-hidden />
        {n && <span className="absolute bottom-px right-0.5 text-[9px] font-bold leading-none">{n}</span>}
      </button>
      {open && (
        <Popover id={id} anchor={anchor} label={`Delegiraj: ${name}`} width={300} onClose={close}>
          <Picker matchId={matchId} position={slot.position} title={name} onDone={() => close()} />
        </Popover>
      )}
    </span>
  );
}

/** Lista ljudi za poziciju; prozor ostaje otvoren dok se čuva (greška se vidi u njemu), uspjeh ga zatvara */
function Picker({ matchId, position, title, onDone }: { matchId: string; position: Position; title: string; onDone: () => void }) {
  const [data, setData] = useState<QuickPick | null | undefined>();
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();

  useEffect(() => {
    let live = true;
    quickCandidates(matchId, position).then(
      (r) => live && setData(r),
      () => live && setData(null),
    );
    return () => {
      live = false;
    };
  }, [matchId, position]);

  const save = (action: () => Promise<{ error?: string }>) =>
    start(async () => {
      const r = await action();
      if (r.error) setError(r.error);
      else onDone();
    });

  if (data === undefined) {
    return (
      <div className="flex items-center gap-2 py-2 text-[14px] text-fg-muted">
        <LoaderCircle className="size-4 animate-spin" aria-hidden />
        Učitavam…
      </div>
    );
  }
  if (data === null) return <p className="py-2 text-[14px] text-crest">Utakmica nije pronađena.</p>;

  const q = query.trim().toLocaleLowerCase("bs");
  const match = (name: string) => !q || name.toLocaleLowerCase("bs").includes(q);
  const { free, busy, away } = groupCandidates(data.candidates);
  const groups = [
    { title: "Slobodni", list: free.filter((c) => match(c.name)) },
    { title: "Imaju utakmicu istog dana", list: busy.filter((c) => match(c.name)) },
  ].filter((g) => g.list.length > 0);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-[13px] font-semibold text-fg-muted">
          {title}
          {pending && <LoaderCircle className="size-3.5 animate-spin" aria-label="Čuvam" />}
        </span>
        {away.length > 0 && <span className="text-[12px] text-fg-faint">{away.length} odsutno</span>}
      </div>
      {data.current && (
        <div className="flex items-center justify-between gap-2 rounded-md bg-panel-2 px-2.5 py-2">
          <span className="min-w-0 truncate text-[14px] font-semibold">{data.current.name}</span>
          <button
            type="button"
            disabled={pending}
            onClick={() => save(() => quickUnassign(matchId, data.current!.id))}
            className="shrink-0 text-[13px] font-semibold text-crest hover:opacity-75 disabled:opacity-50"
          >
            Ukloni
          </button>
        </div>
      )}
      {free.length + busy.length === 0 ? (
        <p className="py-1 text-[14px] text-fg-muted">
          {data.candidates.length === 0 ? "Nema slobodnih osoba za ovu poziciju." : "Svi za ovu poziciju su najavili odsustvo."}
        </p>
      ) : (
        <>
          <label className="flex h-9 items-center gap-2 rounded-md border border-line bg-panel-2 px-2.5 focus-within:border-fg-muted">
            <Search className="size-4 shrink-0 text-fg-muted" aria-hidden="true" />
            <input
              autoFocus
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setError(undefined);
              }}
              placeholder={data.current ? "Zamijeni sa…" : "Traži osobu"}
              aria-label="Traži osobu"
              className="min-w-0 flex-1 bg-transparent text-[14px] outline-none placeholder:text-faint"
            />
          </label>
          <div className="-mx-1 flex max-h-72 flex-col gap-2 overflow-y-auto overscroll-contain px-1">
            {groups.map((g) => (
              <div key={g.title}>
                <div className="px-2.5 pb-1 text-[11px] font-semibold uppercase tracking-wide text-fg-faint">{g.title}</div>
                <ul className="flex flex-col gap-0.5">
                  {g.list.map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => save(() => quickAssign(matchId, position, c.id, data.current?.id ?? null))}
                        className="flex h-9 w-full items-center gap-2 rounded-md px-2.5 text-left text-[14px] hover:bg-panel-2 disabled:opacity-50"
                      >
                        <span className="min-w-0 flex-1 truncate">{c.name}</span>
                        <span className="shrink-0 text-[12px] text-fg-faint">{candidateHint(c)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            {groups.length === 0 && <p className="px-2.5 py-2 text-[14px] text-fg-muted">Nema osobe s tim imenom.</p>}
          </div>
        </>
      )}
      {error && (
        <p role="alert" className="text-[13px] font-medium text-crest">
          {error}
        </p>
      )}
    </div>
  );
}

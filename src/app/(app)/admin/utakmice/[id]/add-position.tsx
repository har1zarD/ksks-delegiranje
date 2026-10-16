"use client";

import { useRef } from "react";
import { Plus, X } from "lucide-react";
import { Button, buttonClass } from "@/components/ui";
import type { Position } from "@/lib/format";
import { addPosition } from "./actions";

/** "Dodaj poziciju" ispod delegiranja: prozor s pozicijama koje utakmica još nema (3. sudija, zapisnik, semafor, statistika…) */
export function AddPosition({ matchId, options }: { matchId: string; options: { position: Position; label: string }[] }) {
  const dialog = useRef<HTMLDialogElement>(null);
  if (options.length === 0) return null;

  return (
    <>
      <button type="button" onClick={() => dialog.current?.showModal()} className={buttonClass("secondary", "h-10 gap-1.5 text-[14px]")}>
        <Plus className="size-4" aria-hidden="true" />
        Dodaj poziciju
      </button>

      <dialog
        ref={dialog}
        onClick={(e) => e.target === dialog.current && dialog.current?.close()}
        className="m-auto w-[min(420px,calc(100vw-32px))] rounded-lg border border-line bg-panel p-0 text-fg shadow-pop backdrop:bg-overlay backdrop:backdrop-blur-[2px]"
      >
        <div className="flex flex-col gap-4 p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="font-display text-[20px] font-semibold leading-tight">Dodaj poziciju</h2>
              <p className="mt-1 text-[14px] text-fg-muted">Pozicija se dodaje samo ovoj utakmici, pa je delegiraš kao i ostale.</p>
            </div>
            <button type="button" onClick={() => dialog.current?.close()} aria-label="Zatvori" className="-m-2.5 rounded-md p-2.5 text-fg-faint transition-colors hover:bg-panel-2 hover:text-fg">
              <X className="size-5" />
            </button>
          </div>

          <ul className="divide-y divide-line rounded-lg border border-line">
            {options.map((o) => (
              <li key={o.position}>
                {/* Prozor se zatvara odmah, a stranica se osvježi kad akcija prođe */}
                <form action={addPosition} onSubmit={() => dialog.current?.close()}>
                  <input type="hidden" name="match_id" value={matchId} />
                  <input type="hidden" name="position" value={o.position} />
                  <button type="submit" className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-[15px] font-semibold transition-colors hover:bg-panel-2">
                    {o.label}
                    <Plus className="size-4 text-fg-faint" aria-hidden="true" />
                  </button>
                </form>
              </li>
            ))}
          </ul>

          <div className="flex justify-end">
            <Button type="button" variant="secondary" onClick={() => dialog.current?.close()}>
              Odustani
            </Button>
          </div>
        </div>
      </dialog>
    </>
  );
}

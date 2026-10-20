"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Check, Plus } from "lucide-react";
import { SelectInput } from "@/components/select";
import { Button, inputClass } from "@/components/ui";
import { addFibaGame, type AddFibaState } from "./actions";

/** Admin: utakmica koje nema u feedu takmičenja (npr. starija ili drugo takmičenje) dodaje se FIBA linkom */
export function AddFibaGame({ competitions }: { competitions: { id: number; name: string }[] }) {
  const [state, action, pending] = useActionState<AddFibaState, FormData>(addFibaGame, {});
  return (
    <details className="group rounded-lg border border-line bg-panel shadow-panel">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-[15px] font-semibold sm:px-6 [&::-webkit-details-marker]:hidden">
        <Plus className="size-4 text-fg-muted" aria-hidden="true" />
        Dodaj utakmicu FIBA linkom
      </summary>
      <form action={action} className="flex flex-col gap-3 border-t border-line px-4 py-4 sm:flex-row sm:items-start sm:px-6">
        <input
          name="link"
          required
          placeholder="https://fibalivestats.dcd.shared.geniussports.com/u/BIH/2939998/"
          aria-label="FIBA LiveStats link"
          className={inputClass + " sm:flex-1"}
        />
        <div className="sm:w-64">
          <SelectInput name="competition_id" defaultValue="" aria-label="Takmičenje">
            <option value="">Takmičenje (neobavezno)</option>
            {competitions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </SelectInput>
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? "Dodajem…" : "Dodaj"}
        </Button>
      </form>
      {(state.error || state.added) && (
        <p role={state.error ? "alert" : "status"} className="px-4 pb-4 text-[14px] sm:px-6">
          {state.error ? (
            <span className="text-crest">{state.error}</span>
          ) : (
            <Link href={`/fiba/${state.added}`} className="inline-flex items-center gap-1.5 font-semibold text-mint">
              <Check className="size-4" aria-hidden="true" /> Dodano, otvori utakmicu
            </Link>
          )}
        </p>
      )}
    </details>
  );
}

"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { DateField, TimeField } from "@/components/date-picker";
import { Field } from "@/components/ui";
import { ActionForm, Select } from "../action-form";
import { createFixtureMatch } from "../actions";

/** Termin nenapravljene utakmice kako je upisan u formi rasporeda (po broju iz rasporeda) */
export type Draft = { date: string; time: string; hallId: string };

type Drafts = { drafts: Record<number, Draft>; set: (number: number, patch: Partial<Draft>) => void };

const DraftsContext = createContext<Drafts | null>(null);

/** Forme rasporeda (lijevo) i slika za objavu (desno) dijele upisane termine */
export function DraftsProvider({ initial, children }: { initial: Record<number, Draft>; children: ReactNode }) {
  const [drafts, setDrafts] = useState(initial);
  const set = (number: number, patch: Partial<Draft>) => setDrafts((old) => ({ ...old, [number]: { ...old[number], ...patch } }));
  return <DraftsContext.Provider value={{ drafts, set }}>{children}</DraftsContext.Provider>;
}

export function useDrafts() {
  const ctx = useContext(DraftsContext);
  if (!ctx) throw new Error("useDrafts van DraftsProvider");
  return ctx.drafts;
}

/** Forma jedne nenapravljene utakmice; svaka izmjena termina ide i na sliku za objavu */
export function FixtureForm({
  competitionId,
  number,
  round,
  homeId,
  awayId,
  suggestedNumber,
  halls,
}: {
  competitionId: string;
  number: number;
  round: number;
  homeId: string;
  awayId: string;
  suggestedNumber?: number;
  halls: { id: string; name: string }[];
}) {
  const ctx = useContext(DraftsContext)!;
  const draft = ctx.drafts[number];
  return (
    <ActionForm action={createFixtureMatch} submit="Napravi utakmicu" pendingLabel="Pravim…" className="mt-3">
      <input type="hidden" name="competition_id" value={competitionId} />
      <input type="hidden" name="round" value={round} />
      <input type="hidden" name="home_team_id" value={homeId} />
      <input type="hidden" name="away_team_id" value={awayId} />
      <div className="grid gap-4 sm:grid-cols-[1fr_1fr_2fr_1fr]">
        <DateField label="Datum" name="date" defaultValue={draft.date} onChange={(date) => ctx.set(number, { date })} required />
        <TimeField label="Vrijeme" name="time" step={300} defaultValue={draft.time || undefined} onChange={(time) => ctx.set(number, { time })} required />
        <Select label="Dvorana" name="hall_id" defaultValue={draft.hallId} onChange={(e) => ctx.set(number, { hallId: e.target.value })}>
          <option value="">Nije određena</option>
          {halls.map((h) => (
            <option key={h.id} value={h.id}>
              {h.name}
            </option>
          ))}
        </Select>
        {/* Zauzet broj: prazno, baza dodijeli sljedeći slobodan */}
        <Field label="Broj" name="number" type="number" inputMode="numeric" min={1} defaultValue={suggestedNumber} />
      </div>
    </ActionForm>
  );
}

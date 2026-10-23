"use client";

import { DateField, TimeField } from "@/components/date-picker";
import { Field } from "@/components/ui";
import { ActionForm, Select } from "../action-form";
import { createFixtureMatch } from "../actions";

/** Predloženi termin nenapravljene utakmice iz rasporeda saveza */
export type Draft = { date: string; time: string; hallId: string };

/** Forma jedne nenapravljene utakmice */
export function FixtureForm({
  competitionId,
  draft,
  round,
  homeId,
  awayId,
  suggestedNumber,
  halls,
}: {
  competitionId: string;
  draft: Draft;
  round: number;
  homeId: string;
  awayId: string;
  suggestedNumber?: number;
  halls: { id: string; name: string }[];
}) {
  return (
    <ActionForm action={createFixtureMatch} submit="Napravi utakmicu" pendingLabel="Pravim…" className="mt-3">
      <input type="hidden" name="competition_id" value={competitionId} />
      <input type="hidden" name="round" value={round} />
      <input type="hidden" name="home_team_id" value={homeId} />
      <input type="hidden" name="away_team_id" value={awayId} />
      <div className="grid gap-4 sm:grid-cols-[1fr_1fr_2fr_1fr]">
        <DateField label="Datum" name="date" defaultValue={draft.date} required />
        <TimeField label="Vrijeme" name="time" step={300} defaultValue={draft.time || undefined} required />
        <Select label="Dvorana" name="hall_id" defaultValue={draft.hallId}>
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

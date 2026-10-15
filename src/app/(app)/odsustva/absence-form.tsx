"use client";

import { useActionState } from "react";
import { DateField, TimeField } from "@/components/date-picker";
import { Button, Field } from "@/components/ui";
import { addAbsence, type AbsenceState } from "./actions";

/** Od (datum + vrijeme) do (datum + vrijeme). Bez vremena = cijeli dan; bez datuma "do" = isti dan. */
export function AbsenceForm({ today }: { today: string }) {
  const [state, action, pending] = useActionState<AbsenceState, FormData>(addAbsence, {});

  return (
    // key: forma se isprazni nakon uspješnog unosa
    <form
      key={state.ok}
      action={action}
      className="grid grid-cols-2 items-start gap-3 rounded-lg border border-line bg-panel px-4 py-5 shadow-panel sm:px-5 lg:grid-cols-4"
    >
      <DateField label="Od" name="from" min={today} required hint="Prvi dan" />
      <TimeField label="Od sati" name="from_time" step={900} placeholder="Cijeli dan" hint="Prazno = od 00:00" />
      <DateField label="Do" name="to" min={today} hint="Prazno = isti dan" />
      <TimeField label="Do sati" name="to_time" step={900} placeholder="Cijeli dan" hint="Prazno = do kraja dana" />
      <Field label="Razlog" name="reason" placeholder="Npr. put, ispiti, posao" hint="Nije obavezno" className="col-span-2 lg:col-span-3" />
      {/* Prazan naslov iste visine kao kod polja, da dugme stoji u ravni s njima */}
      <div className="col-span-2 flex flex-col gap-1.5 lg:col-span-1">
        <span aria-hidden className="hidden text-[13px] font-medium lg:block">&nbsp;</span>
        <Button type="submit" disabled={pending}>
          {pending ? "Čuvam…" : "Dodaj odsustvo"}
        </Button>
      </div>
      {state.error && (
        <p role="alert" className="col-span-2 text-[14px] text-crest lg:col-span-4">
          {state.error}
        </p>
      )}
    </form>
  );
}

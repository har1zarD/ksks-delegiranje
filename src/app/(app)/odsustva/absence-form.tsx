"use client";

import { useActionState } from "react";
import { Button, Field } from "@/components/ui";
import { addAbsence, type AbsenceState } from "./actions";

export function AbsenceForm({ today }: { today: string }) {
  const [state, action, pending] = useActionState<AbsenceState, FormData>(addAbsence, {});

  return (
    // key: forma se isprazni nakon uspješnog unosa
    <form
      key={state.ok}
      action={action}
      className="grid grid-cols-2 gap-3 rounded-lg border border-line bg-panel px-4 sm:px-5 py-5 lg:grid-cols-[1fr_1fr_2fr_auto] lg:items-end"
    >
      <Field label="Od" name="from" type="date" min={today} required />
      <Field label="Do" name="to" type="date" min={today} hint="Prazno = jedan dan" />
      <Field label="Razlog" name="reason" placeholder="Npr. put, ispiti" hint="Nije obavezno" className="col-span-2 lg:col-span-1" />
      <Button type="submit" disabled={pending} className="col-span-2 lg:col-span-1 lg:mb-[22px]">
        {pending ? "Čuvam…" : "Dodaj odsustvo"}
      </Button>
      {state.error && (
        <p role="alert" className="col-span-2 text-[14px] text-crest lg:col-span-4">
          {state.error}
        </p>
      )}
    </form>
  );
}

"use client";

import { useActionState } from "react";
import { Button, Field } from "@/components/ui";
import { addPayment, type PaymentState } from "./actions";

export function PaymentForm({ teamId, today, suggested }: { teamId: string; today: string; suggested: number }) {
  const [state, action, pending] = useActionState<PaymentState, FormData>(addPayment, {});

  return (
    <form key={state.ok} action={action} className="flex flex-col gap-3">
      <input type="hidden" name="team_id" value={teamId} />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-[140px_170px_1fr_auto] sm:items-end">
        <Field
          label="Iznos (KM)"
          name="amount"
          inputMode="decimal"
          required
          placeholder="0"
          defaultValue={suggested > 0 ? String(suggested) : ""}
          className="[&_input]:font-display [&_input]:text-[20px] [&_input]:font-semibold [&_input]:tabular-nums"
        />
        <Field label="Datum uplate" name="paid_on" type="date" required defaultValue={today} max={today} />
        <Field label="Napomena" name="note" placeholder="Npr. izvod 12/26" className="col-span-2 sm:col-span-1" />
        <Button type="submit" disabled={pending} className="col-span-2 sm:col-span-1">
          {pending ? "Čuvam…" : "Dodaj uplatu"}
        </Button>
      </div>
      {state.error && (
        <p role="alert" className="text-[14px] text-crest">
          {state.error}
        </p>
      )}
    </form>
  );
}

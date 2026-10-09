"use client";

import { useActionState } from "react";
import { Check } from "lucide-react";
import { Button, Field } from "@/components/ui";
import { changePassword, type PasswordState } from "./actions";

export function PasswordForm() {
  const [state, action, pending] = useActionState<PasswordState, FormData>(changePassword, {});

  return (
    <form key={state.ok} action={action} className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
      <Field label="Nova šifra" name="password" type="password" autoComplete="new-password" minLength={8} required placeholder="Najmanje 8 znakova" />
      <Field label="Ponovi šifru" name="confirm" type="password" autoComplete="new-password" minLength={8} required />
      <Button type="submit" disabled={pending} className="sm:h-11">
        {pending ? "Čuvam…" : "Promijeni šifru"}
      </Button>
      {state.error ? (
        <p role="alert" className="text-[14px] text-crest sm:col-span-3">
          {state.error}
        </p>
      ) : (
        state.ok && (
          <p className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-mint sm:col-span-3">
            <Check className="size-4" /> Šifra je promijenjena.
          </p>
        )
      )}
    </form>
  );
}

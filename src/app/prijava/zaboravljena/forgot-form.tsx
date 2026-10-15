"use client";

import { useActionState } from "react";
import { Mail, MailCheck } from "lucide-react";
import { Button, Field } from "@/components/ui";
import { requestPasswordReset, type ResetRequestState } from "../actions";

export function ForgotForm() {
  const [state, action, pending] = useActionState<ResetRequestState, FormData>(requestPasswordReset, {});

  if (state.sent) {
    return (
      <p role="status" className="flex gap-3 rounded-lg bg-panel-2 p-4 text-[14px] leading-relaxed">
        <MailCheck className="mt-0.5 size-5 shrink-0 text-mint" aria-hidden="true" />
        <span>
          Ako postoji nalog za <strong className="font-semibold">{state.email}</strong>, poslali smo link za novu šifru. Provjeri i spam folder.
        </span>
      </p>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      <Field label="Email" icon={<Mail />} name="email" type="email" autoComplete="email" defaultValue={state.email} required autoFocus />
      {state.error && (
        <p role="alert" className="text-[14px] font-medium text-crest">
          {state.error}
        </p>
      )}
      <Button type="submit" disabled={pending} className="mt-1 h-12 w-full text-[16px] sm:h-12 sm:text-[15px]">
        {pending ? "Šaljem…" : "Pošalji link"}
      </Button>
    </form>
  );
}

"use client";

import { useActionState } from "react";
import { ArrowRight, LockKeyhole, Mail } from "lucide-react";
import { login, type LoginState } from "./actions";
import { Button, Field } from "@/components/ui";

export function LoginForm({ next, notice }: { next?: string; notice?: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});
  const error = state.error ?? notice;

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="next" value={next ?? ""} />
      <Field
        label="Email"
        icon={<Mail />}
        name="email"
        type="email"
        autoComplete="email"
        defaultValue={state.email}
        required
        autoFocus
      />
      <Field label="Šifra" icon={<LockKeyhole />} name="password" type="password" autoComplete="current-password" required />
      {error && (
        <p role="alert" className="text-[14px] font-medium text-crest">
          {error}
        </p>
      )}
      <Button type="submit" disabled={pending} className="mt-1 h-12 w-full text-[16px] sm:h-12 sm:text-[15px]">
        {pending ? "Prijava…" : "Prijavi se"}
        {!pending && <ArrowRight className="size-4" aria-hidden="true" />}
      </Button>
    </form>
  );
}

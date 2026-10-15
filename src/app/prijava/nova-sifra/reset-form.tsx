"use client";

import Link from "next/link";
import { useActionState } from "react";
import { LockKeyhole } from "lucide-react";
import { Button, Field } from "@/components/ui";
import { resetPassword, type ResetState } from "../actions";

export function ResetForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState<ResetState, FormData>(resetPassword, {});

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="token" value={token} />
      <Field
        label="Nova šifra"
        icon={<LockKeyhole />}
        name="password"
        type="password"
        autoComplete="new-password"
        minLength={8}
        placeholder="Najmanje 8 znakova"
        required
        autoFocus
      />
      <Field label="Ponovi šifru" icon={<LockKeyhole />} name="confirm" type="password" autoComplete="new-password" minLength={8} required />
      {state.error && (
        <p role="alert" className="text-[14px] font-medium text-crest">
          {state.error}{" "}
          {state.expired && (
            <Link href="/prijava/zaboravljena" className="font-semibold text-brand underline-offset-4 hover:underline">
              Zatraži novi link
            </Link>
          )}
        </p>
      )}
      <Button type="submit" disabled={pending} className="mt-1 h-12 w-full text-[16px] sm:h-12 sm:text-[15px]">
        {pending ? "Čuvam…" : "Sačuvaj šifru"}
      </Button>
    </form>
  );
}

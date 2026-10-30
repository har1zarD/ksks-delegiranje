"use client";

import { useActionState, useState } from "react";
import { Button, inputClass } from "@/components/ui";
import { respond, type RespondState } from "./actions";

export function RespondForm({ id, accepted }: { id: string; accepted?: boolean }) {
  const [state, action, pending] = useActionState<RespondState, FormData>(respond, {});
  const [declining, setDeclining] = useState(false);

  if (declining) {
    return (
      <form
        action={action}
        className="flex w-full flex-col gap-3 sm:w-80 sm:shrink-0"
      >
        <input type="hidden" name="id" value={id} />
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-medium text-fg-muted">
            {accepted ? "Zašto otkazuješ dolazak?" : "Zašto odbijaš?"}
          </span>
          <input name="reason" required autoFocus placeholder="Npr. bolest, obaveze na poslu" className={inputClass} />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <Button type="button" variant="secondary" onClick={() => setDeclining(false)}>
            Nazad
          </Button>
          <Button type="submit" variant="danger" disabled={pending}>
            {pending ? "Šaljem…" : accepted ? "Otkaži" : "Odbij"}
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

  if (accepted) {
    // Telefon: u gornjem desnom uglu kartice (iznad sadržaja) da ne vuče skrol; od sm vraća se u red pored utakmice
    return (
      <form action={action} className="absolute right-4 top-3 sm:static sm:right-auto sm:top-auto sm:flex sm:shrink-0 sm:justify-end">
        <input type="hidden" name="id" value={id} />
        <Button type="button" variant="destructive" onClick={() => setDeclining(true)} className="h-auto! px-0! text-[13px]! sm:h-10! sm:px-2! sm:text-[14px]!">
          Otkaži dolazak
        </Button>
        {state.error && <p className="text-[14px] text-crest">{state.error}</p>}
      </form>
    );
  }

  return (
    <form action={action} className="flex w-full flex-col gap-2 sm:w-auto sm:shrink-0">
      <input type="hidden" name="id" value={id} />
      <div className="grid grid-cols-2 gap-2 sm:flex">
        <Button type="button" variant="secondary" onClick={() => setDeclining(true)}>
          Odbij
        </Button>
        <Button type="submit" name="accept" value="1" disabled={pending} className="sm:min-w-32">
          {pending ? "Šaljem…" : "Prihvati"}
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

"use client";

import { useActionState } from "react";
import { Check, Send } from "lucide-react";
import { Button } from "@/components/ui";
import { sendNominations, type SendState } from "./actions";

/** Šalje email svima kojima nominacija još nije poslana */
export function SendForm({ matchId, unsent }: { matchId: string; unsent: number }) {
  const [state, action, pending] = useActionState<SendState, FormData>(sendNominations, {});

  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="match_id" value={matchId} />
      {unsent > 0 ? (
        <Button type="submit" disabled={pending} className="w-full">
          <Send className="size-4" />
          {pending ? "Šaljem…" : `Pošalji nominacije (${unsent})`}
        </Button>
      ) : (
        <p className="text-[14px] text-fg-muted">Sve nominacije su poslane.</p>
      )}
      {state.error ? (
        <p role="alert" className="text-[13px] text-crest">
          {state.error}
        </p>
      ) : (
        state.sent !== undefined && (
          <p className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-mint">
            <Check className="size-4" /> Poslano: {state.sent}
          </p>
        )
      )}
    </form>
  );
}

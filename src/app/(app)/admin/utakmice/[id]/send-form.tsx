"use client";

import { useActionState } from "react";
import { Check, Send } from "lucide-react";
import { Button } from "@/components/ui";
import type { NominationGroup } from "@/lib/crew";
import { sendNominations, type SendState } from "./actions";

/** Šalje nominacije kojima još nije poslana (sve, ili samo jedna grupa kod seniora) */
export function SendForm({ matchId, unsent, group, label = "Pošalji nominacije" }: { matchId: string; unsent: number; group?: NominationGroup; label?: string }) {
  const [state, action, pending] = useActionState<SendState, FormData>(sendNominations, {});

  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="match_id" value={matchId} />
      {group && <input type="hidden" name="group" value={group} />}
      {unsent > 0 ? (
        <Button type="submit" disabled={pending} className="w-full">
          <Send className="size-4" />
          {pending ? "Šaljem…" : `${label} (${unsent})`}
        </Button>
      ) : (
        <p className="text-[14px] text-fg-muted">Nema neposlanih nominacija.</p>
      )}
      {state.error && (
        <p role="alert" className="text-[13px] text-crest">
          {state.error}
        </p>
      )}
      {state.sent !== undefined && !state.error && (
        <p className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-mint">
          <Check className="size-4" /> Poslano: {state.sent}
        </p>
      )}
      {state.warning && <p className="text-[13px] text-amber-ink">{state.warning}</p>}
    </form>
  );
}

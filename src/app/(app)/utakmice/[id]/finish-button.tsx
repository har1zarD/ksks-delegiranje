"use client";

import { confirmSubmit } from "@/components/confirm";
import { Button } from "@/components/ui";
import { setStatus } from "./actions";

/** Završetak utakmice traži potvrdu: nakon toga se rezultat smatra konačnim */
export function FinishButton({ matchId }: { matchId: string }) {
  return (
    <form
      action={setStatus}
      onSubmit={confirmSubmit({
        title: "Završiti utakmicu?",
        message: "Rezultat postaje konačan.",
        confirmLabel: "Završi",
        tone: "danger",
      })}
    >
      <input type="hidden" name="match_id" value={matchId} />
      <input type="hidden" name="status" value="finished" />
      <Button type="submit" variant="danger" className="w-full sm:w-auto">
        Završi utakmicu
      </Button>
    </form>
  );
}

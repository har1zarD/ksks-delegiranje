"use client";

import { useState, useTransition } from "react";
import { Lock } from "lucide-react";
import { confirm } from "@/components/confirm";
import { Button, cx } from "@/components/ui";
import { lockMatch } from "@/app/(app)/utakmice/[id]/actions";

/** "Zaključi utakmicu": nakon potvrde utakmica postaje završena (ulazi u obračun naknada), bez unosa rezultata */
export function LockMatchButton({ matchId, className }: { matchId: string; className?: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>();

  return (
    <div>
      <Button
        type="button"
        variant="secondary"
        disabled={pending}
        className={cx("w-full", className)}
        onClick={() =>
          void confirm({
            title: "Zaključiti utakmicu?",
            message: "Utakmica postaje završena i ulazi u obračun naknada.",
            confirmLabel: "Zaključi",
          }).then((ok) => {
            if (!ok) return;
            start(async () => {
              const r = await lockMatch(matchId);
              setError(r.error);
            });
          })
        }
      >
        <Lock className="size-4" aria-hidden="true" />
        {pending ? "Zaključujem…" : "Zaključi utakmicu"}
      </Button>
      {error && (
        <p role="alert" className="mt-2 text-[13px] text-crest">
          {error}
        </p>
      )}
    </div>
  );
}

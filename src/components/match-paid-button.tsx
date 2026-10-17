"use client";

import { useState, useTransition } from "react";
import { Check, RotateCcw } from "lucide-react";
import { confirm } from "@/components/confirm";
import { Button, cx } from "@/components/ui";
import { setMatchPaid } from "@/app/(app)/utakmice/[id]/actions";

/**
 * Isplata utakmice: prvi sudija (ili savez) označi da je klub isplatio sva službena lica, bez iznosa na dugmetu.
 * Isplaćena utakmica: natpis "Utakmica isplaćena" i "Poništi" (greškom označeno).
 */
export function MatchPaidButton({ matchId, paid, className }: { matchId: string; paid: boolean; className?: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>();

  const save = (value: boolean) =>
    start(async () => {
      const r = await setMatchPaid(matchId, value);
      setError(r.error);
    });

  return (
    <div>
      {paid ? (
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <span className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-mint">
            <Check className="size-4" strokeWidth={2.4} aria-hidden="true" />
            Utakmica isplaćena
          </span>
          <Button
            type="button"
            variant="plain"
            disabled={pending}
            onClick={() =>
              void confirm({
                title: "Poništiti isplatu?",
                message: "Sva službena lica na utakmici vraćaju se na neisplaćeno.",
                confirmLabel: "Poništi",
              }).then((ok) => ok && save(false))
            }
          >
            <RotateCcw className="size-3.5" aria-hidden="true" />
            {pending ? "Poništavam…" : "Poništi"}
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          variant="secondary"
          disabled={pending}
          className={cx("w-full", className)}
          onClick={() =>
            void confirm({
              title: "Označiti utakmicu kao isplaćenu?",
              message: "Sva službena lica na utakmici bit će označena kao isplaćena.",
              confirmLabel: "Isplaćena",
            }).then((ok) => ok && save(true))
          }
        >
          <Check className="size-4" aria-hidden="true" />
          {pending ? "Čuvam…" : "Označi utakmicu kao isplaćenu"}
        </Button>
      )}
      {error && (
        <p role="alert" className="mt-2 text-[13px] text-crest">
          {error}
        </p>
      )}
    </div>
  );
}

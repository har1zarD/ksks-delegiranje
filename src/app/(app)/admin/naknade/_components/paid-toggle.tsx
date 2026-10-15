"use client";

import { useOptimistic, useState, useTransition } from "react";
import { Check } from "lucide-react";
import { buttonClass, cx } from "@/components/ui";
import { formatKM } from "@/lib/finance";
import { setPaid } from "../actions";

/** Oznaka isplate: zeleno Isplaćeno / crveno Nije isplaćeno. Samo za prikaz kad nema onToggle (službena lica). */
export function PaidBadge({ paid, className }: { paid: boolean; className?: string }) {
  return (
    <span
      className={cx(
        "inline-flex h-6 items-center gap-1 whitespace-nowrap rounded-md px-2 text-[12px] font-semibold",
        paid ? "bg-mint/12 text-mint" : "bg-crest/10 text-crest",
        className,
      )}
    >
      {paid && <Check className="size-3.5" strokeWidth={2.6} />}
      {paid ? "Isplaćeno" : "Nije isplaćeno"}
    </span>
  );
}

/** Admin: klik mijenja isplatu jedne stavke (odmah na ekranu, čuva se u pozadini) */
export function PaidToggle({ id, paid }: { id: string; paid: boolean }) {
  const [optimistic, setOptimistic] = useOptimistic(paid);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>();

  return (
    <button
      type="button"
      disabled={pending}
      aria-pressed={optimistic}
      title={optimistic ? "Vrati na neisplaćeno" : "Označi kao isplaćeno"}
      onClick={() =>
        start(async () => {
          setOptimistic(!optimistic);
          const r = await setPaid([id], !optimistic);
          setError(r.error);
        })
      }
      className="relative shrink-0 rounded-md transition-opacity after:absolute after:-inset-2 hover:opacity-80 disabled:opacity-60"
    >
      <PaidBadge paid={optimistic} className={error ? "ring-1 ring-crest" : undefined} />
    </button>
  );
}

/** Admin: označi sve neisplaćene stavke osobe (ili trenutnog filtera) kao isplaćene */
export function MarkAllPaid({ ids, amount, label = "Označi sve isplaćeno" }: { ids: string[]; amount: number; label?: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>();
  if (ids.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await setPaid(ids, true);
            setError(r.error);
          })
        }
        className={buttonClass("secondary")}
      >
        <Check className="size-4" />
        {pending ? "Čuvam…" : `${label} (${formatKM(amount)})`}
      </button>
      {error && (
        <p role="alert" className="text-[13px] text-crest">
          {error}
        </p>
      )}
    </div>
  );
}

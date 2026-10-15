"use client";

import { useOptimistic, useState, useTransition } from "react";
import { Check, RotateCcw } from "lucide-react";
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

/** Admin: označi sve neisplaćene stavke osobe (ili trenutnog filtera) kao isplaćene; `paid={false}` vraća isplaćene na neisplaćeno */
export function MarkAllPaid({
  ids,
  amount,
  label = "Označi sve isplaćeno",
  paid = true,
  className,
}: {
  ids: string[];
  amount: number;
  label?: string;
  paid?: boolean;
  /** Omotač; npr. "w-full sm:w-auto" da dugme na telefonu zauzme cijeli red */
  className?: string;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>();
  if (ids.length === 0) return null;

  return (
    <div className={cx("flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1", className)}>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await setPaid(ids, paid);
            setError(r.error);
          })
        }
        className={buttonClass("secondary", "h-9 min-w-0 flex-1 px-3 text-[13px]")}
      >
        {paid ? <Check className="size-4 shrink-0" /> : <RotateCcw className="size-4 shrink-0" />}
        <span className="truncate">{pending ? "Čuvam…" : `${label} (${formatKM(amount)})`}</span>
      </button>
      {error && (
        <p role="alert" className="text-[13px] text-crest">
          {error}
        </p>
      )}
    </div>
  );
}

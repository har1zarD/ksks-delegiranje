"use client";

import { useState, useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { Button, cx } from "@/components/ui";
import { syncFiba } from "./actions";

/** Ručno povuče rezultate i statistiku s FIBA LiveStats odmah (inače se to dešava samo u pozadini, svakih 1-2 minute) */
export function SyncFibaButton() {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>();

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        variant="secondary"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await syncFiba();
            setError(r.error);
          })
        }
      >
        <RefreshCw className={cx("size-4", pending && "animate-spin")} aria-hidden="true" />
        {pending ? "Sinhronizujem…" : "Sinhronizuj"}
      </Button>
      {error && (
        <p role="alert" className="text-[13px] text-crest">
          {error}
        </p>
      )}
    </div>
  );
}

"use client";

import { useOptimistic, useState, useTransition } from "react";
import { setOnlyAssignedEmails } from "./actions";

/** Nominacija kola samo za utakmice na kojima je osoba delegirana: kvačica, odmah na ekranu, čuva se u pozadini */
export function EmailToggle({ value }: { value: boolean }) {
  const [optimistic, setOptimistic] = useOptimistic(value);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>();

  return (
    <div>
      <label className="flex cursor-pointer items-center gap-3">
        <input
          type="checkbox"
          checked={optimistic}
          disabled={pending}
          onChange={(e) => {
            const next = e.target.checked;
            start(async () => {
              setOptimistic(next);
              const r = await setOnlyAssignedEmails(next);
              setError(r.error);
            });
          }}
          className="size-5 shrink-0 accent-[var(--brand)]"
        />
        <span className="text-[15px] font-semibold">Emailovi samo za utakmice na kojima sam delegiran</span>
      </label>
      <p className="mt-1.5 pl-8 text-[13px] text-fg-muted">
        {optimistic
          ? "Nominaciju kola dobijaš samo kad si delegiran na nekoj od utakmica u njoj."
          : "Nominaciju kola dobijaš uvijek, i kad nisi delegiran ni na jednu utakmicu."}
      </p>
      {error && (
        <p role="alert" className="mt-1 pl-8 text-[13px] text-crest">
          {error}
        </p>
      )}
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { setMatchDone } from "@/app/(app)/utakmice/[id]/actions";

/**
 * Kvačica "Utakmica je završena": sudija, pomoćni sudija ili savez označi da je utakmica odigrana (ulazi u obračun naknada).
 * Odmah na ekranu, čuva se u pozadini; vraća se samo na grešku. Roditelj daje key={status} da se kvačica osvježi na promjenu izvana.
 */
export function MatchDoneToggle({ matchId, done }: { matchId: string; done: boolean }) {
  const [checked, setChecked] = useState(done);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>();

  return (
    <div>
      <label className="flex cursor-pointer items-center gap-3">
        <input
          type="checkbox"
          checked={checked}
          disabled={pending}
          onChange={(e) => {
            const value = e.target.checked;
            setChecked(value);
            setError(undefined);
            start(async () => {
              const r = await setMatchDone(matchId, value);
              if (r.error) {
                setChecked(!value);
                setError(r.error);
              }
            });
          }}
          className="size-5 shrink-0 accent-[var(--brand)]"
        />
        <span className="text-[15px] font-semibold">Utakmica je završena</span>
      </label>
      <p className="mt-1.5 pl-8 text-[13px] text-fg-muted">
        {checked ? "Odigrana je i ulazi u obračun naknada." : "Označi kad se utakmica odigra."}
      </p>
      {error && (
        <p role="alert" className="mt-1 pl-8 text-[13px] text-crest">
          {error}
        </p>
      )}
    </div>
  );
}

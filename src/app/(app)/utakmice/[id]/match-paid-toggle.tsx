"use client";

import { useOptimistic, useState, useTransition } from "react";
import { setMatchPaid } from "./actions";

/** Komesar (ili savez) označi da je utakmica plaćena: kvačica, odmah na ekranu, čuva se u pozadini */
export function MatchPaidToggle({ matchId, paid, count }: { matchId: string; paid: boolean; count: number }) {
  const [optimistic, setOptimistic] = useOptimistic(paid);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>();
  const people = `${count} ${count === 1 ? "službeno lice" : count >= 2 && count <= 4 ? "službena lica" : "službenih lica"}`;

  return (
    <div>
      <label className="flex cursor-pointer items-center gap-3">
        <input
          type="checkbox"
          checked={optimistic}
          disabled={pending}
          onChange={(e) => {
            const value = e.target.checked;
            start(async () => {
              setOptimistic(value);
              const r = await setMatchPaid(matchId, value);
              setError(r.error);
            });
          }}
          className="size-5 shrink-0 accent-[var(--brand)]"
        />
        <span className="text-[15px] font-semibold">Utakmica je plaćena</span>
      </label>
      <p className="mt-1.5 pl-8 text-[13px] text-fg-muted">
        {optimistic ? `Naknade su isplaćene (${people}).` : `Naknade još nisu isplaćene (${people}). Označi kad klub isplati službena lica.`}
      </p>
      {error && (
        <p role="alert" className="mt-1 pl-8 text-[13px] text-crest">
          {error}
        </p>
      )}
    </div>
  );
}

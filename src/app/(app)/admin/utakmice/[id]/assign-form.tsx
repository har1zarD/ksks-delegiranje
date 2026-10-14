"use client";

import { useActionState } from "react";
import { Button, cx, inputClass } from "@/components/ui";
import type { Candidate } from "@/lib/data/admin";
import { formatTime, type Position } from "@/lib/format";
import { assign, type AssignState } from "./actions";

/** Izbor osobe za poziciju. Slobodni prvi, sortirani po opterećenju u mjesecu. */
export function AssignForm({
  matchId,
  position,
  candidates,
}: {
  matchId: string;
  position: Position;
  candidates: Candidate[];
}) {
  const [state, action, pending] = useActionState<AssignState, FormData>(assign, {});

  const byLoad = (a: Candidate, b: Candidate) => a.monthLoad - b.monthLoad || a.name.localeCompare(b.name, "bs");
  const free = candidates.filter((c) => c.absence === null && c.sameDay.length === 0).sort(byLoad);
  const busy = candidates.filter((c) => c.absence === null && c.sameDay.length > 0).sort(byLoad);
  const away = candidates.filter((c) => c.absence !== null).sort(byLoad);

  const label = (c: Candidate) => {
    let text = `${c.name} (${c.monthLoad} u mjesecu)`;
    if (c.sameDay.length) text += `, sudi u ${c.sameDay.map(formatTime).join(" i ")}`;
    if (c.absence !== null) text += c.absence ? `, odsustvo: ${c.absence}` : ", odsustvo";
    return text;
  };

  if (candidates.length === 0) {
    return <p className="text-[14px] text-fg-faint">Nema registrovanih osoba za ovu poziciju.</p>;
  }

  const group = (title: string, list: Candidate[]) =>
    list.length > 0 && (
      <optgroup label={title}>
        {list.map((c) => (
          <option key={c.id} value={c.id}>
            {label(c)}
          </option>
        ))}
      </optgroup>
    );

  return (
    <form action={action} className="flex min-w-0 flex-col gap-1.5">
      <input type="hidden" name="match_id" value={matchId} />
      <input type="hidden" name="position" value={position} />
      <div className="flex min-w-0 gap-2">
        <select
          name="profile_id"
          defaultValue=""
          required
          aria-label="Izaberi osobu"
          className={cx(
            inputClass,
            "min-w-0 flex-1 appearance-none bg-[length:16px] bg-[right_12px_center] bg-no-repeat pr-9 text-[15px]",
            "bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%238b8b95' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")]",
          )}
        >
          <option value="" disabled>
            Izaberi osobu
          </option>
          {group("Slobodni", free)}
          {group("Imaju utakmicu istog dana", busy)}
          {group("Najavili odsustvo", away)}
        </select>
        <Button type="submit" variant="secondary" disabled={pending}>
          {pending ? "…" : "Dodijeli"}
        </Button>
      </div>
      <p className="text-[12px] text-fg-faint">
        {free.length} slobodnih
        {busy.length > 0 && `, ${busy.length} sudi isti dan`}
        {away.length > 0 && `, ${away.length} odsutno`}
      </p>
      {state.error && (
        <p role="alert" className="text-[13px] text-crest">
          {state.error}
        </p>
      )}
    </form>
  );
}

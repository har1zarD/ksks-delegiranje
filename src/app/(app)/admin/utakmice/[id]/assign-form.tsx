"use client";

import { useActionState } from "react";
import { SelectInput } from "@/components/select";
import { Button } from "@/components/ui";
import type { Candidate } from "@/lib/data/admin";
import { formatTime, type Position } from "@/lib/format";
import { assign, type AssignState } from "./actions";

/** Izbor osobe za poziciju. Slobodni prvi, sortirani po opterećenju u mjesecu. Ko je najavio odsustvo u vrijeme utakmice, nije na listi. */
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

  if (candidates.length === 0) {
    return <p className="text-[14px] text-fg-faint">Nema registrovanih osoba za ovu poziciju.</p>;
  }
  const { free, busy, away } = groupCandidates(candidates);
  if (free.length + busy.length === 0) {
    return (
      <p className="text-[14px] text-fg-faint" title={away.map((c) => `${c.name}: ${c.absence}`).join("\n")}>
        Svi za ovu poziciju su najavili odsustvo u vrijeme utakmice ({away.length}).
      </p>
    );
  }

  return (
    <form action={action} className="flex min-w-0 flex-col gap-1.5">
      <input type="hidden" name="match_id" value={matchId} />
      <input type="hidden" name="position" value={position} />
      <div className="flex min-w-0 gap-2">
        <CandidateSelect candidates={candidates} />
        <Button type="submit" variant="secondary" disabled={pending}>
          {pending ? "…" : "Dodijeli"}
        </Button>
      </div>
      <p className="text-[12px] text-fg-faint">
        {free.length} slobodnih
        {busy.length > 0 && `, ${busy.length} sudi isti dan`}
        {away.length > 0 && (
          <span title={away.map((c) => `${c.name}: ${c.absence}`).join("\n")}>
            , {away.length} {away.length === 1 ? "najavio" : "najavilo"} odsustvo (nisu na listi)
          </span>
        )}
      </p>
      {state.error && (
        <p role="alert" className="text-[13px] text-crest">
          {state.error}
        </p>
      )}
    </form>
  );
}

/** Slobodni prvi, sortirani po opterećenju u mjesecu */
function groupCandidates(candidates: Candidate[]) {
  const byLoad = (a: Candidate, b: Candidate) => a.monthLoad - b.monthLoad || a.name.localeCompare(b.name, "bs");
  return {
    free: candidates.filter((c) => c.absence === null && c.sameDay.length === 0).sort(byLoad),
    busy: candidates.filter((c) => c.absence === null && c.sameDay.length > 0).sort(byLoad),
    away: candidates.filter((c) => c.absence !== null).sort(byLoad),
  };
}

/** Desno uz ime: opterećenje u mjesecu i druga utakmica istog dana */
function candidateHint(c: Candidate) {
  let text = `${c.monthLoad} u mjesecu`;
  if (c.sameDay.length) text += `, sudi u ${c.sameDay.map(formatTime).join(" i ")}`;
  return text;
}

export function CandidateSelect({ candidates }: { candidates: Candidate[] }) {
  // Odsutni (away) se ne nude: server ih ionako odbija
  const { free, busy } = groupCandidates(candidates);
  const group = (title: string, list: Candidate[]) =>
    list.length > 0 && (
      <optgroup label={title}>
        {list.map((c) => (
          <option key={c.id} value={c.id} data-hint={candidateHint(c)}>
            {c.name}
          </option>
        ))}
      </optgroup>
    );
  return (
    <SelectInput name="profile_id" defaultValue="" required aria-label="Izaberi osobu" searchable className="flex-1">
      <option value="" disabled>
        Izaberi osobu
      </option>
      {group("Slobodni", free)}
      {group("Imaju utakmicu istog dana", busy)}
    </SelectInput>
  );
}

"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Check, Link2 } from "lucide-react";
import { SelectInput } from "@/components/select";
import { Button, cx, inputClass } from "@/components/ui";
import { formatDayMonth, formatTime, matchNo } from "@/lib/format";
import { saveFibaLink, type FibaLinkState } from "./actions";

type Candidate = {
  id: string;
  number: number;
  starts_at: string;
  competition: { short_name: string | null; name: string } | null;
  home: { name: string } | null;
  away: { name: string } | null;
};

function Saved({ state }: { state: FibaLinkState }) {
  if (state.error) return <p role="alert" className="text-[14px] text-crest">{state.error}</p>;
  if (state.saved) return <span className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-mint"><Check className="size-4" aria-hidden="true" /> Sačuvano</span>;
  return null;
}

/** FIBA utakmica → naša utakmica (admin, na stranici FIBA utakmice): utakmice ±3 dana od termina */
export function LinkMatch({ fibaGameId, candidates }: { fibaGameId: number; candidates: Candidate[] }) {
  const [state, action, pending] = useActionState<FibaLinkState, FormData>(saveFibaLink, {});
  return (
    <section className="rounded-lg border border-line bg-panel px-4 py-4 shadow-panel sm:px-6">
      <h2 className="flex items-center gap-2 text-[15px] font-semibold">
        <Link2 className="size-4 text-fg-muted" aria-hidden="true" /> Poveži s našom utakmicom
      </h2>
      {candidates.length === 0 ? (
        <p className="mt-1 text-[14px] text-fg-muted">Nema nepovezanih utakmica 3 dana prije ni poslije ovog termina.</p>
      ) : (
        <form action={action} className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start">
          <input type="hidden" name="link" value={fibaGameId} />
          <div className="sm:flex-1">
            <SelectInput name="match_id" required defaultValue="" aria-label="Naša utakmica">
              <option value="" disabled>
                Izaberi utakmicu
              </option>
              {candidates.map((m) => (
                <option key={m.id} value={m.id}>
                  {`${formatDayMonth(m.starts_at)} ${formatTime(m.starts_at)} · ${matchNo(m.number)}, ${m.competition?.short_name ?? m.competition?.name ?? ""}: ${m.home?.name ?? "?"} – ${m.away?.name ?? "?"}`}
                </option>
              ))}
            </SelectInput>
          </div>
          <input name="stream_key" placeholder="Pristupni kod (neobavezno)" aria-label="Pristupni kod (Stream Key)" className={cx(inputClass, "font-mono uppercase sm:w-72")} />
          <Button type="submit" disabled={pending}>
            {pending ? "Povezujem…" : "Poveži"}
          </Button>
        </form>
      )}
      <div className="mt-2">
        <Saved state={state} />
      </div>
    </section>
  );
}

/**
 * Naša utakmica → FIBA: link FIBA LiveStats utakmice i pristupni kod za zapisničara.
 * Admin na stranici utakmice mijenja oboje; sudije, pomoćne sudije i komesar (fillOnly) samo upisuju ono čega nema.
 */
export function FibaMatchForm({
  matchId,
  fibaGameId,
  streamKey,
  fillOnly = false,
}: {
  matchId: string;
  fibaGameId: number | null;
  streamKey: string | null;
  fillOnly?: boolean;
}) {
  const [state, action, pending] = useActionState<FibaLinkState, FormData>(saveFibaLink, {});
  const linkLocked = fillOnly && fibaGameId != null;
  const keyLocked = fillOnly && streamKey != null;
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="match_id" value={matchId} />
      <label className="flex flex-col gap-1.5">
        <span className="text-[13px] font-medium text-fg-muted">FIBA LiveStats utakmica (link ili broj)</span>
        <input name="link" defaultValue={fibaGameId ?? ""} readOnly={linkLocked} placeholder="https://fibalivestats…/u/BIH/2939998/" className={cx(inputClass, linkLocked && "bg-panel-2 text-fg-muted")} />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-[13px] font-medium text-fg-muted">Pristupni kod (Stream Key)</span>
        <input name="stream_key" defaultValue={streamKey ?? ""} readOnly={keyLocked} placeholder="npr. 1SYA3ZV64M476WEVRFW1" className={cx(inputClass, "font-mono uppercase", keyLocked && "bg-panel-2 text-fg-muted")} />
      </label>
      <Button type="submit" variant="secondary" disabled={pending} className="w-full">
        {pending ? "Čuvam…" : "Sačuvaj FIBA"}
      </Button>
      {(fibaGameId || state.error || state.saved) && (
        <div className="flex flex-wrap items-center gap-3">
          {fibaGameId && (
            <Link href={`/fiba/${fibaGameId}`} className="text-[14px] font-semibold text-fg-muted hover:text-fg">
              Statistika uživo
            </Link>
          )}
          <Saved state={state} />
        </div>
      )}
    </form>
  );
}

"use client";

import { useActionState, useEffect, useRef } from "react";
import { Check, X } from "lucide-react";
import { Button, buttonClass } from "@/components/ui";
import type { Candidate } from "@/lib/data/admin";
import { replace, type ReplaceState } from "./actions";
import { CandidateSelect } from "./assign-form";

/** "Zamijeni": prozor za izbor nove osobe. Ako je nominacija već poslana, nova osoba dobija email. */
export function ReplaceButton({
  assignmentId,
  current,
  position,
  notified,
  candidates,
}: {
  assignmentId: string;
  current: string;
  position: string;
  notified: boolean;
  candidates: Candidate[];
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [state, action, pending] = useActionState<ReplaceState, FormData>(replace, {});

  // Nakon uspješne zamjene prozor se zatvara, a poruka ostaje u redu
  useEffect(() => {
    if (state.done) dialog.current?.close();
  }, [state]);

  return (
    <>
      <button type="button" onClick={() => dialog.current?.showModal()} className={buttonClass("secondary", "h-10 text-[14px]")}>
        Zamijeni
      </button>
      {state.done && (
        <p role="status" className="basis-full text-[13px] text-fg-muted sm:order-last">
          <Check className="mr-1 inline size-4 text-mint" />
          {state.done}
        </p>
      )}

      <dialog
        ref={dialog}
        onClick={(e) => e.target === dialog.current && dialog.current?.close()}
        className="m-auto w-[min(480px,calc(100vw-32px))] rounded-lg border border-line bg-panel p-0 text-fg shadow-pop backdrop:bg-black/50"
      >
        <form action={action} className="flex flex-col gap-4 p-5 sm:p-6">
          <input type="hidden" name="assignment_id" value={assignmentId} />
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="font-display text-[20px] font-semibold leading-tight">Zamijeni osobu</h2>
              <p className="mt-1 text-[14px] text-fg-muted">
                {position}: umjesto <span className="font-semibold text-fg">{current}</span>
              </p>
            </div>
            <button type="button" onClick={() => dialog.current?.close()} aria-label="Zatvori" className="-m-2 p-2 text-fg-faint hover:text-fg">
              <X className="size-5" />
            </button>
          </div>

          {candidates.length > 0 ? (
            <CandidateSelect candidates={candidates} />
          ) : (
            <p className="text-[14px] text-fg-faint">Nema slobodnih osoba za ovu poziciju.</p>
          )}

          <p className="text-[13px] text-fg-muted">
            {notified
              ? `${current} dobija email da je nominacija otkazana. Nova osoba odmah vidi nominaciju i dobija je emailom, sa svojim imenom označenim crveno.`
              : "Utakmica još nije aktivirana, pa se ne šalje email."}
          </p>

          {state.error && (
            <p role="alert" className="text-[13px] text-crest">
              {state.error}
            </p>
          )}

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" onClick={() => dialog.current?.close()}>
              Odustani
            </Button>
            <Button type="submit" disabled={pending || candidates.length === 0}>
              {pending ? "Mijenjam…" : notified ? "Zamijeni i pošalji email" : "Zamijeni"}
            </Button>
          </div>
        </form>
      </dialog>
    </>
  );
}

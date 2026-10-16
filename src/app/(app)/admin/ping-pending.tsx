"use client";

import { useRef, useState, useTransition } from "react";
import { BellRing, Send, X } from "lucide-react";
import { Button, buttonClass, cx } from "@/components/ui";
import { ping, type PingState } from "./actions";

export type PingItem = { assignmentId: string; name: string; position: string; match: string; when: string };

/**
 * "Pingaj": prozor s osobama koje nisu odgovorile na poslanu nominaciju (sve označene).
 * Izabranima ide mail s njihovom nominacijom i porukom da je prihvate što prije, inače slijedi zamjena.
 */
export function PingPending({ items }: { items: PingItem[] }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [pending, start] = useTransition();
  const [result, setResult] = useState<PingState | null>(null);
  if (items.length === 0) return null;
  const people = new Set(items.map((i) => i.name)).size;
  const done = result && !result.error;

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setResult(null);
          dialog.current?.showModal();
        }}
        className={buttonClass("secondary", "h-8! gap-1.5 px-2.5! text-[12px]! sm:h-8!")}
      >
        <BellRing className="size-3.5" aria-hidden="true" />
        Pingaj ({people})
      </button>

      <dialog
        ref={dialog}
        onClick={(e) => e.target === dialog.current && dialog.current?.close()}
        className="m-auto w-[min(520px,calc(100vw-32px))] rounded-lg border border-line bg-panel p-0 text-fg shadow-pop backdrop:bg-overlay backdrop:backdrop-blur-[2px]"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const ids = new FormData(e.currentTarget).getAll("id").map(String);
            start(async () => setResult(await ping(ids)));
          }}
          className="flex flex-col gap-4 p-5 sm:p-6"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="font-display text-[20px] font-semibold leading-tight">Pingaj neodgovorene</h2>
              <p className="mt-1 text-[14px] text-fg-muted">
                Svako označen dobija mail sa svojom nominacijom i porukom da je prihvati što prije, inače slijedi zamjena na utakmici.
              </p>
            </div>
            <button type="button" onClick={() => dialog.current?.close()} aria-label="Zatvori" className="-m-2.5 rounded-md p-2.5 text-fg-faint transition-colors hover:bg-panel-2 hover:text-fg">
              <X className="size-5" />
            </button>
          </div>

          <ul className="max-h-[50vh] divide-y divide-line overflow-y-auto rounded-lg border border-line">
            {items.map((i) => (
              <li key={i.assignmentId}>
                <label className="flex cursor-pointer items-start gap-3 px-4 py-3">
                  <input type="checkbox" name="id" value={i.assignmentId} defaultChecked disabled={Boolean(done)} className="mt-1 size-4 shrink-0 accent-fg" />
                  <span className="min-w-0">
                    <span className="block text-[15px] font-semibold">{i.name}</span>
                    <span className="block text-[13px] text-fg-muted">
                      {i.position} · {i.match} · {i.when}
                    </span>
                  </span>
                </label>
              </li>
            ))}
          </ul>

          {result && (
            <p role="status" className={cx("text-[13px]", result.error ? "text-crest" : "text-fg-muted")}>
              {result.error ?? `Poslan podsjetnik: ${result.sent} od ${result.people} ${result.people === 1 ? "osobe" : "osoba"}.`}
            </p>
          )}

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" onClick={() => dialog.current?.close()}>
              {done ? "Zatvori" : "Odustani"}
            </Button>
            {!done && (
              <Button type="submit" disabled={pending}>
                <Send className="size-4" />
                {pending ? "Šaljem…" : "Pošalji podsjetnik"}
              </Button>
            )}
          </div>
        </form>
      </dialog>
    </>
  );
}

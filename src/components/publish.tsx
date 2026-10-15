"use client";

import { createContext, useContext, useState, useTransition } from "react";
import { Check, Send } from "lucide-react";
import { confirm } from "@/components/confirm";
import { Button, cx } from "@/components/ui";
import { publish, type PublishState } from "@/app/(app)/admin/utakmice/actions";

/** Poruka nakon objave: šta je vidljivo i šta je otišlo emailom */
function resultText(r: NonNullable<PublishState["result"]>) {
  const docs = r.documents.map((d) => (d.kind === "youth" ? "nominacija" : "nominacija – pomoćne sudije")).join(" i ");
  const mail = r.emailed
    ? `Poslana ${docs} na ${r.recipients} adresa.`
    : "Email nije poslan (nije podešen ili je uključen test način za druge adrese); nominacije se vide u aplikaciji.";
  return `Aktivirano utakmica: ${r.matches}. ${mail}`;
}

const CONFIRM = (n: number) => ({
  title: `Aktivirati ${n === 1 ? "utakmicu" : `${n} utakmica`}?`,
  message: "Delegirani će vidjeti nominaciju, a svim sudijama i pomoćnim sudijama ide nominacija emailom.",
  confirmLabel: "Aktiviraj",
});

// ───────── Lista utakmica: označavanje i traka s akcijom ─────────

type Selection = { selected: Set<string>; toggle: (id: string) => void; setMany: (ids: string[], on: boolean) => void };
const SelectionContext = createContext<Selection | null>(null);

export function PublishSelection({ children }: { children: React.ReactNode }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const setMany = (ids: string[], on: boolean) =>
    setSelected((s) => {
      const n = new Set(s);
      for (const id of ids) {
        if (on) n.add(id);
        else n.delete(id);
      }
      return n;
    });
  return (
    <SelectionContext.Provider value={{ selected, toggle, setMany }}>
      {children}
      <PublishBar />
    </SelectionContext.Provider>
  );
}

/** Kvačica uz utakmicu */
export function SelectMatch({ id, label }: { id: string; label: string }) {
  const ctx = useContext(SelectionContext)!;
  return (
    <label className="flex size-11 shrink-0 cursor-pointer items-center justify-center" title="Označi za aktiviranje">
      <input
        type="checkbox"
        checked={ctx.selected.has(id)}
        onChange={() => ctx.toggle(id)}
        aria-label={`Označi: ${label}`}
        className="size-[18px] accent-[var(--brand)]"
      />
    </label>
  );
}

/** "Označi sve neobjavljene" (npr. cijelo kolo/dan) */
export function SelectAll({ ids, label = "Označi neobjavljene" }: { ids: string[]; label?: string }) {
  const ctx = useContext(SelectionContext)!;
  if (ids.length === 0) return null;
  const all = ids.every((id) => ctx.selected.has(id));
  return (
    <button type="button" onClick={() => ctx.setMany(ids, !all)} className="text-[13px] font-semibold text-fg-muted underline-offset-4 hover:text-fg hover:underline">
      {all ? "Poništi oznake" : `${label} (${ids.length})`}
    </button>
  );
}

function PublishBar() {
  const ctx = useContext(SelectionContext)!;
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);
  const ids = [...ctx.selected];
  if (ids.length === 0 && !message) return null;

  return (
    <>
      {/* Prostor ispod liste da traka ne prekrije zadnje utakmice */}
      <div aria-hidden className="h-20 md:h-6 print:hidden" />
      <div className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+68px)] z-40 px-4 md:bottom-6 print:hidden">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-3 rounded-lg border border-line bg-panel px-4 py-3 shadow-pop">
          {ids.length > 0 ? (
            <>
              <span className="text-[14px] font-semibold">Označeno: {ids.length}</span>
              <button type="button" onClick={() => ctx.setMany(ids, false)} className="-my-2.5 h-10 text-[13px] font-medium text-fg-muted hover:text-fg">
                Poništi
              </button>
              <Button
                className="ml-auto"
                disabled={pending}
                onClick={async () => {
                  if (!(await confirm(CONFIRM(ids.length)))) return;
                  start(async () => {
                    const r = await publish(ids);
                    if (r.result) ctx.setMany(ids, false);
                    setMessage(r.error ? { text: r.error, error: true } : { text: resultText(r.result!) });
                  });
                }}
              >
                <Send className="size-4" />
                {pending ? "Aktiviram…" : "Aktiviraj i pošalji nominaciju"}
              </Button>
            </>
          ) : (
            <>
              <p className={cx("flex-1 text-[14px]", message?.error ? "text-crest" : "text-fg")}>
                {!message?.error && <Check className="mr-1.5 inline size-4 text-mint" />}
                {message?.text}
              </p>
              <button type="button" onClick={() => setMessage(null)} className="-my-2.5 h-10 text-[13px] font-medium text-fg-muted hover:text-fg">
                Zatvori
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}

// ───────── Detalj utakmice ─────────

/** Aktiviranje jedne utakmice (ili objava izmjena nakon što je već aktivirana) */
export function PublishMatch({ matchId, publishedAt, unpublished }: { matchId: string; publishedAt: string | null; unpublished: number }) {
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);
  const label = publishedAt ? `Objavi izmjene (${unpublished})` : "Aktiviraj i pošalji nominaciju";
  const canPublish = !publishedAt || unpublished > 0;

  return (
    <div className="flex flex-col gap-2">
      <p className="text-[13px] text-fg-muted">
        {publishedAt
          ? `Aktivirano ${new Date(publishedAt).toLocaleString("bs-BA", { timeZone: "Europe/Sarajevo", day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit" })}.`
          : "Nije aktivirano: delegirani još ne vide nominaciju."}
      </p>
      {canPublish && (
        <Button
          className="w-full"
          disabled={pending}
          onClick={async () => {
            if (!(await confirm(CONFIRM(1)))) return;
            start(async () => {
              const r = await publish([matchId]);
              setMessage(r.error ? { text: r.error, error: true } : { text: resultText(r.result!) });
            });
          }}
        >
          <Send className="size-4" />
          {pending ? "Aktiviram…" : label}
        </Button>
      )}
      {message && <p className={cx("text-[13px]", message.error ? "text-crest" : "text-fg-muted")}>{message.text}</p>}
    </div>
  );
}

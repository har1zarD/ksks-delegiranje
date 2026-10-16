"use client";

import { createContext, useContext, useRef, useState, useTransition } from "react";
import { Check, Send, TriangleAlert, X } from "lucide-react";
import { confirm } from "@/components/confirm";
import { DateTile } from "@/components/match-line";
import { Button, cx } from "@/components/ui";
import { publish, type PublishState } from "@/app/(app)/admin/utakmice/actions";
import type { PublishAudience } from "@/lib/publish";

/** Poruka nakon objave: šta je vidljivo i šta je otišlo emailom */
function resultText(r: NonNullable<PublishState["result"]>) {
  const mail = r.emailed
    ? r.audience === "crew"
      ? `Poslana nominacija samo delegiranima na utakmici (${r.recipients} ${r.recipients === 1 ? "adresa" : "adrese"}).`
      : `Poslana nominacija na ${r.recipients} adresa.`
    : "Email nije poslan (nije podešen ili je uključen test način za druge adrese); nominacije se vide u aplikaciji.";
  const clubs = r.clubs
    ? r.clubs.sent
      ? ` Klubovima poslan raspored (${r.clubs.matches} ${r.clubs.matches === 1 ? "utakmica" : "utakmice"}, ${r.clubs.recipients} adresa).`
      : " Raspored klubovima nije poslan (nijedan klub nema email)."
    : "";
  return `Aktivirano utakmica: ${r.matches}. ${mail}${clubs}`;
}

const CONFIRM = (n: number) => ({
  title: `Aktivirati ${n === 1 ? "utakmicu" : `${n} utakmica`}?`,
  message: "Delegirani će vidjeti nominaciju, svim sudijama i pomoćnim sudijama ide nominacija emailom, a klubovima raspored omladinske lige bez službenih lica.",
  confirmLabel: "Aktiviraj",
});

// ───────── Lista utakmica: označavanje i traka s akcijom ─────────

type Selection = { selected: Set<string>; toggle: (id: string) => void; setMany: (ids: string[], on: boolean) => void };
const SelectionContext = createContext<Selection | null>(null);

/** Utakmice kojima nedostaju službena lica: id → naziv i broj nedelegiranih pozicija */
export type Incomplete = Record<string, { label: string; missing: number }>;

export function PublishSelection({ children, incomplete = {} }: { children: React.ReactNode; incomplete?: Incomplete }) {
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
      <PublishBar incomplete={incomplete} />
    </SelectionContext.Provider>
  );
}

/** Datum utakmice kao dugme za označavanje: klik oboji list, kružić u uglu pokazuje da se može označiti */
export function SelectMatch({ id, iso, label }: { id: string; iso: string; label: string }) {
  const ctx = useContext(SelectionContext)!;
  const on = ctx.selected.has(id);
  return (
    <button
      type="button"
      onClick={() => ctx.toggle(id)}
      aria-pressed={on}
      aria-label={`Označi za aktiviranje: ${label}`}
      title={on ? "Poništi oznaku" : "Označi za aktiviranje"}
      className="group relative shrink-0 cursor-pointer rounded-lg outline-none transition-transform active:scale-95 focus-visible:ring-4 focus-visible:ring-fg/15"
    >
      <DateTile
        iso={iso}
        selected={on}
        className={cx(!on && "shadow-panel group-hover:border-line-hover")}
      />
      <span
        aria-hidden
        className={cx(
          "absolute -right-1.5 -top-1.5 grid size-[18px] place-items-center rounded-full border-2 border-panel transition-colors",
          on ? "bg-brand text-brand-ink" : "bg-line-strong text-transparent group-hover:bg-fg-muted group-hover:text-panel",
        )}
      >
        <Check className="size-2.5" strokeWidth={4} />
      </span>
    </button>
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

function PublishBar({ incomplete }: { incomplete: Incomplete }) {
  const ctx = useContext(SelectionContext)!;
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);
  const ids = [...ctx.selected];
  const warn = ids.filter((id) => incomplete[id]).map((id) => incomplete[id]);
  if (ids.length === 0 && !message) return null;

  return (
    <>
      {/* Prostor ispod liste da traka ne prekrije zadnje utakmice */}
      <div aria-hidden className="h-20 lg:h-6 print:hidden" />
      <div className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+68px)] z-40 px-4 lg:bottom-6 lg:left-64 print:hidden">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-3 rounded-lg border border-line bg-panel px-4 py-3 shadow-pop">
          {ids.length > 0 ? (
            <>
              {warn.length > 0 && <IncompleteNote matches={warn} />}
              <span className="text-[14px] font-semibold">Označeno: {ids.length}</span>
              <button type="button" onClick={() => ctx.setMany(ids, false)} className="-my-2.5 h-10 text-[13px] font-medium text-fg-muted hover:text-fg">
                Poništi
              </button>
              <div className="ml-auto flex flex-wrap items-center gap-2">
                <Button
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
                  {pending ? "Šaljem…" : "Aktiviraj i pošalji nominaciju"}
                </Button>
              </div>
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

/** Upozorenje u traci: označene utakmice na kojima nisu delegirana sva službena lica (aktiviranje je i dalje dozvoljeno) */
function IncompleteNote({ matches }: { matches: Incomplete[string][] }) {
  const shown = matches.slice(0, 3);
  return (
    <div role="status" className="flex w-full gap-2.5 rounded-md border border-orange/30 bg-orange/10 px-3 py-2.5 text-[13px]">
      <TriangleAlert className="mt-px size-4 shrink-0 text-orange" aria-hidden="true" />
      <div className="min-w-0">
        <p className="font-semibold text-fg">
          {matches.length === 1 ? "Nisu izdelegirana sva službena lica" : `Na ${matches.length} utakmice nisu izdelegirana sva službena lica`}
        </p>
        <ul className="mt-0.5 text-fg-muted">
          {shown.map((m, i) => (
            <li key={i} className="truncate">
              {m.label}: nedostaje {m.missing}
            </li>
          ))}
          {matches.length > shown.length && <li>i još {matches.length - shown.length}</li>}
        </ul>
        <p className="mt-1 text-fg-muted">Možeš aktivirati i ovako, ali nominacija ide samo delegiranima.</p>
      </div>
    </div>
  );
}

// ───────── Detalj utakmice ─────────

/**
 * Aktiviranje jedne utakmice, ili objava izmjena nakon što je već aktivirana: nova imena su u emailu crvena,
 * a admin bira ide li email svima sa liste ili samo delegiranima na utakmici (crew = koliko ih je).
 */
export function PublishMatch({ matchId, publishedAt, unpublished, crew }: { matchId: string; publishedAt: string | null; unpublished: number; crew: number }) {
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const label = publishedAt ? `Objavi izmjene (${unpublished})` : "Aktiviraj i pošalji nominaciju";
  const canPublish = !publishedAt || unpublished > 0;

  const run = (audience: PublishAudience) =>
    start(async () => {
      const r = await publish([matchId], audience);
      setMessage(r.error ? { text: r.error, error: true } : { text: resultText(r.result!) });
    });

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
            if (publishedAt) {
              dialog.current?.showModal();
              return;
            }
            if (!(await confirm(CONFIRM(1)))) return;
            run("all");
          }}
        >
          <Send className="size-4" />
          {pending ? (publishedAt ? "Objavljujem…" : "Aktiviram…") : label}
        </Button>
      )}
      {message && <p className={cx("text-[13px]", message.error ? "text-crest" : "text-fg-muted")}>{message.text}</p>}

      {publishedAt && (
        <dialog
          ref={dialog}
          onClick={(e) => e.target === dialog.current && dialog.current?.close()}
          className="m-auto w-[min(480px,calc(100vw-32px))] rounded-lg border border-line bg-panel p-0 text-fg shadow-pop backdrop:bg-overlay backdrop:backdrop-blur-[2px]"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const audience = new FormData(e.currentTarget).get("audience") === "all" ? "all" : "crew";
              dialog.current?.close();
              run(audience);
            }}
            className="flex flex-col gap-4 p-5 sm:p-6"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="font-display text-[20px] font-semibold leading-tight">Objavi izmjene</h2>
                <p className="mt-1 text-[14px] text-fg-muted">
                  {unpublished === 1 ? "1 novo delegiranje" : `${unpublished} nova delegiranja`}. Delegirani odmah vide nominaciju, a u emailu su nova imena crvena.
                </p>
              </div>
              <button type="button" onClick={() => dialog.current?.close()} aria-label="Zatvori" className="-m-2.5 rounded-md p-2.5 text-fg-faint transition-colors hover:bg-panel-2 hover:text-fg">
                <X className="size-5" />
              </button>
            </div>

            <fieldset className="flex flex-col divide-y divide-line rounded-lg border border-line">
              <legend className="sr-only">Kome ide nominacija emailom</legend>
              <label className="flex cursor-pointer items-start gap-3 px-4 py-3">
                <input type="radio" name="audience" value="crew" defaultChecked className="mt-1 size-4 shrink-0 accent-fg" />
                <span className="min-w-0">
                  <span className="block text-[15px] font-semibold">Samo delegiranima na ovoj utakmici</span>
                  <span className="block text-[13px] text-fg-muted">
                    {crew} {crew === 1 ? "osoba" : crew < 5 ? "osobe" : "osoba"}. Ostali sa liste ne dobijaju email.
                  </span>
                </span>
              </label>
              <label className="flex cursor-pointer items-start gap-3 px-4 py-3">
                <input type="radio" name="audience" value="all" className="mt-1 size-4 shrink-0 accent-fg" />
                <span className="min-w-0">
                  <span className="block text-[15px] font-semibold">Svima sa liste</span>
                  <span className="block text-[13px] text-fg-muted">Sudije, pomoćne sudije i komesari, kao pri aktiviranju.</span>
                </span>
              </label>
            </fieldset>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="secondary" onClick={() => dialog.current?.close()}>
                Odustani
              </Button>
              <Button type="submit" disabled={pending}>
                <Send className="size-4" />
                Objavi i pošalji
              </Button>
            </div>
          </form>
        </dialog>
      )}
    </div>
  );
}

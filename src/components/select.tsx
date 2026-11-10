"use client";

import {
  Children,
  Fragment,
  isValidElement,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentProps,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { flushSync } from "react-dom";
import { Check, ChevronDown, LoaderCircle, Plus, Search } from "lucide-react";
import { Popover } from "@/components/popover";
import { cx, inputClass, Label } from "@/components/ui";

/*
  Vlastiti izbor opcije umjesto nativnog <select> (koji na desktopu otvara sivu sistemsku listu).
  Piše se isto kao <select>: <option> i <optgroup> kao djeca, name/value/defaultValue/onChange/required.
  Ispod je pravi (skriveni) <select>: on nosi vrijednost u formu, provjeru required i onChange događaj.
  Uz opciju: data-icon (npr. logo kluba) i data-hint (sitni tekst desno, npr. "3 u mjesecu").
*/

type Option = { value: string; label: string; disabled: boolean; icon?: ReactNode; hint?: ReactNode; group?: string };

/** Rezultat kreiranja nove opcije (npr. dvorane) iz pretrage; { error } ostaje u listi da korisnik pokuša ponovo */
type CreateResult = { value: string; label: string } | { error: string };

/** Lista se može pretraživati kad ima više opcija od ovoga */
export const SEARCH_FROM = 8;

/** Izbor s naslovom i opisom ispod, kao Field */
export function Select({
  label,
  hint,
  className,
  ...props
}: ComponentProps<"select"> & { label: string; hint?: string; searchable?: boolean; onCreate?: (query: string) => Promise<CreateResult> }) {
  return (
    <Label label={label} hint={hint} className={className}>
      <SelectInput {...props} aria-label={props["aria-label"] ?? label} />
    </Label>
  );
}

/** Izbor bez naslova (u redu tabele, uz dugme) */
export function SelectInput({
  children,
  value,
  defaultValue,
  onChange,
  className,
  searchable,
  onCreate,
  ...props
}: ComponentProps<"select"> & { searchable?: boolean; onCreate?: (query: string) => Promise<CreateResult> }) {
  const parsed = parseOptions(children);
  // Opcije napravljene u ovoj sesiji (npr. nova dvorana) dok se lista s servera ne osvježi
  const [created, setCreated] = useState<Option[]>([]);
  const options = created.length ? [...parsed, ...created.filter((c) => !parsed.some((p) => p.value === c.value))] : parsed;
  const controlled = value !== undefined;
  const [inner, setInner] = useState(() => String(defaultValue ?? options.find((o) => !o.disabled)?.value ?? ""));
  const current = controlled ? String(value) : inner;
  const selected = options.find((o) => o.value === current);
  // Opcija "" koja se ne može izabrati je samo natpis ("Izaberi ekipu"), ne stavka liste
  const placeholder = options.find((o) => o.value === "" && o.disabled)?.label ?? "Izaberi";
  const choices = options.filter((o) => !(o.value === "" && o.disabled));

  const [open, setOpen] = useState(false);
  const anchor = useRef<HTMLSpanElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const native = useRef<HTMLSelectElement>(null);
  const id = useId();
  const label = String(props["aria-label"] ?? "Izaberi");

  const close = (refocus = true) => {
    setOpen(false);
    if (refocus) trigger.current?.focus();
  };

  // Izbor ide kroz pravi <select> i njegov change događaj, pa onChange dobija isti događaj kao kod nativnog
  const pick = (v: string) => {
    const el = native.current;
    if (el) {
      Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")!.set!.call(el, v);
      el.dispatchEvent(new Event("change", { bubbles: true }));
    }
    close();
  };

  // Upisani naziv ne postoji u listi: napravi ga (npr. dvoranu), pa izaberi. Sinhrono (flushSync) da <option>
  // postoji u pravom <select> prije nego pick postavi vrijednost (inače browser ne prepozna nepostojeću vrijednost).
  const handleCreate = onCreate
    ? async (query: string): Promise<{ error: string } | undefined> => {
        const result = await onCreate(query);
        if ("error" in result) return result;
        flushSync(() => setCreated((c) => [...c, { value: result.value, label: result.label, disabled: false }]));
        pick(result.value);
        return undefined;
      }
    : undefined;

  return (
    <span ref={anchor} className={cx("relative block min-w-0", className)}>
      <button
        ref={trigger}
        type="button"
        disabled={props.disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        aria-label={`${label}: ${selected && selected.value !== "" ? selected.label : placeholder}`}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            setOpen(true);
          }
        }}
        className={cx(inputClass, "flex items-center gap-2.5 pr-9 text-left", open && "border-fg-muted ring-4 ring-fg/8")}
      >
        {selected?.icon && <span className="flex shrink-0 items-center">{selected.icon}</span>}
        <span className={cx("min-w-0 flex-1 truncate", (!selected || selected.value === "") && "text-faint")}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown
          aria-hidden
          className={cx("pointer-events-none absolute right-3 size-4 text-fg-muted transition-transform", open && "rotate-180")}
        />
      </button>
      {/* Nosi vrijednost u formu i provjeru required; nije display:none da bi browser pokazao poruku kod polja */}
      <select
        ref={native}
        tabIndex={-1}
        aria-hidden
        value={current}
        onChange={(e) => {
          if (!controlled) setInner(e.target.value);
          onChange?.(e);
        }}
        {...props}
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px w-full opacity-0"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} disabled={o.disabled}>
            {o.label}
          </option>
        ))}
      </select>
      {open && (
        <Popover id={id} anchor={anchor} label={label} onClose={close} className="p-1">
          <OptionList
            options={choices}
            current={current}
            searchable={searchable ?? choices.length > SEARCH_FROM}
            label={label}
            onPick={pick}
            onCreate={handleCreate}
          />
        </Popover>
      )}
    </span>
  );
}

/** Lista opcija u plutajućem prozoru (pretraga, strelice, kvačica uz izabranu); koristi je i filter (FilterSelect) */
export function OptionList({
  options,
  current,
  searchable,
  label,
  onPick,
  onCreate,
}: {
  options: Option[];
  current: string;
  searchable: boolean;
  label: string;
  onPick: (value: string) => void;
  onCreate?: (query: string) => Promise<{ error: string } | undefined>;
}) {
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string>();
  const list = useRef<HTMLDivElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const q = fold(query.trim());
  const shown = q ? options.filter((o) => fold(o.label).includes(q)) : options;
  // Nema pogotka: ponuđeno je napraviti novu opciju s upisanim nazivom
  const offerCreate = Boolean(onCreate) && query.trim() !== "" && shown.length === 0;

  const doCreate = async () => {
    if (!onCreate || creating) return;
    setCreating(true);
    setCreateError(undefined);
    const result = await onCreate(query.trim());
    // Uspjeh zatvara prozor (onPick unutar onCreate), pa ovaj komponent nestaje — ne diraj state poslije toga
    if (result) {
      setCreating(false);
      setCreateError(result.error);
    }
  };

  // Izabrana opcija na sredinu liste; fokus na pretragu (samo s mišem: na telefonu bi odmah iskočila tastatura) ili izabranu opciju
  useLayoutEffect(() => {
    const el = list.current?.querySelector<HTMLElement>('[aria-selected="true"]');
    if (el && list.current) list.current.scrollTop = el.offsetTop - list.current.clientHeight / 2 + el.offsetHeight / 2;
    if (search.current && window.matchMedia("(pointer: fine)").matches) search.current.focus();
    else (el ?? list.current?.querySelector<HTMLElement>("button:not(:disabled)"))?.focus({ preventScroll: true });
  }, []);

  const buttons = () => Array.from(list.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)") ?? []);

  const onKey = (e: KeyboardEvent) => {
    const all = buttons();
    const i = all.indexOf(document.activeElement as HTMLButtonElement);
    const to: Record<string, number> = { ArrowDown: i + 1, ArrowUp: i - 1, Home: 0, End: all.length - 1 };
    if (!(e.key in to) || (e.target === search.current && (e.key === "Home" || e.key === "End"))) return;
    e.preventDefault();
    const next = to[e.key];
    if (next < 0) search.current?.focus();
    else all[Math.min(next, all.length - 1)]?.focus();
  };

  let lastGroup: string | undefined;

  return (
    <div onKeyDown={onKey}>
      {searchable && (
        <div className="mb-1 border-b border-line p-1 pb-2">
          <span className="relative block">
          <Search aria-hidden className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-fg-muted" />
          <input
            ref={search}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                const first = shown.find((o) => !o.disabled);
                if (first) onPick(first.value);
                else if (offerCreate) void doCreate();
              }
            }}
            placeholder="Pretraži…"
            aria-label={`Pretraži: ${label}`}
            className="h-10 w-full rounded-md bg-panel-2 pl-9 pr-3 text-[16px] outline-none placeholder:text-faint focus:ring-2 focus:ring-fg/10 sm:h-9 sm:text-[14px]"
          />
          </span>
        </div>
      )}
      <div ref={list} role="listbox" aria-label={label} className="relative max-h-72 overflow-y-auto overscroll-contain p-0.5">
        {shown.length === 0 && !offerCreate && <p className="px-3 py-6 text-center text-[14px] text-fg-muted">Nema rezultata.</p>}
        {offerCreate && (
          <div className="p-0.5">
            <button
              type="button"
              onClick={() => void doCreate()}
              disabled={creating}
              className={cx(
                "flex min-h-11 w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-[15px] font-medium transition-colors sm:min-h-9 sm:text-[14px]",
                "hover:bg-panel-2 focus-visible:bg-panel-2 focus-visible:outline-none disabled:opacity-60",
              )}
            >
              {creating ? (
                <LoaderCircle aria-hidden className="size-4 shrink-0 animate-spin text-fg-muted" />
              ) : (
                <Plus aria-hidden className="size-4 shrink-0 text-fg-muted" />
              )}
              <span className="min-w-0 flex-1 truncate">{creating ? "Dodajem…" : `Dodaj „${query.trim()}“`}</span>
            </button>
            {createError && (
              <p role="alert" className="px-2.5 pt-1 text-[13px] text-crest">
                {createError}
              </p>
            )}
          </div>
        )}
        {shown.map((o) => {
          const header = o.group !== lastGroup && o.group;
          lastGroup = o.group;
          const selected = o.value === current;
          return (
            <Fragment key={o.value}>
              {header && (
                <div className="px-2.5 pb-1 pt-2.5 text-[11px] font-semibold uppercase tracking-wide text-faint first:pt-1.5">{header}</div>
              )}
              <button
                type="button"
                role="option"
                aria-selected={selected}
                disabled={o.disabled}
                onClick={() => onPick(o.value)}
                className={cx(
                  "flex min-h-11 w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-[15px] transition-colors sm:min-h-9 sm:text-[14px]",
                  "hover:bg-panel-2 focus-visible:bg-panel-2 focus-visible:outline-none disabled:opacity-40",
                  selected && "font-semibold",
                )}
              >
                {o.icon && <span className="flex shrink-0 items-center">{o.icon}</span>}
                <span className="min-w-0 flex-1 truncate">{o.label}</span>
                {o.hint && <span className="shrink-0 text-[12px] font-normal text-faint">{o.hint}</span>}
                <Check aria-hidden className={cx("size-4 shrink-0", selected ? "text-fg" : "invisible")} />
              </button>
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}

/** Pretraga bez obzira na velika slova i kvačice (Đ, Č, Ć, Š, Ž) */
function fold(s: string) {
  return s.toLowerCase().replace(/đ/g, "d").normalize("NFD").replace(/\p{M}/gu, "");
}

function textOf(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  return "";
}

/** <option> i <optgroup> (i fragmenti, liste) iz djece u ravnu listu opcija */
function parseOptions(children: ReactNode, group?: string, groupDisabled = false): Option[] {
  const out: Option[] = [];
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    const p = child.props as Record<string, unknown> & { children?: ReactNode };
    if (child.type === Fragment) out.push(...parseOptions(p.children, group, groupDisabled));
    else if (child.type === "optgroup") out.push(...parseOptions(p.children, String(p.label ?? ""), Boolean(p.disabled)));
    else if (child.type === "option") {
      const label = textOf(p.children);
      out.push({
        value: String(p.value ?? label),
        label,
        disabled: groupDisabled || Boolean(p.disabled),
        icon: p["data-icon"] as ReactNode,
        hint: p["data-hint"] as ReactNode,
        group,
      });
    }
  });
  return out;
}

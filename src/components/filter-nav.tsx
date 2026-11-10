"use client";

import { createContext, useContext, useId, useOptimistic, useRef, useState, useTransition, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { Popover } from "@/components/popover";
import { OptionList, SEARCH_FROM } from "@/components/select";
import { cx } from "@/components/ui";

// Filteri u URL-u (?prikaz=…&takmicenje=…&strana=…): klik odmah označi novi izbor i pokaže skelet liste,
// a server za to vrijeme sprema novu stranicu (navigacija u tranziciji).

type FilterNav = { pending: URLSearchParams | null; go: (href: string, top?: boolean, mark?: () => void) => void };
const FilterNavContext = createContext<FilterNav | null>(null);

export function FilterNavProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [pending, setPending] = useOptimistic<string | null>(null);
  const go = (href: string, top?: boolean, mark?: () => void) => {
    if (top) window.scrollTo({ top: 0, behavior: "smooth" });
    startTransition(() => {
      mark?.();
      setPending(href);
      router.push(href, { scroll: false });
    });
  };
  const params = pending ? new URL(pending, "http://x").searchParams : null;
  return <FilterNavContext.Provider value={{ pending: params, go }}>{children}</FilterNavContext.Provider>;
}

/** Je li izbor aktivan: dok se nova stranica učitava, važi kliknuti izbor (isti parametar u URL-u) */
function useActive(param: string, value: string | undefined, active: boolean) {
  const nav = useContext(FilterNavContext)!;
  return nav.pending ? (nav.pending.get(param) ?? undefined) === value : active;
}

function useGo(href: string, top?: boolean, mark?: () => void) {
  const nav = useContext(FilterNavContext)!;
  return (e: React.MouseEvent<HTMLAnchorElement>) => {
    // Novi tab / prozor ostaje običan link
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    nav.go(href, top, mark);
  };
}

/** Grupa segmenata (kao Segments): kliknuti izbor u grupi je odmah aktivan, ostali u grupi se gase */
type Group = { clicked: string | null; mark: (href: string) => void };
const GroupContext = createContext<Group | null>(null);

export function FilterSegments({ children, className }: { children: ReactNode; className?: string }) {
  const [clicked, setClicked] = useOptimistic<string | null>(null);
  return (
    <GroupContext.Provider value={{ clicked, mark: setClicked }}>
      <div className={cx("-mx-4 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0", className)}>
        <div className="inline-flex gap-0.5 rounded-lg bg-track p-[3px]">{children}</div>
      </div>
    </GroupContext.Provider>
  );
}

/**
 * Kao Segment, ali odmah aktivan na klik. U FilterSegments grupa sama zna šta je kliknuto;
 * inače `param`/`value` = šta ovaj izbor postavlja u URL-u.
 */
export function FilterSegment({ href, param, value, active, children }: { href: string; param?: string; value?: string; active: boolean; children: ReactNode }) {
  const group = useContext(GroupContext);
  const byParam = useActive(param ?? "", value, active);
  const on = group?.clicked ? group.clicked === href : param ? byParam : active;
  const go = useGo(href, false, group ? () => group.mark(href) : undefined);
  return (
    <Link
      href={href}
      onClick={go}
      aria-current={on ? "page" : undefined}
      className={cx(
        "whitespace-nowrap rounded-md px-3.5 py-2.5 text-[14px] font-semibold transition-colors sm:py-1.5",
        on ? "bg-panel-3 text-fg shadow-segment" : "text-fg-muted hover:bg-panel-3/60 hover:text-fg",
      )}
    >
      {children}
    </Link>
  );
}

/** Mali izbor u redu filtera (visina i slova kao dugmad za termin i dvoranu u listi); uključen je obojen */
const CHIP = "inline-flex h-9 min-w-0 max-w-full items-center gap-1.5 whitespace-nowrap rounded-md border px-2.5 text-[13px] font-semibold transition-colors sm:h-8 [&>svg]:size-3.5 [&>svg]:shrink-0";
const CHIP_OFF = "border-line bg-panel text-fg-muted hover:border-line-hover hover:bg-panel-2 hover:text-fg";
const CHIP_ON = "border-fg bg-fg text-bg";

/** Prekidač filtera: klik uključi izbor, ponovni klik ga isključi (`href` je stanje nakon klika) */
export function FilterChip({ href, param, value, active, children }: { href: string; param: string; value: string; active: boolean; children: ReactNode }) {
  const on = useActive(param, value, active);
  const go = useGo(href);
  return (
    <Link href={href} onClick={go} aria-current={on ? "true" : undefined} className={cx(CHIP, on ? CHIP_ON : CHIP_OFF)}>
      {children}
    </Link>
  );
}

/**
 * Izbor iz liste (npr. dvorana) kao filter u URL-u: malo dugme koje otvara listu, svaka opcija nosi svoj href.
 * Opcija "" je "bez filtera": tada dugme nosi samo naziv filtera (`label`). `hint` je sitni tekst desno (broj utakmica).
 */
export function FilterSelect({
  param,
  value,
  label,
  icon,
  options,
}: {
  param: string;
  value: string;
  label: string;
  icon?: ReactNode;
  options: { value: string; label: string; hint?: string; href: string }[];
}) {
  const nav = useContext(FilterNavContext)!;
  const [open, setOpen] = useState(false);
  const anchor = useRef<HTMLSpanElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const id = useId();
  // Dok se nova stranica učitava, važi kliknuti izbor
  const current = nav.pending ? (nav.pending.get(param) ?? "") : value;
  const selected = current ? options.find((o) => o.value === current) : undefined;

  const close = (refocus = true) => {
    setOpen(false);
    if (refocus) trigger.current?.focus();
  };

  return (
    <span ref={anchor} className="inline-flex min-w-0">
      <button
        ref={trigger}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        aria-label={selected ? `${label}: ${selected.label}` : label}
        onClick={() => setOpen((o) => !o)}
        className={cx(CHIP, selected ? CHIP_ON : CHIP_OFF, open && "ring-4 ring-fg/8")}
      >
        {icon}
        <span className="truncate">{selected?.label ?? label}</span>
        <ChevronDown aria-hidden className={cx("transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <Popover id={id} anchor={anchor} label={label} width={280} onClose={close} className="p-1">
          <OptionList
            options={options.map((o) => ({ value: o.value, label: o.label, hint: o.hint, disabled: false }))}
            current={current}
            searchable={options.length > SEARCH_FROM}
            label={label}
            onPick={(v) => {
              close();
              const picked = options.find((o) => o.value === v);
              if (picked && v !== current) nav.go(picked.href);
            }}
          />
        </Popover>
      )}
    </span>
  );
}

/** Link koji mijenja filter bez oznake izbora (npr. strelice ‹ mjesec ›): odmah skelet sadržaja */
export function FilterLink({ href, className, children, ...rest }: { href: string; className?: string; children: ReactNode; "aria-label"?: string }) {
  const go = useGo(href);
  return (
    <Link href={href} onClick={go} className={className} {...rest}>
      {children}
    </Link>
  );
}

/** GET forma filtera (pretraga): slanje ide kroz istu navigaciju sa skeletom, prazna polja se ne upisuju u URL */
export function FilterForm({ action, className, children, role }: { action: string; className?: string; children: ReactNode; role?: string }) {
  const nav = useContext(FilterNavContext)!;
  return (
    <form
      action={action}
      role={role}
      className={className}
      onSubmit={(e) => {
        e.preventDefault();
        const q = new URLSearchParams();
        for (const [k, v] of new FormData(e.currentTarget)) if (typeof v === "string" && v.trim()) q.set(k, v.trim());
        const s = q.toString();
        nav.go(`${action}${s ? `?${s}` : ""}`);
      }}
    >
      {children}
    </form>
  );
}

/** Sadržaj ispod filtera: dok se nova stranica učitava, umjesto njega skelet */
export function FilterContent({ fallback, children }: { fallback: ReactNode; children: ReactNode }) {
  const nav = useContext(FilterNavContext)!;
  return nav.pending ? fallback : children;
}

/** Stranica liste (paginacija): broj i raspon datuma; klik vraća na vrh liste */
export function PageLink({ href, page, active, children }: { href: string; page: number; active: boolean; children: ReactNode }) {
  const on = useActive("strana", page === 1 ? undefined : String(page), active);
  const go = useGo(href, true);
  return (
    <Link
      href={href}
      onClick={go}
      aria-current={on ? "page" : undefined}
      className={cx(
        "flex min-w-[64px] flex-col items-center justify-center rounded-md px-4 py-2 text-center transition-colors",
        on ? "bg-panel-3 text-fg shadow-segment" : "text-fg-muted hover:bg-panel-3/60 hover:text-fg",
      )}
    >
      {children}
    </Link>
  );
}

/** Prethodna / sljedeća stranica */
export function PageStep({ href, children, label }: { href: string | null; children: ReactNode; label: string }) {
  const go = useGo(href ?? "", true);
  const cls = "grid size-12 shrink-0 place-items-center rounded-lg border border-line-strong bg-panel text-fg shadow-panel transition-colors";
  if (!href) {
    return (
      <span aria-hidden className={cx(cls, "opacity-40")}>
        {children}
      </span>
    );
  }
  return (
    <Link href={href} onClick={go} aria-label={label} title={label} className={cx(cls, "hover:border-line-hover hover:bg-panel-2")}>
      {children}
    </Link>
  );
}

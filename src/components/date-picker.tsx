"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode, type RefObject } from "react";
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { addDays, formatDate, MONTHS, MONTHS_SHORT, todayISO, WEEKDAYS } from "@/lib/format";
import { Popover } from "@/components/popover";
import { cx, inputClass, Label } from "@/components/ui";

/*
  Vlastiti izbor datuma i vremena umjesto nativnog (koji izgleda drugačije u svakom browseru).
  Vrijednost ide u formu kroz skriveno polje istog imena i formata kao nativno: "YYYY-MM-DD" i "HH:MM".
*/

type FieldProps = {
  label: string;
  name: string;
  hint?: string;
  className?: string;
  required?: boolean;
  disabled?: boolean;
  defaultValue?: string;
  placeholder?: string;
  /** Javlja izabranu vrijednost (polje ostaje nekontrolisano) */
  onChange?: (value: string) => void;
};

export function DateField({ min, max, defaultValue, placeholder = "Izaberi", onChange, ...props }: FieldProps & { min?: string; max?: string }) {
  const [value, setDate] = useState(defaultValue ?? "");
  const setValue = (v: string) => {
    setDate(v);
    onChange?.(v);
  };
  return (
    <Picker
      {...props}
      value={value}
      placeholder={placeholder}
      icon={<CalendarDays />}
      display={
        <>
          <span className="hidden sm:inline">{WEEKDAYS[weekday(value)]}, </span>
          {value && formatDate(value)}
        </>
      }
      popover={(close) => (
        <Calendar
          value={value}
          min={min}
          max={max}
          onPick={(d) => {
            setValue(d);
            close();
          }}
          onClear={props.required ? undefined : () => {
            setValue("");
            close();
          }}
        />
      )}
    />
  );
}

export function TimeField({ step = 60, defaultValue, placeholder = "Izaberi", onChange, ...props }: FieldProps & { step?: number }) {
  const [value, setTime] = useState(defaultValue ?? "");
  const setValue = (v: string) => {
    setTime(v);
    onChange?.(v);
  };
  return (
    <Picker
      {...props}
      value={value}
      placeholder={placeholder}
      icon={<Clock />}
      display={value}
      width={232}
      popover={(close) => (
        <TimeGrid
          value={value}
          minuteStep={Math.max(1, Math.round(step / 60))}
          onChange={setValue}
          onDone={close}
          onClear={props.required ? undefined : () => {
            setValue("");
            close();
          }}
        />
      )}
    />
  );
}

// ───────── Polje i plutajući prozor ─────────

function Picker({
  label,
  name,
  hint,
  className,
  required,
  disabled,
  value,
  placeholder,
  icon,
  display,
  width = 304,
  popover,
}: Omit<FieldProps, "defaultValue"> & {
  value: string;
  icon: ReactNode;
  display: ReactNode;
  width?: number;
  popover: (close: () => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const anchor = useRef<HTMLSpanElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const id = useId();

  const close = (refocus = true) => {
    setOpen(false);
    if (refocus) trigger.current?.focus();
  };

  return (
    <Label label={label} hint={hint} className={className}>
      <span ref={anchor} className="relative block">
        <button
          ref={trigger}
          type="button"
          disabled={disabled}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls={open ? id : undefined}
          onClick={() => setOpen((o) => !o)}
          className={cx(inputClass, "flex items-center gap-2 text-left", open && "border-fg-muted ring-4 ring-fg/8")}
        >
          <span aria-hidden className="shrink-0 text-fg-muted [&>svg]:size-4">{icon}</span>
          <span className={cx("tabular min-w-0 flex-1 truncate", !value && "text-faint")}>{value ? display : placeholder}</span>
        </button>
        {/* Nosi vrijednost u formu; nije type="hidden" da bi browser provjerio required i pokazao poruku kod polja */}
        <input
          tabIndex={-1}
          aria-hidden
          name={name}
          value={value}
          required={required}
          disabled={disabled}
          onChange={() => {}}
          className="pointer-events-none absolute inset-x-0 bottom-0 h-px w-full opacity-0"
        />
      </span>
      {open && (
        <Popover id={id} anchor={anchor} label={label} width={width} onClose={close}>
          {popover(close)}
        </Popover>
      )}
    </Label>
  );
}

// ───────── Kalendar ─────────

const WEEK = [...WEEKDAYS.slice(1), WEEKDAYS[0]]; // od ponedjeljka

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function weekday(date: string) {
  return date ? new Date(`${date}T12:00:00Z`).getUTCDay() : 0;
}

function daysInMonth(y: number, m: number) {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/** "YYYY-MM-DD" + n mjeseci; dan se skraćuje na kraj mjeseca (31. jan + 1 = 28/29. feb) */
function shiftMonth(date: string, n: number) {
  const [y, m, d] = date.split("-").map(Number);
  const t = y * 12 + (m - 1) + n;
  const ny = Math.floor(t / 12);
  const nm = (t % 12) + 1;
  return `${ny}-${String(nm).padStart(2, "0")}-${String(Math.min(d, daysInMonth(ny, nm))).padStart(2, "0")}`;
}

function clamp(date: string, min?: string, max?: string) {
  if (min && date < min) return min;
  if (max && date > max) return max;
  return date;
}

export function Calendar({
  value,
  min,
  max,
  onPick,
  onClear,
}: {
  value: string;
  min?: string;
  max?: string;
  onPick: (date: string) => void;
  onClear?: () => void;
}) {
  const [today] = useState(todayISO);
  const [focus, setFocus] = useState(() => clamp(value || today, min, max));
  const [mode, setMode] = useState<"days" | "months">("days");
  const grid = useRef<HTMLDivElement>(null);
  // Fokus prati izabrani dan samo pri otvaranju i kretanju tastaturom, ne pri kliku na strelice
  const takeFocus = useRef(true);

  useEffect(() => {
    if (mode !== "days" || !takeFocus.current) return;
    takeFocus.current = false;
    grid.current?.querySelector<HTMLButtonElement>('[tabindex="0"]')?.focus();
  }, [focus, mode]);

  const [y, m] = focus.split("-").map(Number);
  const month = focus.slice(0, 7);
  const first = `${month}-01`;
  const start = addDays(first, -((weekday(first) + 6) % 7));
  const days = Array.from({ length: 42 }, (_, i) => addDays(start, i));
  const outside = (d: string) => (min !== undefined && d < min) || (max !== undefined && d > max);
  const go = (d: string) => setFocus(clamp(d, min, max));

  const onGridKey = (e: KeyboardEvent) => {
    const wd = (weekday(focus) + 6) % 7;
    const moves: Record<string, () => string> = {
      ArrowLeft: () => addDays(focus, -1),
      ArrowRight: () => addDays(focus, 1),
      ArrowUp: () => addDays(focus, -7),
      ArrowDown: () => addDays(focus, 7),
      Home: () => addDays(focus, -wd),
      End: () => addDays(focus, 6 - wd),
      PageUp: () => shiftMonth(focus, e.shiftKey ? -12 : -1),
      PageDown: () => shiftMonth(focus, e.shiftKey ? 12 : 1),
    };
    const move = moves[e.key];
    if (!move) return;
    e.preventDefault();
    takeFocus.current = true;
    go(move());
  };

  if (mode === "months") {
    return (
      <div>
        <div className="mb-2 flex items-center justify-between">
          <button type="button" onClick={() => setMode("days")} className="inline-flex h-9 items-center gap-1 rounded-md px-2 text-[15px] font-semibold tracking-[-0.01em] hover:bg-panel-2">
            {y}
            <ChevronDown className="size-4 rotate-180 text-fg-muted" />
          </button>
          <NavButtons
            label="godina"
            onPrev={() => go(shiftMonth(focus, -12))}
            onNext={() => go(shiftMonth(focus, 12))}
            prevDisabled={!!min && y <= Number(min.slice(0, 4))}
            nextDisabled={!!max && y >= Number(max.slice(0, 4))}
          />
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {MONTHS_SHORT.map((name, i) => {
            const key = `${y}-${String(i + 1).padStart(2, "0")}`;
            const off = (!!min && key < min.slice(0, 7)) || (!!max && key > max.slice(0, 7));
            const selected = value.slice(0, 7) === key;
            return (
              <button
                key={name}
                type="button"
                disabled={off}
                onClick={() => {
                  takeFocus.current = true;
                  go(shiftMonth(focus, i + 1 - m));
                  setMode("days");
                }}
                className={cx(
                  "h-11 rounded-md text-[14px] font-medium transition-colors disabled:opacity-30",
                  selected ? "bg-brand text-brand-ink" : key === month ? "bg-panel-2 text-fg" : "text-fg hover:bg-panel-2",
                )}
              >
                {cap(name)}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setMode("months")}
          aria-label={`${cap(MONTHS[m - 1])} ${y}, izaberi mjesec`}
          className="inline-flex h-9 items-center gap-1 rounded-md px-2 text-[15px] font-semibold tracking-[-0.01em] hover:bg-panel-2"
        >
          {cap(MONTHS[m - 1])} {y}
          <ChevronDown className="size-4 text-fg-muted" />
        </button>
        <NavButtons
          label="mjesec"
          onPrev={() => go(shiftMonth(focus, -1))}
          onNext={() => go(shiftMonth(focus, 1))}
          prevDisabled={!!min && month <= min.slice(0, 7)}
          nextDisabled={!!max && month >= max.slice(0, 7)}
        />
      </div>

      <div className="grid grid-cols-7 pb-1" aria-hidden>
        {WEEK.map((d) => (
          <span key={d} className="grid h-7 place-items-center text-[11px] font-medium uppercase tracking-wide text-faint">
            {d}
          </span>
        ))}
      </div>

      <div ref={grid} role="grid" aria-label={`${cap(MONTHS[m - 1])} ${y}`} onKeyDown={onGridKey} className="grid grid-cols-7 gap-y-0.5">
        {days.map((d) => {
          const inMonth = d.startsWith(month);
          const selected = d === value;
          const isToday = d === today;
          const off = outside(d);
          return (
            <button
              key={d}
              type="button"
              role="gridcell"
              tabIndex={d === focus ? 0 : -1}
              disabled={off}
              aria-selected={selected}
              aria-current={isToday ? "date" : undefined}
              aria-label={`${WEEKDAYS[weekday(d)]}, ${formatDate(d)}`}
              onClick={() => onPick(d)}
              className={cx(
                "tabular relative mx-auto grid size-10 place-items-center rounded-md text-[14px] transition-colors disabled:opacity-25",
                selected
                  ? "bg-brand font-semibold text-brand-ink"
                  : cx("hover:bg-panel-2", inMonth ? "text-fg" : "text-faint/70", isToday && "font-semibold"),
              )}
            >
              {Number(d.slice(8))}
              {isToday && (
                <span aria-hidden className={cx("absolute bottom-1.5 size-1 rounded-full", selected ? "bg-brand-ink" : "bg-crest")} />
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-2 flex items-center justify-between border-t border-line pt-2">
        {onClear && value ? (
          <button type="button" onClick={onClear} className="h-9 rounded-md px-2.5 text-[14px] font-medium text-fg-muted hover:bg-panel-2 hover:text-fg">
            Obriši
          </button>
        ) : (
          <span />
        )}
        <button
          type="button"
          disabled={outside(today)}
          onClick={() => onPick(today)}
          className="h-9 rounded-md px-2.5 text-[14px] font-semibold text-fg hover:bg-panel-2 disabled:opacity-30"
        >
          Danas
        </button>
      </div>
    </div>
  );
}

function NavButtons({
  label,
  onPrev,
  onNext,
  prevDisabled,
  nextDisabled,
}: {
  label: string;
  onPrev: () => void;
  onNext: () => void;
  prevDisabled: boolean;
  nextDisabled: boolean;
}) {
  const cls = "grid size-9 place-items-center rounded-md text-fg-muted transition-colors hover:bg-panel-2 hover:text-fg disabled:opacity-30";
  return (
    <div className="flex gap-0.5">
      <button type="button" aria-label={`Prethodni ${label}`} disabled={prevDisabled} onClick={onPrev} className={cls}>
        <ChevronLeft className="size-[18px]" />
      </button>
      <button type="button" aria-label={`Sljedeći ${label}`} disabled={nextDisabled} onClick={onNext} className={cls}>
        <ChevronRight className="size-[18px]" />
      </button>
    </div>
  );
}

// ───────── Vrijeme ─────────

const pad = (n: number) => String(n).padStart(2, "0");

export function TimeGrid({
  value,
  minuteStep,
  onChange,
  onDone,
  onClear,
}: {
  value: string;
  minuteStep: number;
  onChange: (time: string) => void;
  onDone: () => void;
  onClear?: () => void;
}) {
  const [h, mi] = value ? value.split(":") : ["", ""];
  const hours = Array.from({ length: 24 }, (_, i) => pad(i));
  const minutes = Array.from({ length: Math.ceil(60 / minuteStep) }, (_, i) => pad(i * minuteStep));
  const hourCol = useRef<HTMLDivElement>(null);
  const minuteCol = useRef<HTMLDivElement>(null);

  // Izabrano (ili trenutni sat) na sredinu kolone; fokus na sat
  useLayoutEffect(() => {
    const now = pad(new Date().getHours());
    for (const col of [hourCol.current, minuteCol.current]) {
      const el =
        col?.querySelector<HTMLElement>('[aria-selected="true"]') ??
        (col === hourCol.current ? col?.querySelector<HTMLElement>(`[data-v="${now}"]`) : null);
      if (col && el) col.scrollTop = el.offsetTop - col.clientHeight / 2 + el.offsetHeight / 2;
    }
    (hourCol.current?.querySelector<HTMLElement>('[aria-selected="true"]') ?? hourCol.current?.querySelector<HTMLElement>("button"))?.focus({
      preventScroll: true,
    });
  }, []);

  const onKey = (e: KeyboardEvent) => {
    const btn = (e.target as HTMLElement).closest("button");
    if (!btn?.dataset.v) return;
    const col = btn.parentElement;
    let next: Element | null | undefined;
    if (e.key === "ArrowDown") next = btn.nextElementSibling;
    else if (e.key === "ArrowUp") next = btn.previousElementSibling;
    else if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      const other = col === hourCol.current ? minuteCol.current : hourCol.current;
      next = other?.querySelector('[aria-selected="true"]') ?? other?.firstElementChild;
    } else return;
    e.preventDefault();
    (next as HTMLElement | null | undefined)?.focus();
  };

  const column = (items: string[], selected: string, ref: RefObject<HTMLDivElement | null>, label: string, pick: (v: string) => void) => (
    <div className="min-w-0 flex-1">
      <div className="pb-1.5 text-center text-[11px] font-medium uppercase tracking-wide text-faint">{label}</div>
      <div
        ref={ref}
        role="listbox"
        aria-label={label}
        className="relative flex h-56 flex-col gap-0.5 overflow-y-auto overscroll-contain rounded-md bg-panel-2 p-1 [scrollbar-width:thin]"
      >
        {items.map((v) => (
          <button
            key={v}
            type="button"
            role="option"
            data-v={v}
            aria-selected={v === selected}
            onClick={() => pick(v)}
            className={cx(
              "tabular h-9 shrink-0 rounded-md text-[15px] transition-colors",
              v === selected ? "bg-brand font-semibold text-brand-ink" : "text-fg hover:bg-panel",
            )}
          >
            {v}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div onKeyDown={onKey}>
      <div className="flex gap-2">
        {column(hours, h, hourCol, "Sat", (v) => onChange(`${v}:${mi || "00"}`))}
        {column(minutes, mi, minuteCol, "Minute", (v) => {
          onChange(`${h || "00"}:${v}`);
          if (h) onDone();
        })}
      </div>
      <div className="mt-2 flex items-center justify-between border-t border-line pt-2">
        {onClear && value ? (
          <button type="button" onClick={onClear} className="h-9 rounded-md px-2.5 text-[14px] font-medium text-fg-muted hover:bg-panel-2 hover:text-fg">
            Obriši
          </button>
        ) : (
          <span />
        )}
        <button type="button" onClick={onDone} className="h-9 rounded-md px-2.5 text-[14px] font-semibold text-fg hover:bg-panel-2">
          Gotovo
        </button>
      </div>
    </div>
  );
}

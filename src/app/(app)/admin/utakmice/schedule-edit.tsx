"use client";

import { useId, useOptimistic, useRef, useState, useTransition, type ReactNode } from "react";
import { CalendarDays, Check, Clock, LoaderCircle, MapPin, Search } from "lucide-react";
import { Calendar, TimeGrid } from "@/components/date-picker";
import { Popover } from "@/components/popover";
import { cx } from "@/components/ui";
import { isoToSarajevo, MONTHS_SHORT, WEEKDAYS } from "@/lib/format";
import { updateSchedule } from "./actions";

type Schedule = { date: string; time: string; hallId: string };

/** Lista dvorana se može pretraživati kad ih ima više od ovoga */
const SEARCH_FROM = 8;

/**
 * Datum, vrijeme i dvorana u redu liste utakmica (samo neaktivirane): klik otvara izbor, izmjena se čuva odmah.
 */
export function ScheduleEdit({
  id,
  iso,
  hallId,
  halls,
  label,
}: {
  id: string;
  iso: string;
  hallId: string | null;
  halls: { id: string; name: string }[];
  label: string;
}) {
  const [value, setValue] = useOptimistic<Schedule>({ ...isoToSarajevo(iso), hallId: hallId ?? "" });
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>();

  const save = async (patch: Partial<Schedule>) => {
    const next = { ...value, ...patch };
    if (next.date === value.date && next.time === value.time && next.hallId === value.hallId) return;
    start(async () => {
      setValue(next);
      const r = await updateSchedule(id, next.date, next.time, next.hallId || null);
      setError(r.error);
    });
  };

  const d = new Date(`${value.date}T12:00:00Z`);
  const hall = halls.find((h) => h.id === value.hallId);

  return (
    <div className="flex flex-wrap items-center gap-1.5" aria-label={`Termin i dvorana: ${label}`} role="group">
      <Chip icon={<CalendarDays />} label="Datum" width={304} disabled={pending}
        popover={(close) => (
          <Calendar
            value={value.date}
            onPick={(date) => {
              close();
              void save({ date });
            }}
          />
        )}
      >
        <span className="capitalize">{WEEKDAYS[d.getUTCDay()]}</span>, {d.getUTCDate()}. {MONTHS_SHORT[d.getUTCMonth()]}
      </Chip>

      <TimeChip value={value.time} disabled={pending} onSave={(time) => void save({ time })} />

      <Chip icon={<MapPin />} label="Dvorana" width={280} disabled={pending} empty={!hall} className="min-w-0 max-w-full"
        popover={(close) => (
          <HallList
            halls={halls}
            value={value.hallId}
            onPick={(hallId) => {
              close();
              void save({ hallId });
            }}
          />
        )}
      >
        <span className="truncate">{hall?.name ?? "Dodaj dvoranu"}</span>
      </Chip>

      {pending && <LoaderCircle className="size-4 animate-spin text-fg-faint" aria-label="Čuvam" />}
      {error && (
        <span role="alert" className="text-[13px] font-medium text-crest">
          {error}
        </span>
      )}
    </div>
  );
}

/** Vrijeme se čuva kad se prozor zatvori (izbor sata pa minuta je jedna izmjena) */
function TimeChip({ value, disabled, onSave }: { value: string; disabled: boolean; onSave: (time: string) => void }) {
  const [draft, setDraft] = useState(value);
  // Izbor minute odmah zatvara prozor, prije nego što se draft ponovo iscrta
  const latest = useRef(value);
  const pick = (time: string) => {
    latest.current = time;
    setDraft(time);
  };
  return (
    <Chip
      icon={<Clock />}
      label="Vrijeme"
      width={232}
      disabled={disabled}
      onOpen={() => pick(value)}
      onClose={() => onSave(latest.current)}
      popover={(close) => <TimeGrid value={draft} minuteStep={5} onChange={pick} onDone={close} />}
    >
      <span className="tabular">{value}</span>
    </Chip>
  );
}

/** Malo dugme s ikonom koje otvara plutajući izbor (kao polje u formi, samo sitnije) */
function Chip({
  icon,
  label,
  width,
  disabled,
  empty,
  className,
  onOpen,
  onClose,
  popover,
  children,
}: {
  icon: ReactNode;
  label: string;
  width: number;
  disabled?: boolean;
  empty?: boolean;
  className?: string;
  onOpen?: () => void;
  onClose?: () => void;
  popover: (close: () => void) => ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const anchor = useRef<HTMLSpanElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const id = useId();

  const close = (refocus = true) => {
    setOpen(false);
    onClose?.();
    if (refocus) trigger.current?.focus();
  };

  return (
    <span ref={anchor} className={cx("inline-flex", className)}>
      <button
        ref={trigger}
        type="button"
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        aria-label={label}
        title={label}
        onClick={() => {
          if (open) return close();
          onOpen?.();
          setOpen(true);
        }}
        className={cx(
          "inline-flex h-9 min-w-0 max-w-full items-center gap-1.5 rounded-md border px-2.5 text-[13px] font-medium transition-colors disabled:opacity-60 sm:h-8",
          "[&>svg]:size-3.5 [&>svg]:shrink-0 [&>svg]:text-fg-muted",
          empty ? "border-dashed border-line-strong text-fg-muted hover:text-fg" : "border-line bg-panel text-fg hover:border-line-hover hover:bg-panel-2",
          open && "border-fg-muted ring-4 ring-fg/8",
        )}
      >
        {icon}
        {children}
      </button>
      {open && (
        <Popover id={id} anchor={anchor} label={label} width={width} onClose={close}>
          {popover(() => close())}
        </Popover>
      )}
    </span>
  );
}

function HallList({ halls, value, onPick }: { halls: { id: string; name: string }[]; value: string; onPick: (hallId: string) => void }) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLocaleLowerCase("bs");
  const shown = q ? halls.filter((h) => h.name.toLocaleLowerCase("bs").includes(q)) : halls;

  const item = (hallId: string, name: string, muted?: boolean) => (
    <li key={hallId || "none"}>
      <button
        type="button"
        onClick={() => onPick(hallId)}
        aria-pressed={hallId === value}
        className={cx(
          "flex h-9 w-full items-center gap-2 rounded-md px-2.5 text-left text-[14px] hover:bg-panel-2",
          hallId === value ? "font-semibold text-fg" : muted ? "text-fg-muted" : "text-fg",
        )}
      >
        <span className="min-w-0 flex-1 truncate">{name}</span>
        {hallId === value && <Check className="size-4 shrink-0 text-brand" />}
      </button>
    </li>
  );

  return (
    <div className="flex flex-col gap-2">
      {halls.length > SEARCH_FROM && (
        <label className="flex h-9 items-center gap-2 rounded-md border border-line bg-panel-2 px-2.5 focus-within:border-fg-muted">
          <Search className="size-4 shrink-0 text-fg-muted" aria-hidden="true" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Traži dvoranu"
            aria-label="Traži dvoranu"
            className="min-w-0 flex-1 bg-transparent text-[14px] outline-none placeholder:text-faint"
          />
        </label>
      )}
      <ul className="-mx-1 flex max-h-64 flex-col gap-0.5 overflow-y-auto overscroll-contain px-1">
        {!q && item("", "Nije određena", true)}
        {shown.map((h) => item(h.id, h.name))}
        {shown.length === 0 && <li className="px-2.5 py-2 text-[14px] text-fg-muted">Nema dvorane s tim imenom.</li>}
      </ul>
    </div>
  );
}

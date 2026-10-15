import Link from "next/link";
import { Inbox } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

// ───────── Dugmad ─────────

type Variant = "primary" | "secondary" | "plain" | "destructive" | "danger";

const BUTTON_BASE =
  "inline-flex h-11 shrink-0 select-none items-center justify-center gap-2 rounded-lg px-4 text-[15px] font-semibold tracking-[-0.01em] transition-[background-color,color,border-color,transform] duration-150 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40 sm:h-10 sm:text-[14px]";

const BUTTON_VARIANT: Record<Variant, string> = {
  primary: "bg-brand text-brand-ink shadow-panel hover:bg-brand-hover",
  secondary: "border border-line-strong bg-panel text-fg shadow-panel hover:border-line-hover hover:bg-panel-2",
  plain: "px-2 text-fg-muted hover:bg-panel-2 hover:text-fg",
  destructive: "px-2 text-crest hover:bg-crest/[0.06]",
  danger: "bg-crest-deep text-white shadow-panel hover:bg-crest-deep-hover",
};

export function buttonClass(variant: Variant = "primary", className?: string) {
  return cx(BUTTON_BASE, BUTTON_VARIANT[variant], className);
}

export function Button({ variant = "primary", className, ...props }: ComponentProps<"button"> & { variant?: Variant }) {
  return <button className={buttonClass(variant, className)} {...props} />;
}

export function ButtonLink({
  variant = "primary",
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant }) {
  return <Link className={buttonClass(variant, className)} {...props} />;
}

// ───────── Polja ─────────

export const inputClass =
  "h-11 w-full rounded-lg border border-line-strong bg-panel px-3 text-[16px] text-fg placeholder:text-faint outline-none transition-[border-color,box-shadow] hover:border-line-hover focus:border-fg-muted focus:ring-4 focus:ring-fg/8 disabled:bg-panel-2 disabled:opacity-60 sm:h-10 sm:text-[14px]";

export function Label({ label, hint, children, className }: { label: ReactNode; hint?: string; children: ReactNode; className?: string }) {
  return (
    <label className={cx("flex min-w-0 flex-col gap-1.5", className)}>
      <span className="text-[13px] font-medium text-fg-muted">{label}</span>
      {children}
      {hint && <span className="text-[12px] text-faint">{hint}</span>}
    </label>
  );
}

export function Field({
  label,
  hint,
  icon,
  className,
  ...props
}: ComponentProps<"input"> & { label: ReactNode; hint?: string; icon?: ReactNode }) {
  return (
    <Label label={label} hint={hint} className={className}>
      {icon ? (
        <span className="relative block">
          <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-fg-muted [&>svg]:size-4">{icon}</span>
          <input className={cx(inputClass, "pl-10")} {...props} />
        </span>
      ) : <input className={inputClass} {...props} />}
    </Label>
  );
}

export function Textarea({
  label,
  hint,
  className,
  ...props
}: ComponentProps<"textarea"> & { label: string; hint?: string }) {
  return (
    <Label label={label} hint={hint} className={className}>
      <textarea className={cx(inputClass, "h-auto min-h-24 py-3")} {...props} />
    </Label>
  );
}

// ───────── Struktura stranice ─────────

export function PageHeader({
  title,
  subtitle,
  icon,
  children,
}: {
  title: string;
  subtitle?: ReactNode;
  icon?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-center justify-between gap-x-6 gap-y-4 border-b border-line pb-6 sm:mb-8">
      <div className="flex min-w-0 items-start gap-3.5 sm:gap-4">
        {icon && <span aria-hidden="true" className="grid size-11 shrink-0 place-items-center rounded-lg border border-line bg-panel text-fg-muted shadow-panel sm:size-12 [&>svg]:size-[22px] [&>svg]:stroke-[1.6]">{icon}</span>}
        <div className="min-w-0">
          <h1 className="font-display text-[28px] font-semibold leading-tight tracking-[-0.04em] sm:text-[32px]">{title}</h1>
          {subtitle && <p className="mt-1.5 max-w-prose text-[14px] leading-relaxed text-fg-muted">{subtitle}</p>}
        </div>
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </header>
  );
}

/** Kartica: bijela površina, tanka ivica, radius 10px, jedva vidljiva sjena */
export const CARD = "rounded-lg border border-line bg-panel shadow-panel";

export function Panel({ className, ...props }: ComponentProps<"section">) {
  return <section className={cx(CARD, "px-4 sm:px-6", className)} {...props} />;
}

/** Naslov sekcije unutar stranice */
export function SectionTitle({ children, count, action, icon }: { children: ReactNode; count?: number; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 pb-3">
      <h2 className="flex min-w-0 items-center gap-2.5 font-display text-[18px] font-semibold tracking-[-0.02em]">
        {icon && <span aria-hidden="true" className="shrink-0 text-fg-muted [&>svg]:size-[18px] [&>svg]:stroke-[1.7]">{icon}</span>}
        {children}
        {count !== undefined && <span className="tabular inline-flex min-w-6 shrink-0 items-center justify-center rounded-md border border-line bg-panel px-1.5 py-0.5 text-[12px] font-medium text-fg-muted">{count}</span>}
      </h2>
      {action}
    </div>
  );
}

/** Lista u kartici: redovi razdvojeni linijom preko cijele širine */
export const ROWS = "divide-y divide-line overflow-hidden rounded-lg border border-line bg-panel shadow-panel [&>*]:px-4 sm:[&>*]:px-6";

/** Lista redova unutar panela, razdvojenih linijom */
export function Rows({ className, ...props }: ComponentProps<"ul">) {
  return <ul className={cx(ROWS, className)} {...props} />;
}

export function Empty({ children, action, icon = <Inbox />, title }: { children: ReactNode; action?: ReactNode; icon?: ReactNode; title?: string }) {
  return (
    <div className="flex flex-col items-center rounded-lg border border-line bg-panel px-6 py-10 text-center shadow-panel sm:py-12">
      <span aria-hidden="true" className="mb-5 grid size-14 place-items-center rounded-xl border border-line bg-panel-2 text-fg-muted [&>svg]:size-6 [&>svg]:stroke-[1.5]">{icon}</span>
      {title && <h3 className="mb-2 text-[16px] font-semibold tracking-[-0.02em]">{title}</h3>}
      <p className="max-w-sm text-[14px] leading-relaxed text-fg-muted">{children}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

// ───────── Status ─────────

type Tone = "gold" | "mint" | "orange" | "crest" | "muted";

/** Boja tačke stanja */
const DOT: Record<Tone, string> = {
  gold: "bg-amber",
  mint: "bg-mint",
  orange: "bg-orange",
  crest: "bg-crest",
  muted: "bg-fg-faint",
};

/** Boja broja/teksta u tom stanju (tamnije, čitljivo na bijelom) */
const TONE: Record<Tone, string> = {
  gold: "text-amber-ink",
  mint: "text-mint",
  orange: "text-orange",
  crest: "text-crest",
  muted: "text-fg-muted",
};

/** Stanje: mala tačka u boji + tekst (pulse = utakmica uživo) */
export function Status({ tone, children, pulse }: { tone: Tone; children: ReactNode; pulse?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[13px] text-fg-muted">
      <span className={cx("size-2 shrink-0 rounded-full", DOT[tone], pulse && "animate-pulse")} aria-hidden />
      <span className={tone === "muted" ? undefined : "font-medium text-fg"}>{children}</span>
    </span>
  );
}

/** Broj kao na semaforu, s opisom ispod */
export function Stat({ label, value, unit, tone, icon }: { label: string; value: ReactNode; unit?: string; tone?: Tone; icon?: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="mb-3 flex items-center gap-2 text-[13px] font-medium text-fg-muted">
        {icon && <span aria-hidden="true" className="shrink-0 [&>svg]:size-4 [&>svg]:stroke-[1.7]">{icon}</span>}
        {label}
      </dt>
      <dd className={cx("scoreboard break-words text-[28px] font-semibold leading-none tracking-[-0.04em] sm:text-[32px]", tone && TONE[tone])}>
        {value}
        {unit && <span className="ml-1 text-[18px] font-semibold text-fg-muted sm:text-[22px]">{unit}</span>}
      </dd>
    </div>
  );
}

// ───────── Filteri (segmenti) ─────────

export function Segments({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cx("-mx-4 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0", className)}>
      <div className="inline-flex gap-0.5 rounded-lg bg-track p-[3px]">{children}</div>
    </div>
  );
}

export function Segment({ href, active, children }: { href: string; active: boolean; children: ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cx(
        "whitespace-nowrap rounded-md px-3.5 py-1.5 text-[14px] font-semibold transition-colors",
        active ? "bg-panel-3 text-fg shadow-segment" : "text-fg-muted hover:bg-panel-3/60 hover:text-fg",
      )}
    >
      {children}
    </Link>
  );
}

import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

// ───────── Dugmad ─────────

type Variant = "primary" | "secondary" | "plain" | "destructive" | "danger";

const BUTTON_BASE =
  "inline-flex h-11 shrink-0 select-none items-center justify-center gap-2 rounded-lg px-4 text-[15px] font-semibold tracking-[-0.01em] transition-[background-color,color,border-color,transform] duration-150 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40 sm:h-10 sm:text-[14px]";

const BUTTON_VARIANT: Record<Variant, string> = {
  primary: "bg-brand text-[color:var(--brand-ink)] shadow-panel hover:bg-brand-hover",
  secondary: "border border-line-strong bg-panel text-fg shadow-panel hover:border-[#c4c1d3] hover:bg-panel-2",
  plain: "px-2 text-fg-muted hover:text-fg",
  destructive: "px-2 text-crest hover:bg-crest/[0.06]",
  danger: "bg-crest-deep text-white shadow-panel hover:bg-[#99201a]",
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
  "h-11 w-full rounded-lg border border-line-strong bg-panel px-3 text-[16px] text-fg placeholder:text-faint outline-none transition-[border-color,box-shadow] hover:border-[#c4c1d3] focus:border-brand focus:ring-4 focus:ring-brand/12 disabled:bg-panel-2 disabled:opacity-60 sm:h-10 sm:text-[14px]";

function Label({ label, hint, children, className }: { label: string; hint?: string; children: ReactNode; className?: string }) {
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
  className,
  ...props
}: ComponentProps<"input"> & { label: string; hint?: string }) {
  return (
    <Label label={label} hint={hint} className={className}>
      <input className={inputClass} {...props} />
    </Label>
  );
}

export function Select({
  label,
  hint,
  className,
  children,
  ...props
}: ComponentProps<"select"> & { label: string; hint?: string }) {
  return (
    <Label label={label} hint={hint} className={className}>
      <select className={cx(inputClass, "appearance-none bg-[length:16px] bg-[right_12px_center] bg-no-repeat pr-9", SELECT_ARROW)} {...props}>
        {children}
      </select>
    </Label>
  );
}

// Strelica za select (SVG u boji --muted)
const SELECT_ARROW =
  "bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%235f5c74' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")]";

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
  children,
}: {
  title: string;
  subtitle?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4 pb-6 sm:pb-8">
      <div className="min-w-0">
        <h1 className="font-display text-[28px] font-semibold leading-tight tracking-[-0.04em] sm:text-[32px]">{title}</h1>
        {subtitle && <p className="mt-1.5 max-w-prose text-[14px] text-fg-muted">{subtitle}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </header>
  );
}

/** Kartica: bijela površina, tanka ivica, radius 8px, jedva vidljiva sjena */
export const CARD = "rounded-lg border border-line bg-panel shadow-panel";

export function Panel({ className, ...props }: ComponentProps<"section">) {
  return <section className={cx(CARD, "px-4 sm:px-6", className)} {...props} />;
}

/** Naslov sekcije unutar stranice */
export function SectionTitle({ children, count, action }: { children: ReactNode; count?: number; action?: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 pb-3">
      <h2 className="font-display text-[18px] font-semibold tracking-[-0.02em]">
        {children}
        {count !== undefined && <span className="ml-2 text-fg-faint">{count}</span>}
      </h2>
      {action}
    </div>
  );
}

/** Lista u kartici: redovi razdvojeni linijom preko cijele širine */
export const ROWS = "divide-y divide-line rounded-lg border border-line bg-panel shadow-panel [&>*]:px-4 sm:[&>*]:px-6";

/** Lista redova unutar panela, razdvojenih linijom */
export function Rows({ className, ...props }: ComponentProps<"ul">) {
  return <ul className={cx(ROWS, className)} {...props} />;
}

export function Empty({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed border-line-strong px-6 py-12 text-center">
      <p className="max-w-sm text-[15px] text-fg-muted">{children}</p>
      {action}
    </div>
  );
}

export function Loading() {
  return (
    <div className="flex flex-col gap-3" aria-busy="true" aria-label="Učitavam">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-20 animate-pulse rounded-lg border border-line bg-panel" />
      ))}
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
  gold: "text-[#9a6700]",
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
export function Stat({ label, value, unit, tone }: { label: string; value: ReactNode; unit?: string; tone?: Tone }) {
  return (
    <div className="min-w-0">
      <dd className={cx("scoreboard whitespace-nowrap text-[28px] font-semibold leading-none tracking-[-0.04em] sm:text-[32px]", tone && TONE[tone])}>
        {value}
        {unit && <span className="ml-1 text-[18px] font-semibold text-fg-muted sm:text-[22px]">{unit}</span>}
      </dd>
      <dt className="mt-1.5 text-[13px] text-fg-muted">{label}</dt>
    </div>
  );
}

// ───────── Filteri (segmenti) ─────────

export function Segments({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cx("-mx-4 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0", className)}>
      <div className="inline-flex gap-0.5 rounded-lg bg-[#e9e8f0] p-[3px]">{children}</div>
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
        active ? "bg-panel-3 text-fg shadow-[0_1px_2px_rgb(23_20_46/0.08),0_0_0_0.5px_rgb(23_20_46/0.06)]" : "text-fg-muted hover:text-fg",
      )}
    >
      {children}
    </Link>
  );
}

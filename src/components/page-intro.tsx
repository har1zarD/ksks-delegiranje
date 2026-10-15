import type { ReactNode } from "react";

export function PageIntro({ title, subtitle, eyebrow, children, compact = false, illustration }: {
  title: string;
  subtitle: string;
  eyebrow: string;
  children?: ReactNode;
  compact?: boolean;
  illustration?: ReactNode;
}) {
  if (compact) {
    return (
      <header className="mb-4 rounded-2xl border border-line bg-panel p-4 shadow-panel sm:mb-6 sm:px-5">
        <p className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-fg-muted">
          {illustration && <span aria-hidden="true" className="shrink-0">{illustration}</span>}
          {eyebrow}
        </p>
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <h1 className="font-display text-[24px] font-semibold leading-tight tracking-[-0.04em] sm:text-[28px]">{title}</h1>
          {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
        </div>
        <p className="mt-1.5 max-w-prose text-[12px] leading-relaxed text-fg-muted sm:text-[13px]">{subtitle}</p>
      </header>
    );
  }

  return (
    <header className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-line pb-6 sm:mb-8">
      <div className="min-w-0">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-fg-muted">{eyebrow}</p>
        <h1 className="font-display text-[28px] font-semibold leading-tight tracking-[-0.04em] sm:text-[32px]">{title}</h1>
        <p className="mt-1.5 max-w-prose text-[14px] leading-relaxed text-fg-muted">{subtitle}</p>
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </header>
  );
}

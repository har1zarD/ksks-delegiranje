import type { ReactNode } from "react";

export function PageIntro({ title, subtitle, eyebrow, children }: {
  title: string;
  subtitle: string;
  eyebrow: string;
  children?: ReactNode;
}) {
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

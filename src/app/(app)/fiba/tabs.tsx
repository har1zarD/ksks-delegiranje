"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { cx } from "@/components/ui";

function subscribe(onChange: () => void) {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}

/**
 * Tabovi na stranici (box score, poređenje ekipa, tok utakmice…): svi paneli su već na stranici (server),
 * klik samo mijenja vidljivi bez novog učitavanja. Izbor se pamti u #hash da osvježavanje uživo ne vraća na prvi.
 */
export function Tabs({ tabs }: { tabs: { key: string; label: string; content: ReactNode }[] }) {
  const hash = useSyncExternalStore(subscribe, () => window.location.hash.slice(1), () => "");
  const active = tabs.some((t) => t.key === hash) ? hash : tabs[0]?.key;
  return (
    <div className="flex flex-col gap-6">
      <div role="tablist" className="-mx-4 flex overflow-x-auto border-b border-line px-4 [scrollbar-width:none] sm:mx-0 sm:px-0">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={active === t.key}
            onClick={() => {
              history.replaceState(null, "", `#${t.key}`);
              window.dispatchEvent(new HashChangeEvent("hashchange"));
            }}
            className={cx(
              "-mb-px shrink-0 whitespace-nowrap border-b-2 px-3.5 py-3 text-[15px] font-semibold transition-colors",
              active === t.key ? "border-fg text-fg" : "border-transparent text-fg-muted hover:text-fg",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tabs.map((t) => (
        <div key={t.key} role="tabpanel" hidden={active !== t.key}>
          {t.content}
        </div>
      ))}
    </div>
  );
}

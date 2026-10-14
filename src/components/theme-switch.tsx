"use client";

import { useSyncExternalStore } from "react";
import { Monitor, Moon, Sun, type LucideIcon } from "lucide-react";
import { cx } from "@/components/ui";

export type Theme = "system" | "light" | "dark";

const KEY = "tema";
const EVENT = "tema-promjena";

/** Skripta u <head>: postavi temu prije prvog crtanja (bez bljeska pogrešne teme) */
export const THEME_SCRIPT = `try{var t=localStorage.getItem("${KEY}");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;

function read(): Theme {
  try {
    const t = localStorage.getItem(KEY);
    return t === "light" || t === "dark" ? t : "system";
  } catch {
    return "system";
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange); // druga kartica
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function apply(theme: Theme) {
  try {
    if (theme === "system") localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, theme);
  } catch {}
  if (theme === "system") delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = theme;
  window.dispatchEvent(new Event(EVENT));
}

const OPTIONS: { value: Theme; label: string; Icon: LucideIcon }[] = [
  { value: "system", label: "Kao sistem", Icon: Monitor },
  { value: "light", label: "Svijetla", Icon: Sun },
  { value: "dark", label: "Tamna", Icon: Moon },
];

/** Izbor teme: sistem / svijetla / tamna */
export function ThemeSwitch({ className }: { className?: string }) {
  const theme = useSyncExternalStore(subscribe, read, () => "system" as Theme);

  return (
    <div role="radiogroup" aria-label="Tema" className={cx("grid grid-cols-3 gap-0.5 rounded-lg bg-track p-[3px]", className)}>
      {OPTIONS.map(({ value, label, Icon }) => {
        const active = theme === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={label}
            title={label}
            onClick={() => apply(value)}
            className={cx(
              "grid h-8 place-items-center rounded-md transition-colors",
              active ? "bg-panel-3 text-fg shadow-segment" : "text-fg-faint hover:text-fg",
            )}
          >
            <Icon className="size-4" strokeWidth={active ? 2.2 : 1.8} />
          </button>
        );
      })}
    </div>
  );
}

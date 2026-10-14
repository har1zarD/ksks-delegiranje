"use client";

import { useEffect, useState } from "react";
import { Share, SquarePlus, Smartphone, X } from "lucide-react";
import { cx } from "@/components/ui";

// Chrome/Android: događaj stiže jednom po učitavanju, pa ga hvatamo čim se modul učita
type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };
let deferred: InstallEvent | null = null;
const listeners = new Set<() => void>();
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e as InstallEvent;
    listeners.forEach((l) => l());
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    listeners.forEach((l) => l());
  });
}

const DISMISS_KEY = "ksks-install-dismissed";

type Mode = "hidden" | "prompt" | "ios";

function detect(): Mode {
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
  if (standalone) return "hidden";
  if (deferred) return "prompt";
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.userAgent.includes("Macintosh") && navigator.maxTouchPoints > 1);
  return ios ? "ios" : "hidden";
}

/**
 * "Dodaj na početni ekran": na Androidu otvara sistemski prozor za instalaciju,
 * na iPhoneu pokazuje dva koraka (Podijeli → Dodaj na početni ekran).
 * Ne prikazuje se ako je aplikacija već otvorena s početnog ekrana ili na računaru.
 */
export function InstallApp({ dismissible = false, className }: { dismissible?: boolean; className?: string }) {
  const [mode, setMode] = useState<Mode>("hidden");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let dismissed = false;
    try {
      dismissed = dismissible && localStorage.getItem(DISMISS_KEY) === "1";
    } catch {}
    if (dismissed) return;
    const update = () => setMode(detect());
    update();
    listeners.add(update);
    return () => void listeners.delete(update);
  }, [dismissible]);

  if (mode === "hidden") return null;

  async function install() {
    if (mode === "ios") return setOpen((o) => !o);
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    deferred = null;
    setMode(detect());
  }

  function dismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {}
    setMode("hidden");
  }

  return (
    <div className={cx("rounded-lg border border-line bg-panel shadow-panel", className)}>
      <div className="flex items-center">
        <button
          type="button"
          onClick={install}
          aria-expanded={mode === "ios" ? open : undefined}
          className="flex min-w-0 flex-1 items-center gap-3 rounded-lg px-4 py-3.5 text-left transition-colors hover:bg-panel-2"
        >
          <Smartphone className="size-6 shrink-0 text-fg" strokeWidth={1.7} />
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-semibold tracking-[-0.01em]">Dodaj na početni ekran</span>
            <span className="block text-[13px] text-fg-muted">Otvaraj KSKS kao aplikaciju, jednim dodirom</span>
          </span>
          {mode === "prompt" && <span className="shrink-0 text-[14px] font-semibold">Dodaj</span>}
        </button>
        {dismissible && (
          <button
            type="button"
            onClick={dismiss}
            aria-label="Ne prikazuj više"
            className="mr-1.5 grid size-10 shrink-0 place-items-center rounded-md text-fg-faint hover:bg-panel-2 hover:text-fg"
          >
            <X className="size-4.5" />
          </button>
        )}
      </div>
      {mode === "ios" && open && (
        <ol className="flex flex-col gap-3 border-t border-line px-4 py-3.5 text-[14px]">
          <li className="flex items-center gap-3">
            <span className="w-4 shrink-0 text-center font-semibold text-fg-faint">1</span>
            <span>
              Dodirni <Share className="mx-0.5 inline size-[18px] -translate-y-px text-blue" strokeWidth={1.9} aria-label="Podijeli" />{" "}
              <b className="font-semibold">Podijeli</b> u traci Safarija
            </span>
          </li>
          <li className="flex items-center gap-3">
            <span className="w-4 shrink-0 text-center font-semibold text-fg-faint">2</span>
            <span>
              Izaberi <SquarePlus className="mx-0.5 inline size-[18px] -translate-y-px" strokeWidth={1.9} aria-hidden />{" "}
              <b className="font-semibold">Dodaj na početni ekran</b>
            </span>
          </li>
        </ol>
      )}
    </div>
  );
}

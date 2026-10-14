"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { EllipsisVertical, Share, SquarePlus, X } from "lucide-react";
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

/** prompt: sistemski prozor (Chrome/Android) · ios / android: koraci u listu */
type Mode = "hidden" | "prompt" | "ios" | "android";

function detect(): Mode {
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
  if (standalone) return "hidden";
  if (deferred) return "prompt";
  const ua = navigator.userAgent;
  if (/iphone|ipad|ipod/i.test(ua) || (ua.includes("Macintosh") && navigator.maxTouchPoints > 1)) return "ios";
  if (/android/i.test(ua)) return "android";
  return "hidden";
}

/**
 * "Dodaj na početni ekran": jedan niski red. Na Androidu otvara sistemski prozor za instalaciju,
 * inače list odozdo s koracima za taj telefon. Ne prikazuje se na računaru ni kad je već dodana.
 */
export function InstallApp({ dismissible = false, className }: { dismissible?: boolean; className?: string }) {
  const [mode, setMode] = useState<Mode>("hidden");
  const sheet = useRef<HTMLDialogElement>(null);

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
    if (mode !== "prompt" || !deferred) return sheet.current?.showModal();
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
    <>
      <div className={cx("flex items-center gap-3 rounded-lg border border-line bg-panel py-2 pl-2.5 pr-2 shadow-panel", className)}>
        {/* eslint-disable-next-line @next/next/no-img-element -- mala statična ikona, kao na početnom ekranu */}
        <img src="/icons/icon-192.png" alt="" width={36} height={36} className="size-9 shrink-0 rounded-[8px] border border-line" />
        <div className="min-w-0 flex-1 leading-tight">
          <div className="truncate text-[14px] font-semibold tracking-[-0.01em]">KSKS na početnom ekranu</div>
          <div className="truncate text-[12px] text-fg-muted">Otvaraj kao aplikaciju</div>
        </div>
        <button
          type="button"
          onClick={install}
          className="h-8 shrink-0 rounded-md bg-brand px-3 text-[13px] font-semibold text-brand-ink transition-transform active:scale-[0.97]"
        >
          {mode === "prompt" ? "Dodaj" : "Kako?"}
        </button>
        {dismissible && (
          <button
            type="button"
            onClick={dismiss}
            aria-label="Ne prikazuj više"
            className="grid size-8 shrink-0 place-items-center rounded-md text-fg-faint hover:bg-panel-2 hover:text-fg"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {/* List odozdo s koracima */}
      <dialog
        ref={sheet}
        onClick={(e) => e.target === sheet.current && sheet.current?.close()}
        className="mb-0 mt-auto w-full max-w-none rounded-t-lg border border-b-0 border-line bg-panel p-0 text-fg shadow-pop backdrop:bg-overlay sm:m-auto sm:w-[420px] sm:rounded-lg sm:border-b"
      >
        <div className="px-5 pb-[calc(env(safe-area-inset-bottom)+20px)] pt-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-[19px] font-semibold leading-tight tracking-[-0.02em]">Dodaj na početni ekran</h2>
              <p className="mt-1 text-[14px] text-fg-muted">Tri dodira i KSKS je ikonica na telefonu.</p>
            </div>
            <button type="button" onClick={() => sheet.current?.close()} aria-label="Zatvori" className="-m-2 p-2 text-fg-faint hover:text-fg">
              <X className="size-5" />
            </button>
          </div>

          <ol className="mt-4 divide-y divide-line border-y border-line">
            {mode === "ios" ? (
              <>
                <Step n={1} chip={<Share className="size-[18px] text-blue" strokeWidth={2} />}>
                  Dodirni <b>Podijeli</b> u traci Safarija
                  <span className="block text-[12px] text-fg-faint">Ako ga ne vidiš, prvo dodirni ⋯</span>
                </Step>
                <Step n={2} chip={<SquarePlus className="size-[18px]" strokeWidth={2} />}>
                  Skrolaj i izaberi <b>Dodaj na početni ekran</b>
                </Step>
                <Step n={3} chip={<span className="text-[13px] font-semibold text-blue">Dodaj</span>}>
                  Potvrdi s <b>Dodaj</b> gore desno
                </Step>
              </>
            ) : (
              <>
                <Step n={1} chip={<EllipsisVertical className="size-[18px]" strokeWidth={2} />}>
                  Dodirni meni <b>⋮</b> gore desno
                </Step>
                <Step n={2} chip={<SquarePlus className="size-[18px]" strokeWidth={2} />}>
                  Izaberi <b>Dodaj na početni ekran</b> ili <b>Instaliraj aplikaciju</b>
                </Step>
                <Step n={3} chip={<span className="text-[13px] font-semibold text-blue">Dodaj</span>}>
                  Potvrdi s <b>Dodaj</b>
                </Step>
              </>
            )}
          </ol>

          <button
            type="button"
            onClick={() => sheet.current?.close()}
            className="mt-5 h-11 w-full rounded-lg bg-brand text-[15px] font-semibold text-brand-ink transition-transform active:scale-[0.98]"
          >
            Razumijem
          </button>
        </div>
      </dialog>
    </>
  );
}

function Step({ n, chip, children }: { n: number; chip: ReactNode; children: ReactNode }) {
  return (
    <li className="flex items-center gap-3 py-3 text-[15px] [&_b]:font-semibold">
      <span className="w-4 shrink-0 text-center text-[13px] font-semibold text-fg-faint">{n}</span>
      <span className="min-w-0 flex-1">{children}</span>
      {/* Izgled dugmeta kako ga telefon prikazuje */}
      <span className="grid h-8 min-w-8 shrink-0 place-items-center rounded-md border border-line bg-panel-2 px-1.5">{chip}</span>
    </li>
  );
}

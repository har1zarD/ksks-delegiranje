"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Ellipsis, EllipsisVertical, Menu, Share, SquarePlus, X } from "lucide-react";
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

/**
 * hidden: računar ili već dodana · prompt: Android sistemski prozor za instalaciju
 * ios-*: koraci za iPhone/iPad po pregledniku · android-*: koraci kad sistemski prozor nije dostupan
 */
type Mode = "hidden" | "prompt" | "ios-safari" | "ios-chrome" | "ios-inapp" | "android-chrome" | "android-samsung" | "android-firefox";

function detect(): Mode {
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
  if (standalone) return "hidden";
  const ua = navigator.userAgent;
  if (/iphone|ipad|ipod/i.test(ua) || (ua.includes("Macintosh") && navigator.maxTouchPoints > 1)) {
    // Ugrađeni preglednici (Instagram, Facebook, Messenger, Gmail…) ne mogu dodati na početni ekran
    if (/FBAN|FBAV|FB_IAB|Instagram|Messenger|LinkedInApp|GSA\/|Line\//i.test(ua)) return "ios-inapp";
    if (/CriOS|EdgiOS|FxiOS/i.test(ua)) return "ios-chrome";
    return "ios-safari";
  }
  if (/android/i.test(ua)) {
    if (deferred) return "prompt";
    if (/SamsungBrowser/i.test(ua)) return "android-samsung";
    if (/Firefox/i.test(ua)) return "android-firefox";
    return "android-chrome";
  }
  return "hidden";
}

const TEXT: Record<Exclude<Mode, "hidden">, { title: string; hint: string; action: string }> = {
  prompt: { title: "Instaliraj KSKS aplikaciju", hint: "Ikonica na telefonu, preko cijelog ekrana", action: "Instaliraj" },
  "ios-safari": { title: "Dodaj KSKS na početni ekran", hint: "iPhone: Podijeli, pa Dodaj na početni ekran", action: "Kako?" },
  "ios-chrome": { title: "Dodaj KSKS na početni ekran", hint: "iPhone: Podijeli u adresnoj traci", action: "Kako?" },
  "ios-inapp": { title: "Otvori KSKS u Safariju", hint: "Iz ove aplikacije ne može na početni ekran", action: "Kako?" },
  "android-chrome": { title: "Instaliraj KSKS aplikaciju", hint: "Android: meni ⋮, pa Instaliraj aplikaciju", action: "Kako?" },
  "android-samsung": { title: "Instaliraj KSKS aplikaciju", hint: "Samsung Internet: meni ≡, pa Dodaj stranicu na", action: "Kako?" },
  "android-firefox": { title: "Instaliraj KSKS aplikaciju", hint: "Firefox: meni ⋮, pa Instaliraj", action: "Kako?" },
};

/**
 * "Dodaj na početni ekran". Na Androidu otvara sistemski prozor za instalaciju kad ga preglednik nudi,
 * inače list odozdo s koracima za taj telefon i preglednik. Ne prikazuje se na računaru ni kad je već dodana.
 * floating: plutajući prozorčić iznad donje navigacije (unutar aplikacije); bez toga red u sadržaju (prijava).
 */
export function InstallApp({ dismissible = false, floating = false, className }: { dismissible?: boolean; floating?: boolean; className?: string }) {
  const [mode, setMode] = useState<Mode>("hidden");
  const [shown, setShown] = useState(!floating);
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
    // Plutajući se pojavi tek kad se stranica smiri (i kad Android stigne ponuditi instalaciju)
    const timer = floating ? setTimeout(() => setShown(true), 1200) : undefined;
    return () => {
      listeners.delete(update);
      clearTimeout(timer);
    };
  }, [dismissible, floating]);

  if (mode === "hidden") return null;
  const text = TEXT[mode];

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

  const card = (
    // Jedan red: ikonica, naslov i opis (prelama se, ne reže), dugme, zatvaranje
    <div
      className={cx(
        "flex items-center gap-3 rounded-xl border border-line bg-panel py-2.5 pl-2.5 pr-2",
        floating ? "pointer-events-auto shadow-pop" : "shadow-panel",
        !floating && className,
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- mala statična ikona, kao na početnom ekranu */}
      <img src="/icons/icon-192.png" alt="" width={40} height={40} className="size-10 shrink-0 rounded-[9px] border border-line" />
      <div className="min-w-0 flex-1">
        <div className="text-[14px] font-semibold leading-tight tracking-[-0.01em]">{text.title}</div>
        <p className="mt-0.5 text-[12px] leading-snug text-fg-muted">{text.hint}</p>
      </div>
      <button
        type="button"
        onClick={install}
        className="h-10 shrink-0 rounded-md bg-brand px-3.5 text-[13px] font-semibold text-brand-ink transition-[background-color,transform] hover:bg-brand-hover active:scale-[0.97]"
      >
        {text.action}
      </button>
      {dismissible && (
        <button
          type="button"
          onClick={dismiss}
          aria-label="Ne prikazuj više"
          className="-ml-2 -mr-1 grid size-10 shrink-0 place-items-center rounded-md text-fg-faint hover:bg-panel-2 hover:text-fg"
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  );

  return (
    <>
      {floating ? (
        <div
          role="region"
          aria-label="Instalacija aplikacije"
          className={cx(
            "pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+72px)] z-20 px-4 transition-[opacity,translate] duration-300 ease-out md:bottom-6 md:left-auto md:right-6 md:w-[400px] md:px-0 print:hidden",
            shown ? "translate-y-0 opacity-100" : "invisible translate-y-3 opacity-0",
            className,
          )}
        >
          <div className="mx-auto max-w-md">{card}</div>
        </div>
      ) : (
        card
      )}

      {/* List odozdo s koracima */}
      <dialog
        ref={sheet}
        onClick={(e) => e.target === sheet.current && sheet.current?.close()}
        className="mb-0 mt-auto w-full max-w-none rounded-t-lg border border-b-0 border-line bg-panel p-0 text-fg shadow-pop backdrop:bg-overlay sm:m-auto sm:w-[420px] sm:rounded-lg sm:border-b"
      >
        <div className="px-5 pb-[calc(env(safe-area-inset-bottom)+20px)] pt-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-[19px] font-semibold leading-tight tracking-[-0.02em]">
                {mode === "ios-inapp" ? "Otvori u Safariju" : mode.startsWith("ios") ? "Dodaj na početni ekran" : "Instaliraj aplikaciju"}
              </h2>
              <p className="mt-1 text-[14px] text-fg-muted">
                {mode === "ios-inapp"
                  ? "Aplikacija u kojoj si otvorio link ne može dodati KSKS na početni ekran."
                  : mode.startsWith("ios")
                    ? "Tri dodira i KSKS je ikonica na iPhoneu."
                    : "Tri dodira i KSKS je ikonica na Android telefonu."}
              </p>
            </div>
            <button type="button" onClick={() => sheet.current?.close()} aria-label="Zatvori" className="-m-2.5 shrink-0 rounded-md p-2.5 text-fg-faint transition-colors hover:bg-panel-2 hover:text-fg">
              <X className="size-5" />
            </button>
          </div>

          <ol className="mt-4 divide-y divide-line border-y border-line">
            <Steps mode={mode} />
          </ol>

          {mode.startsWith("ios") && mode !== "ios-inapp" && (
            <p className="mt-3 text-[12px] text-fg-faint">Na engleskom telefonu: Share, pa Add to Home Screen.</p>
          )}

          <button
            type="button"
            onClick={() => sheet.current?.close()}
            className="mt-5 h-11 w-full rounded-lg bg-brand text-[15px] font-semibold text-brand-ink transition-[background-color,transform] hover:bg-brand-hover active:scale-[0.98]"
          >
            Razumijem
          </button>
        </div>
      </dialog>
    </>
  );
}

const AddChip = <span className="text-[13px] font-semibold text-blue">Dodaj</span>;

function Steps({ mode }: { mode: Mode }) {
  switch (mode) {
    case "ios-safari":
      return (
        <>
          <Step n={1} chip={<Share className="size-[18px] text-blue" strokeWidth={2} />}>
            Dodirni <b>Podijeli</b> u traci Safarija
            <span className="block text-[12px] text-fg-faint">Ako ga ne vidiš, prvo dodirni ⋯ dolje desno</span>
          </Step>
          <Step n={2} chip={<SquarePlus className="size-[18px]" strokeWidth={2} />}>
            Skrolaj i izaberi <b>Dodaj na početni ekran</b>
            <span className="block text-[12px] text-fg-faint">Ako ga nema na listi, dodirni Više</span>
          </Step>
          <Step n={3} chip={AddChip}>
            Potvrdi s <b>Dodaj</b> gore desno
          </Step>
        </>
      );
    case "ios-chrome":
      return (
        <>
          <Step n={1} chip={<Share className="size-[18px] text-blue" strokeWidth={2} />}>
            Dodirni <b>Podijeli</b> desno u adresnoj traci
            <span className="block text-[12px] text-fg-faint">Ili meni ⋯ dolje desno, pa Podijeli</span>
          </Step>
          <Step n={2} chip={<SquarePlus className="size-[18px]" strokeWidth={2} />}>
            Izaberi <b>Dodaj na početni ekran</b>
          </Step>
          <Step n={3} chip={AddChip}>
            Potvrdi s <b>Dodaj</b> gore desno
          </Step>
        </>
      );
    case "ios-inapp":
      return (
        <>
          <Step n={1} chip={<Ellipsis className="size-[18px]" strokeWidth={2} />}>
            Dodirni meni <b>⋯</b> u ovoj aplikaciji
            <span className="block text-[12px] text-fg-faint">Obično gore ili dolje desno</span>
          </Step>
          <Step n={2} chip={<span className="text-[13px] font-semibold text-blue">Safari</span>}>
            Izaberi <b>Otvori u Safariju</b> ili <b>Otvori u pregledniku</b>
          </Step>
          <Step n={3} chip={<Share className="size-[18px] text-blue" strokeWidth={2} />}>
            U Safariju: <b>Podijeli</b>, pa <b>Dodaj na početni ekran</b>
          </Step>
        </>
      );
    case "android-samsung":
      return (
        <>
          <Step n={1} chip={<Menu className="size-[18px]" strokeWidth={2} />}>
            Dodirni meni <b>≡</b> dolje desno
          </Step>
          <Step n={2} chip={<SquarePlus className="size-[18px]" strokeWidth={2} />}>
            Izaberi <b>Dodaj stranicu na</b>, pa <b>Početni ekran</b>
          </Step>
          <Step n={3} chip={AddChip}>
            Potvrdi s <b>Dodaj</b>
          </Step>
        </>
      );
    case "android-firefox":
      return (
        <>
          <Step n={1} chip={<EllipsisVertical className="size-[18px]" strokeWidth={2} />}>
            Dodirni meni <b>⋮</b>
          </Step>
          <Step n={2} chip={<SquarePlus className="size-[18px]" strokeWidth={2} />}>
            Izaberi <b>Instaliraj</b> ili <b>Dodaj na početni ekran</b>
          </Step>
          <Step n={3} chip={AddChip}>
            Potvrdi s <b>Dodaj</b>
          </Step>
        </>
      );
    default:
      return (
        <>
          <Step n={1} chip={<EllipsisVertical className="size-[18px]" strokeWidth={2} />}>
            Dodirni meni <b>⋮</b> gore desno
          </Step>
          <Step n={2} chip={<SquarePlus className="size-[18px]" strokeWidth={2} />}>
            Izaberi <b>Instaliraj aplikaciju</b> ili <b>Dodaj na početni ekran</b>
          </Step>
          <Step n={3} chip={<span className="text-[13px] font-semibold text-blue">Instaliraj</span>}>
            Potvrdi s <b>Instaliraj</b>
          </Step>
        </>
      );
  }
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

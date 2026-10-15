"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useSyncExternalStore, type FormEvent } from "react";
import { Button } from "@/components/ui";

/*
  Potvrda u KSKS prozoru umjesto window.confirm (koji browser prikazuje na vrhu, sa svojim izgledom).
  Jedan <ConfirmHost /> u root layoutu; bilo koja komponenta poziva confirm(...) i čeka odgovor.
*/

export type ConfirmOptions = {
  title: string;
  message?: string;
  /** Natpis dugmeta za potvrdu (podrazumijevano "Potvrdi") */
  confirmLabel?: string;
  /** danger: nepovratna radnja, crveno dugme i fokus na "Odustani" */
  tone?: "default" | "danger";
};

type Request = ConfirmOptions & { resolve: (ok: boolean) => void };

let current: Request | null = null;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function emit() {
  for (const l of listeners) l();
}

function settle(ok: boolean) {
  const r = current;
  current = null;
  emit();
  r?.resolve(ok);
}

/** Otvara prozor za potvrdu; true kad korisnik potvrdi */
export function confirm(options: ConfirmOptions): Promise<boolean> {
  current?.resolve(false);
  return new Promise((resolve) => {
    current = { ...options, resolve };
    emit();
  });
}

/** onSubmit forme: traži potvrdu, pa šalje formu s istim dugmetom (zbog name/value) */
export function confirmSubmit(options: ConfirmOptions | ((form: HTMLFormElement) => ConfirmOptions)) {
  return (e: FormEvent<HTMLFormElement>) => {
    const form = e.currentTarget;
    if (form.dataset.confirmed) {
      delete form.dataset.confirmed;
      return;
    }
    e.preventDefault();
    const submitter = (e.nativeEvent as SubmitEvent).submitter;
    void confirm(typeof options === "function" ? options(form) : options).then((ok) => {
      if (!ok) return;
      form.dataset.confirmed = "1";
      form.requestSubmit(submitter);
    });
  };
}

export function ConfirmHost() {
  const req = useSyncExternalStore(subscribe, () => current, () => null);
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const messageId = useId();

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (req && !d.open) d.showModal();
    if (!req && d.open) d.close();
  }, [req]);

  const danger = req?.tone === "danger";

  return (
    <dialog
      ref={dialog}
      aria-labelledby={titleId}
      aria-describedby={req?.message ? messageId : undefined}
      // Esc i klik pored prozora = odustani
      onCancel={(e) => {
        e.preventDefault();
        settle(false);
      }}
      onClick={(e) => e.target === dialog.current && settle(false)}
      className="m-auto w-[min(400px,calc(100vw-32px))] rounded-lg border border-line bg-panel p-0 text-fg shadow-pop backdrop:bg-overlay backdrop:backdrop-blur-[2px]"
    >
      {req && (
        <div className="pop-in flex flex-col items-center px-5 pb-5 pt-6 text-center sm:px-6 sm:pb-6 sm:pt-7">
          <Image src="/brand/ksks-logo.svg" alt="KSKS" width={52} height={52} className="mb-4" />
          <h2 id={titleId} className="font-display text-[19px] font-semibold leading-snug tracking-[-0.02em]">
            {req.title}
          </h2>
          {req.message && (
            <p id={messageId} className="mt-2 max-w-[34ch] text-[14px] leading-relaxed text-fg-muted">
              {req.message}
            </p>
          )}
          <div className="mt-6 grid w-full grid-cols-2 gap-2">
            <Button type="button" variant="secondary" autoFocus={danger} onClick={() => settle(false)}>
              Odustani
            </Button>
            <Button type="button" variant={danger ? "danger" : "primary"} autoFocus={!danger} onClick={() => settle(true)}>
              {req.confirmLabel ?? "Potvrdi"}
            </Button>
          </div>
        </div>
      )}
    </dialog>
  );
}

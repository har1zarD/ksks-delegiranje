"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarDays, ChevronRight, Trash2 } from "lucide-react";
import type { SavedSocialSchedule } from "@/lib/data/admin";
import { formatDate, formatTime, isoToSarajevo } from "@/lib/format";
import { Button, ButtonLink, CARD, cx, Empty } from "@/components/ui";
import { deleteSocialSchedule } from "./actions";

/** Sačuvani rasporedi: otvori (nastavi praviti, i sa drugog uređaja), brisanje u dva klika */
export function SavedSchedules({ saved }: { saved: SavedSocialSchedule[] }) {
  const router = useRouter();
  const [confirm, setConfirm] = useState<string | null>(null);
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();

  if (saved.length === 0) {
    return (
      <Empty icon={<CalendarDays />} title="Nema sačuvanih rasporeda" action={<ButtonLink href="/admin/objave?vrsta=raspored&r=novi">Novi raspored</ButtonLink>}>
        Napravi raspored i sačuvaj ga. Ostaje ovdje, pa ga možeš otvoriti i nastaviti kad god treba — i sa drugog uređaja.
      </Empty>
    );
  }

  const remove = (id: string) =>
    start(async () => {
      setError(undefined);
      const res = await deleteSocialSchedule(id);
      if (res.error) setError(res.error);
      setConfirm(null);
      router.refresh();
    });

  return (
    <div className="flex flex-col gap-3">
      <ButtonLink href="/admin/objave?vrsta=raspored&r=novi" className="self-start">
        Novi raspored
      </ButtonLink>
      {error && <p className="text-[13px] font-medium text-crest">{error}</p>}
      <ul className={cx(CARD, "divide-y divide-line overflow-hidden")}>
        {saved.map((s) => {
          const { date } = isoToSarajevo(s.updatedAt);
          return (
            <li key={s.id} className="flex items-center gap-2 pr-2 sm:pr-3">
              <Link href={`/admin/objave?vrsta=raspored&r=${s.id}`} className="flex min-w-0 flex-1 items-center gap-3.5 px-4 py-3.5 hover:bg-panel-2/60">
                <span className="grid size-11 shrink-0 place-items-center rounded-lg border border-line bg-panel-2 text-fg-muted">
                  <CalendarDays className="size-5" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-semibold">{s.title}</span>
                  <span className="block truncate text-[13px] text-fg-muted">
                    izmijenjeno {formatDate(date)} u {formatTime(s.updatedAt)}{s.updatedBy ? ` · ${s.updatedBy}` : ""}
                  </span>
                </span>
                <ChevronRight className="size-4 shrink-0 text-fg-faint" aria-hidden="true" />
              </Link>
              {confirm === s.id ? (
                <Button variant="danger" className="h-9 px-3 sm:h-9" disabled={pending} onClick={() => remove(s.id)} onBlur={() => setConfirm(null)} autoFocus>
                  Obriši?
                </Button>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirm(s.id)}
                  className="grid size-9 shrink-0 place-items-center rounded-md text-fg-muted hover:bg-crest/[0.06] hover:text-crest"
                  aria-label="Obriši raspored"
                  title="Obriši"
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

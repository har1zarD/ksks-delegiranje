"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, ScrollText, Trash2 } from "lucide-react";
import type { SavedBulletin } from "@/lib/bulletin";
import { formatDate, formatTime, isoToSarajevo } from "@/lib/format";
import { Button, ButtonLink, CARD, cx, Empty } from "@/components/ui";
import { deleteBulletin } from "./actions";

/** Sačuvani bilteni: otvori (nastavi pisati), brisanje u dva klika */
export function SavedBulletins({ bulletins, competitions }: { bulletins: SavedBulletin[]; competitions: { id: string; shortName: string }[] }) {
  const router = useRouter();
  const [confirm, setConfirm] = useState<string | null>(null);
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();

  if (bulletins.length === 0) {
    return (
      <Empty icon={<ScrollText />} title="Nema sačuvanih biltena" action={<ButtonLink href="/admin/bilteni?b=novi">Novi bilten</ButtonLink>}>
        Napiši bilten i sačuvaj ga. Ostaje ovdje, pa ga možeš otvoriti i prepraviti kad god treba.
      </Empty>
    );
  }

  const short = (ids: string[]) => ids.map((id) => competitions.find((c) => c.id === id)?.shortName).filter(Boolean).join(", ");
  const remove = (id: string) =>
    start(async () => {
      setError(undefined);
      const res = await deleteBulletin(id);
      if (res.error) setError(res.error);
      setConfirm(null);
      router.refresh();
    });

  return (
    <div className="flex flex-col gap-3">
      {error && <p className="text-[13px] font-medium text-crest">{error}</p>}
      <ul className={cx(CARD, "divide-y divide-line overflow-hidden")}>
        {bulletins.map((b) => {
          const { date } = isoToSarajevo(b.updatedAt);
          return (
            <li key={b.id} className="flex items-center gap-2 pr-2 sm:pr-3">
              <Link href={`/admin/bilteni?b=${b.id}`} className="flex min-w-0 flex-1 items-center gap-3.5 px-4 py-3.5 hover:bg-panel-2/60">
                <span className="scoreboard grid size-11 shrink-0 place-items-center rounded-lg border border-line bg-panel-2 text-[17px] font-semibold">{b.number || "—"}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-semibold">
                    {b.number ? `Bilten br. ${b.number}` : "Bilten"} · {b.title}
                  </span>
                  <span className="block truncate text-[13px] text-fg-muted">
                    {[b.round ? `${b.round}. kolo` : null, short(b.competitionIds), `izmijenjeno ${formatDate(date)} u ${formatTime(b.updatedAt)}${b.updatedBy ? ` · ${b.updatedBy}` : ""}`]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </span>
                <ChevronRight className="size-4 shrink-0 text-fg-faint" aria-hidden="true" />
              </Link>
              {confirm === b.id ? (
                <Button variant="danger" className="h-9 px-3 sm:h-9" disabled={pending} onClick={() => remove(b.id)} onBlur={() => setConfirm(null)} autoFocus>
                  Obriši?
                </Button>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirm(b.id)}
                  className="grid size-9 shrink-0 place-items-center rounded-md text-fg-muted hover:bg-crest/[0.06] hover:text-crest"
                  aria-label="Obriši bilten"
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

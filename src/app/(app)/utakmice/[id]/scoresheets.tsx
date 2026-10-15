"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { Camera, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { confirm } from "@/components/confirm";
import { buttonClass, cx } from "@/components/ui";
import type { Scoresheet } from "@/lib/scoresheets";
import { createScoresheetUpload, deleteScoresheet } from "./actions";

const BUCKET = "scoresheets";
/** Duža strana slike nakon smanjenja: zapisnik ostaje čitljiv, a upload s mobitela brz */
const MAX_SIDE = 2400;

/** Slike s utakmice (zapisnik, statistika…), nisu obavezne: sličice veličine dugmeta (dodir otvara punu veličinu), dodavanje s kamere ili iz galerije, brisanje */
export function Scoresheets({ matchId, sheets, canEdit }: { matchId: string; sheets: Scoresheet[]; canEdit: boolean }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  async function upload(files: FileList) {
    setError(null);
    const supabase = createClient();
    let i = 0;
    for (const file of Array.from(files)) {
      setBusy(files.length > 1 ? `Šaljem ${++i}/${files.length}…` : "Šaljem…");
      const blob = await shrink(file);
      const ticket = await createScoresheetUpload(matchId, blob.type);
      if (ticket.error || !ticket.path || !ticket.token) {
        setError(ticket.error ?? "Upload nije pripremljen.");
        break;
      }
      const { error } = await supabase.storage.from(BUCKET).uploadToSignedUrl(ticket.path, ticket.token, blob, { contentType: blob.type });
      if (error) {
        setError("Slika nije poslana. Provjeri internet i pokušaj ponovo.");
        break;
      }
    }
    setBusy(null);
    if (input.current) input.current.value = "";
    startTransition(() => router.refresh());
  }

  async function remove(path: string) {
    if (!(await confirm({ title: "Obrisati sliku?", confirmLabel: "Obriši", tone: "danger" }))) return;
    startTransition(async () => {
      const r = await deleteScoresheet(matchId, path);
      if (r.error) setError(r.error);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        {canEdit && (
          <label className={cx(buttonClass("secondary"), "cursor-pointer", busy && "pointer-events-none opacity-60")}>
            <Camera className="size-4" />
            {busy ?? (sheets.length ? "Dodaj još" : "Dodaj sliku")}
            <input
              ref={input}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="sr-only"
              disabled={Boolean(busy)}
              onChange={(e) => e.target.files?.length && upload(e.target.files)}
            />
          </label>
        )}
        {sheets.length > 0 ? (
          // Sličice visine dugmeta, desno od njega
          <ul className="flex flex-wrap items-center gap-2">
            {sheets.map((s, i) => (
              <li key={s.path} className="relative size-11 shrink-0 sm:size-10">
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener"
                  className="block size-full overflow-hidden rounded-md border border-line-strong bg-panel-2 transition-opacity hover:opacity-85"
                  aria-label={`Slika ${i + 1}: otvori u punoj veličini`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- privremeni potpisani link iz Storagea */}
                  <img src={s.url} alt={`Slika ${i + 1}`} className="size-full object-cover" />
                </a>
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => remove(s.path)}
                    aria-label={`Obriši sliku ${i + 1}`}
                    className="absolute -right-1.5 -top-1.5 grid size-5 place-items-center rounded-full border border-line bg-panel text-crest shadow-panel after:absolute after:-inset-2 hover:bg-panel-2"
                  >
                    <X className="size-3" strokeWidth={2.5} />
                  </button>
                )}
              </li>
            ))}
          </ul>
        ) : (
          !canEdit && <p className="text-[14px] text-fg-muted">Nema dodanih slika.</p>
        )}
      </div>
      {error && (
        <p role="alert" className="text-[14px] font-medium text-crest">
          {error}
        </p>
      )}
    </div>
  );
}

/** Smanji fotografiju na MAX_SIDE (JPEG); ako preglednik ne može, šalje se original */
async function shrink(file: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size < 1_500_000) return file;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
    return blob ?? file;
  } catch {
    return file;
  }
}

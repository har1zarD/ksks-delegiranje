"use client";

import { startTransition, useActionState, useEffect, useState } from "react";
import { Camera, Check, UserPlus } from "lucide-react";
import { Select } from "@/components/select";
import { Button, buttonClass, cx, Field } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { addLicense, createLicensePhotoUpload, type LicenseState } from "../actions";
import { LICENSE_POSITIONS, LICENSE_ROLES } from "../options";

const BUCKET = "licenses";
/** Duža strana fotografije nakon smanjenja: dovoljno za karticu i PDF, a upload s mobitela brz */
const MAX_SIDE = 800;

/** Nova licenca u folderu kluba: fotografija ide direktno u Storage, pa se čuva licenca s putanjom */
export function LicenseForm({ competitionId, clubId }: { competitionId: string; clubId: string }) {
  const [kind, setKind] = useState<"player" | "official">("player");
  const [state, action, pending] = useActionState<LicenseState, FormData>(async (prev, fd) => {
    const file = fd.get("photo");
    fd.delete("photo");
    if (file instanceof File && file.size > 0) {
      const blob = await shrink(file);
      const ticket = await createLicensePhotoUpload(clubId, blob.type);
      if (ticket.error || !ticket.path || !ticket.token) return { ...prev, error: ticket.error ?? "Upload fotografije nije pripremljen." };
      const { error } = await createClient().storage.from(BUCKET).uploadToSignedUrl(ticket.path, ticket.token, blob, { contentType: blob.type });
      if (error) return { ...prev, error: "Fotografija nije poslana. Provjeri internet i pokušaj ponovo." };
      fd.set("photo_path", ticket.path);
    }
    return addLicense(prev, fd);
  }, {});
  const player = kind === "player";

  return (
    <form
      key={state.ok}
      // onSubmit umjesto action: kod greške polja ostaju popunjena (forma se prazni samo nakon uspjeha, preko key)
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => action(fd));
      }}
      className="flex flex-col gap-4"
    >
      <input type="hidden" name="competition_id" value={competitionId} />
      <input type="hidden" name="club_id" value={clubId} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Select label="Vrsta" name="kind" value={kind} onChange={(e) => setKind(e.target.value === "official" ? "official" : "player")}>
          <option value="player">Igrač</option>
          <option value="official">Službeno lice</option>
        </Select>
        <Field label="Prezime" name="last_name" required autoComplete="off" />
        <Field label="Ime" name="first_name" required autoComplete="off" />
        {player ? (
          <>
            <Field label="Datum rođenja" name="birth_date" placeholder="11.02.1996" inputMode="decimal" autoComplete="off" />
            <Field label="Mjesto rođenja" name="birth_place" autoComplete="off" />
            <Field label="Visina (cm)" name="height_cm" type="number" inputMode="numeric" min={100} max={250} />
            <Select label="Pozicija" name="position" defaultValue="">
              <option value="">Nije upisana</option>
              {LICENSE_POSITIONS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </Select>
          </>
        ) : (
          <Select label="Funkcija" name="role" defaultValue={LICENSE_ROLES[0]}>
            {LICENSE_ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </Select>
        )}
        <Field label="Br. licence" name="license_no" hint="Može i kasnije" autoComplete="off" />
        <PhotoInput />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending} className="w-full sm:w-auto">
          <UserPlus className="size-4" aria-hidden="true" />
          {pending ? "Čuvam…" : player ? "Dodaj igrača" : "Dodaj službeno lice"}
        </Button>
        {state.error ? (
          <p role="alert" className="text-[14px] text-crest">
            {state.error}
          </p>
        ) : (
          state.ok !== undefined && (
            <p className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-mint">
              <Check className="size-4" /> Dodano
            </p>
          )
        )}
      </div>
    </form>
  );
}

/** Izbor fotografije (kamera ili galerija) sa sličicom */
function PhotoInput() {
  const [preview, setPreview] = useState<string | null>(null);
  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <span className="text-[13px] font-medium text-fg-muted">Fotografija</span>
      <label className={cx(buttonClass("secondary"), "cursor-pointer justify-start")}>
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element -- lokalni pregled izabranog fajla
          <img src={preview} alt="" className="size-7 rounded object-cover" />
        ) : (
          <Camera className="size-4" aria-hidden="true" />
        )}
        {preview ? "Promijeni fotografiju" : "Izaberi fotografiju"}
        <input
          type="file"
          name="photo"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            setPreview(file ? URL.createObjectURL(file) : null);
          }}
        />
      </label>
    </div>
  );
}

async function shrink(file: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size < 500_000) return file;
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

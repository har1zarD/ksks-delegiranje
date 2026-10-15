"use client";

import { useActionState } from "react";
import { Check, Mail, Phone } from "lucide-react";
import { Button, cx, Field } from "@/components/ui";
import { saveClubContacts, type ClubState } from "./actions";

/** Kontakti jednog kluba: email adrese (klub, trener…) i telefon; čuva se po klubu */
export function ClubForm({ clubId, email, phone, youth }: { clubId: string; email: string | null; phone: string | null; youth: boolean }) {
  const [state, action, pending] = useActionState<ClubState, FormData>(saveClubContacts, {});

  return (
    <form action={action} className="grid grid-cols-1 items-end gap-3 sm:grid-cols-[minmax(0,1fr)_12rem_auto]">
      <input type="hidden" name="club_id" value={clubId} />
      <Field
        label="Email (klub, trener…)"
        name="email"
        type="text"
        inputMode="email"
        autoComplete="off"
        placeholder="klub@primjer.ba, trener@primjer.ba"
        defaultValue={email ?? ""}
        icon={<Mail />}
      />
      <Field label="Telefon" name="phone" type="tel" autoComplete="off" placeholder="061 000 000" defaultValue={phone ?? ""} icon={<Phone />} />
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? "Čuvam…" : state.saved ? (
          <>
            <Check className="size-4 text-mint" /> Sačuvano
          </>
        ) : (
          "Sačuvaj"
        )}
      </Button>
      {/* Omladinska liga: samo označeni klubovi dobijaju raspored i izmjene utakmica */}
      <label className="flex cursor-pointer items-center gap-2.5 text-[14px] sm:col-span-3">
        <input type="checkbox" name="youth" value="1" defaultChecked={youth} className="size-[18px] accent-[var(--brand)]" />
        <span className="font-medium">Omladinska liga</span>
        <span className="text-fg-muted">prima raspored i izmjene utakmica</span>
      </label>
      {/* Uputa ispod cijelog reda, da polja i dugme ostanu u istoj liniji */}
      <p className={cx("text-[13px] sm:col-span-3", state.error ? "font-medium text-crest" : "text-fg-muted")} role={state.error ? "alert" : undefined}>
        {state.error ?? "Više adresa odvoji zarezom. Na sve ide raspored utakmica."}
      </p>
    </form>
  );
}

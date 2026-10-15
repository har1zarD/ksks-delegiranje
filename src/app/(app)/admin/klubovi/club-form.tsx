"use client";

import { useActionState } from "react";
import { Check, Mail, Phone } from "lucide-react";
import { Button, Field } from "@/components/ui";
import { saveClubContacts, type ClubState } from "./actions";

/** Kontakti jednog kluba: email adrese (klub, trener…) i telefon; čuva se po klubu */
export function ClubForm({ clubId, email, phone }: { clubId: string; email: string | null; phone: string | null }) {
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
        hint="Više adresa odvoji zarezom. Na sve ide raspored utakmica."
        icon={<Mail />}
      />
      <Field label="Telefon" name="phone" type="tel" autoComplete="off" placeholder="061 000 000" defaultValue={phone ?? ""} icon={<Phone />} />
      <Button type="submit" variant="secondary" disabled={pending} className="sm:mb-5">
        {pending ? "Čuvam…" : state.saved ? (
          <>
            <Check className="size-4 text-mint" /> Sačuvano
          </>
        ) : (
          "Sačuvaj"
        )}
      </Button>
      {state.error && (
        <p role="alert" className="text-[13px] font-medium text-crest sm:col-span-3">
          {state.error}
        </p>
      )}
    </form>
  );
}

"use client";

import { useActionState, useState } from "react";
import { Button, cx, Field, Select } from "@/components/ui";
import type { Role } from "@/lib/auth";
import { addPerson, updatePerson, type PersonState } from "./actions";

export type PersonValues = {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  license: string | null;
  role: Role;
  is_referee: boolean;
  is_table: boolean;
};

export const ROLE_LABEL: Record<Role, string> = {
  official: "Sudija / zapisnički sto",
  commissioner: "Komesar",
  admin: "Admin (savez)",
};

export function PersonForm({ person, onDone }: { person?: PersonValues; onDone?: () => void }) {
  const [state, action, pending] = useActionState<PersonState, FormData>(
    async (prev, formData) => {
      const next = await (person ? updatePerson : addPerson)(prev, formData);
      if (!next.error) onDone?.();
      return next;
    },
    {},
  );
  const [role, setRole] = useState<Role>(person?.role ?? "official");

  return (
    <form key={state.ok} action={action} className="grid gap-4 sm:grid-cols-2">
      {person && <input type="hidden" name="id" value={person.id} />}
      <Field label="Ime i prezime" name="full_name" defaultValue={person?.full_name} autoComplete="off" required />
      <Field
        label="Email za prijavu"
        name="email"
        type="email"
        defaultValue={person?.email}
        disabled={Boolean(person)}
        required={!person}
        hint={person ? "Email se ne mijenja." : undefined}
      />
      <Field label="Telefon" name="phone" type="tel" inputMode="tel" defaultValue={person?.phone ?? ""} />
      <Field label="Licenca" name="license" defaultValue={person?.license ?? ""} placeholder="Npr. A, B" />

      <Select label="Uloga" name="role" value={role} onChange={(e) => setRole(e.target.value as Role)}>
        {(Object.keys(ROLE_LABEL) as Role[]).map((r) => (
          <option key={r} value={r}>
            {ROLE_LABEL[r]}
          </option>
        ))}
      </Select>
      {role === "official" && (
        <fieldset className="flex flex-col gap-1.5">
          <legend className="pb-1.5 text-[13px] font-medium text-fg-muted">Šta radi</legend>
          <div className="flex gap-2">
            <Check name="is_referee" label="Sudija" defaultChecked={person?.is_referee ?? true} />
            <Check name="is_table" label="Zapisnički sto" defaultChecked={person?.is_table} />
          </div>
        </fieldset>
      )}

      <div className="flex flex-col gap-3 sm:col-span-2 sm:flex-row sm:items-center">
        <Button type="submit" disabled={pending} className="w-full sm:w-auto">
          {pending ? "Čuvam…" : person ? "Sačuvaj izmjene" : "Dodaj osobu"}
        </Button>
        {onDone && (
          <Button type="button" variant="secondary" onClick={onDone} className="w-full sm:w-auto">
            Odustani
          </Button>
        )}
        {state.error && (
          <p role="alert" className="text-[14px] text-crest">
            {state.error}
          </p>
        )}
      </div>
    </form>
  );
}

function Check({ name, label, defaultChecked }: { name: string; label: string; defaultChecked?: boolean }) {
  return (
    <label
      className={cx(
        "flex h-12 flex-1 cursor-pointer items-center gap-2.5 rounded-md bg-panel-2 px-3.5 text-[15px] font-semibold sm:h-11",
        "has-[:checked]:ring-2 has-[:checked]:ring-brand",
      )}
    >
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="size-4 accent-[var(--brand)]" />
      {label}
    </label>
  );
}

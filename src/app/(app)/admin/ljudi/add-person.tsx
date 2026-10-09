"use client";

import { useState } from "react";
import { UserPlus } from "lucide-react";
import { Button, Panel } from "@/components/ui";
import { PersonForm } from "./person-form";

/** "Dodaj osobu": dugme otvara formu u panelu */
export function AddPerson() {
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} className="w-full sm:w-auto sm:self-start">
        <UserPlus className="size-4" /> Dodaj osobu
      </Button>
    );
  }
  return (
    <Panel className="py-4 sm:py-6">
      <h2 className="pb-1 font-display text-[24px] font-semibold">Nova osoba</h2>
      <p className="pb-5 text-[14px] text-fg-muted">Prijavljuje se emailom i zajedničkom početnom šifrom, a šifru mijenja u Postavkama.</p>
      <PersonForm onDone={() => setOpen(false)} />
    </Panel>
  );
}

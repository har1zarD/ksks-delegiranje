"use client";

import { useState } from "react";
import { Pencil, Phone } from "lucide-react";
import { cx } from "@/components/ui";
import { TABLE_SKILLS } from "@/lib/crew";
import { setActive } from "./actions";
import { PersonForm, type PersonValues } from "./person-form";

/** Mala dugmad u redu (buttonClass je prevelik: h-11/px-4 se ne mogu pregaziti manjim klasama) */
const SMALL = "inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-md text-[13px] font-semibold transition-colors active:scale-[0.98]";
const SECONDARY = "border border-line-strong bg-panel text-fg shadow-panel hover:border-line-hover hover:bg-panel-2";

export function PersonRow({ person, active, isMe }: { person: PersonValues; active: boolean; isMe: boolean }) {
  const [editing, setEditing] = useState(false);
  const roles = [
    person.is_referee && "Sudija",
    person.is_table &&
      (person.table_skills.length >= TABLE_SKILLS.length
        ? "Zapisnički sto"
        : `Sto: ${TABLE_SKILLS.filter((s) => person.table_skills.includes(s.key)).map((s) => s.label.toLowerCase()).join(", ")}`),
    (person.role === "commissioner" || person.is_commissioner) && "Komesar",
    person.role === "admin" && "Admin",
    person.license && `Licenca ${person.license}`,
  ].filter(Boolean) as string[];

  if (editing) {
    return (
      <li className="py-5">
        <div className="mb-4 font-display text-[20px] font-semibold leading-tight">{person.full_name}</div>
        <PersonForm person={person} onDone={() => setEditing(false)} />
      </li>
    );
  }

  return (
    <li className="flex items-center gap-3 py-2.5">
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="group/name flex min-w-0 flex-1 items-center gap-3 text-left"
        aria-label={`Uredi: ${person.full_name}`}
      >
        <span aria-hidden="true" className={cx("grid size-8 shrink-0 place-items-center rounded-md border border-line bg-panel-2 text-[11px] font-semibold text-fg-muted", !active && "opacity-50")}>{person.full_name.trim().split(/\s+/).filter(Boolean).map((part) => Array.from(part)[0]).slice(0, 2).join("")}</span>
        <span className="min-w-0 flex-1">
          <span className={cx("block truncate text-[15px] font-semibold leading-tight underline-offset-4 group-hover/name:underline", !active && "text-fg-faint")}>
            {person.full_name}
            {!active && <span className="ml-2 text-[12px] font-semibold text-fg-faint">neaktivan</span>}
          </span>
          {roles.length > 0 && <span className="block truncate text-[12px] text-fg-muted">{roles.join(", ")}</span>}
        </span>
      </button>
      <div className="flex shrink-0 items-center gap-1.5">
        <button type="button" onClick={() => setEditing(true)} className={cx(SMALL, "px-2.5", SECONDARY)}>
          <Pencil className="size-3.5" />
          <span className="hidden sm:inline">Uredi</span>
          <span className="sr-only sm:hidden">Uredi {person.full_name}</span>
        </button>
        {person.phone && (
          <a
            href={`tel:${person.phone}`}
            className={cx(SMALL, "w-8", SECONDARY)}
            aria-label={`Pozovi ${person.full_name}, ${person.phone}`}
            title={person.phone}
          >
            <Phone className="size-3.5" />
          </a>
        )}
        {!isMe && (
          <form action={setActive}>
            <input type="hidden" name="id" value={person.id} />
            <input type="hidden" name="active" value={active ? "0" : "1"} />
            <button type="submit" className={cx(SMALL, "px-2.5", active ? SECONDARY : "bg-brand text-brand-ink shadow-panel hover:bg-brand-hover")}>
              {active ? "Deaktiviraj" : "Aktiviraj"}
            </button>
          </form>
        )}
      </div>
    </li>
  );
}

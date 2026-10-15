"use client";

import { useState } from "react";
import { Phone } from "lucide-react";
import { buttonClass, cx } from "@/components/ui";
import { TABLE_SKILLS } from "@/lib/crew";
import { setActive } from "./actions";
import { PersonForm, type PersonValues } from "./person-form";

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
  const details = [person.email, ...roles].join(", ");

  if (editing) {
    return (
      <li className="py-5">
        <div className="mb-4 font-display text-[20px] font-semibold leading-tight">{person.full_name}</div>
        <PersonForm person={person} onDone={() => setEditing(false)} />
      </li>
    );
  }

  return (
    <li className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center">
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="group/name flex min-w-0 flex-1 items-center gap-3 text-left"
        aria-label={`Uredi: ${person.full_name}`}
      >
        <span aria-hidden="true" className={cx("grid size-10 shrink-0 place-items-center rounded-lg border border-line bg-panel-2 text-[12px] font-semibold text-fg-muted", !active && "opacity-50")}>{person.full_name.trim().split(/\s+/).filter(Boolean).map((part) => Array.from(part)[0]).slice(0, 2).join("")}</span>
        <span className="min-w-0 flex-1">
          <span className={cx("block truncate text-[16px] font-semibold leading-tight underline-offset-4 group-hover/name:underline", !active && "text-fg-faint")}>
            {person.full_name}
            {!active && <span className="ml-2 text-[13px] font-semibold text-fg-faint">neaktivan</span>}
          </span>
          <span className="block truncate text-[13px] text-fg-muted">{details}</span>
        </span>
      </button>
      <div className="flex flex-wrap items-center gap-2 pl-13 sm:pl-0">
        {person.phone && (
          <a href={`tel:${person.phone}`} className={buttonClass("secondary", "h-10 px-3")} aria-label={`Pozovi ${person.full_name}`}>
            <Phone className="size-4" />
            <span className="tabular">{person.phone}</span>
          </a>
        )}
        {!isMe && (
          <form action={setActive}>
            <input type="hidden" name="id" value={person.id} />
            <input type="hidden" name="active" value={active ? "0" : "1"} />
            <button type="submit" className={buttonClass(active ? "secondary" : "primary", "h-10 px-3")}>
              {active ? "Deaktiviraj" : "Aktiviraj"}
            </button>
          </form>
        )}
      </div>
    </li>
  );
}

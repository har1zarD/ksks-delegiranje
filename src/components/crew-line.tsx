import type { CrewSlot } from "@/lib/data/admin";
import { ASSIGNMENT_STATUS_LABEL, positionName } from "@/lib/format";
import { cx } from "@/components/ui";

/** Boja tačke: prihvaćeno, čeka odgovor, odbijeno/otkazano; bez osobe = nedostaje */
function dotClass(slot: CrewSlot) {
  if (!slot.name) return "bg-orange";
  if (slot.status === "accepted") return "bg-mint";
  if (slot.status === "pending") return "bg-amber";
  return "bg-crest";
}

/**
 * Ekipa utakmice u jednom redu, za listu: svaka pozicija s imenom delegiranog i tačkom stanja
 * (zeleno prihvatio, žuto čeka, crveno odbio), ili "nedostaje" ako niko nije delegiran. Admin vidi ko šta radi bez otvaranja utakmice.
 */
export function CrewLine({ slots, digital }: { slots: CrewSlot[]; digital?: boolean | null }) {
  if (slots.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-x-3.5 gap-y-1 text-[13px] text-fg-muted">
      {slots.map((s) => (
        <li
          key={s.position}
          className="inline-flex min-w-0 max-w-full items-center gap-1.5"
          title={s.name ? `${s.name}: ${ASSIGNMENT_STATUS_LABEL[s.status!]}` : "Niko nije delegiran"}
        >
          <span className={cx("size-2 shrink-0 rounded-full", dotClass(s))} aria-hidden />
          <span className="shrink-0 text-fg-faint">{positionName(s.position, digital)}</span>
          {s.name ? <span className="truncate font-medium text-fg">{s.name}</span> : <span className="font-medium text-orange">nedostaje</span>}
        </li>
      ))}
    </ul>
  );
}

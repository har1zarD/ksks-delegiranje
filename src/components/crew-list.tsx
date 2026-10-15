import { Phone } from "lucide-react";
import type { Crew as Assigned } from "@/lib/data/official";
import { crewOf, crewPositions } from "@/lib/crew";
import { ASSIGNMENT_STATUS_LABEL, positionName, POSITION_ORDER, type Position } from "@/lib/format";
import { Bone, Text, times } from "@/components/skeleton";
import { cx } from "@/components/ui";

type CrewMatch = Parameters<typeof crewOf>[0];

/**
 * Ekipa službenih lica utakmice: svaka pozicija koju utakmica traži (sudije, komesar, zapisnik, vrijeme, 24/14, statistika)
 * s imenom delegiranog ili "Još nije određeno". Preko cijele širine kartice; `bare` = kartica sadrži samo ekipu (bez gornje linije).
 */
export function CrewList({ match, crew, mine, bare }: { match: CrewMatch; crew: Assigned; mine?: Position; bare?: boolean }) {
  const byPosition = new Map(crew.map((c) => [c.position, c]));
  const positions = [...new Set([...crewPositions(crewOf(match)), ...byPosition.keys()])].sort(
    (a, b) => POSITION_ORDER.indexOf(a) - POSITION_ORDER.indexOf(b),
  );
  if (positions.length === 0) return null;
  return (
    // Ćelije imaju svoju podlogu i razmak, a 1px razmak između njih daje liniju
    <ul className={cx("-mx-4 grid gap-px bg-line sm:-mx-6 sm:grid-cols-2 sm:[&>li:last-child:nth-child(odd)]:col-span-2", !bare && "border-t border-line")}>
      {positions.map((position) => {
        const c = byPosition.get(position);
        const me = position === mine;
        return (
          <li key={position} className="flex min-h-14 items-center gap-3 bg-panel px-4 py-2.5 sm:px-6">
            <div className="min-w-0 flex-1">
              <div className="text-[12px] font-semibold text-fg-faint">{positionName(position, match.digital_scoresheet)}</div>
              {me ? (
                <div className="flex items-center gap-2 text-[15px] font-semibold text-fg">
                  <span className="truncate">{c?.name ?? "Ti"}</span>
                  {/* Oznaka prijavljenog korisnika uz njegovo ime, uočljiva na prvi pogled */}
                  <span className="shrink-0 rounded-md bg-brand-soft px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-brand">Ti</span>
                </div>
              ) : c ? (
                <div className="flex items-center gap-2 text-[15px] font-semibold text-fg" title={ASSIGNMENT_STATUS_LABEL[c.status]}>
                  {/* Tačka stanja: zeleno prihvatio, žuto čeka odgovor */}
                  <span className={cx("size-2 shrink-0 rounded-full", c.status === "accepted" ? "bg-mint" : "bg-amber")} aria-hidden />
                  <span className="truncate">{c.name}</span>
                  {c.status === "pending" && <span className="shrink-0 text-[12px] font-medium text-fg-faint">čeka odgovor</span>}
                </div>
              ) : (
                <div className="truncate text-[15px] font-medium text-fg-faint">Još nije određeno</div>
              )}
            </div>
            {c?.phone && !me && (
              <a
                href={`tel:${c.phone}`}
                className="grid size-11 shrink-0 place-items-center rounded-md text-brand hover:bg-panel-2"
                aria-label={`Pozovi: ${c.name}`}
                title={c.phone}
              >
                <Phone className="size-5" strokeWidth={1.9} />
              </a>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function CrewListSkeleton({ bare }: { bare?: boolean }) {
  return (
    <ul className={cx("-mx-4 grid gap-px bg-line sm:-mx-6 sm:grid-cols-2", !bare && "border-t border-line")}>
      {times(4, (j) => (
        <li key={j} className="flex min-h-14 items-center gap-3 bg-panel px-4 py-2.5 sm:px-6">
          <div className="min-w-0 flex-1">
            <Text className="text-[12px] font-semibold" w="w-20" />
            <Text className="text-[15px] font-semibold" w={j % 2 ? "w-28" : "w-36"} />
          </div>
          {/* "Ti" nema dugme za poziv */}
          {j !== 1 && (
            <span className="grid size-11 shrink-0 place-items-center">
              <Bone className="size-5" />
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

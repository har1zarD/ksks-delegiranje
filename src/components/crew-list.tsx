import { ChevronDown, Phone } from "lucide-react";
import type { Crew as Assigned } from "@/lib/data/official";
import { crewOf, crewPositions } from "@/lib/crew";
import { ASSIGNMENT_STATUS_LABEL, positionName, POSITION_ORDER, type Position } from "@/lib/format";
import { Bone, Text, times } from "@/components/skeleton";
import { cx } from "@/components/ui";

type CrewMatch = Parameters<typeof crewOf>[0];

/**
 * Ekipa službenih lica utakmice: svaka pozicija koju utakmica traži (sudije, komesar, zapisnik, vrijeme, 24/14, statistika)
 * s imenom delegiranog ili "Još nije određeno". Preko cijele širine kartice; `bare` = kartica sadrži samo ekipu (bez gornje linije).
 * `collapsible` = zatvoreno po defaultu, umjesto pune liste stoji jednolinijski sažetak imena (liste utakmica na mobitelu).
 */
export function CrewList({ match, crew, mine, bare, collapsible }: { match: CrewMatch; crew: Assigned; mine?: Position; bare?: boolean; collapsible?: boolean }) {
  const byPosition = new Map(crew.map((c) => [c.position, c]));
  const positions = [...new Set([...crewPositions(crewOf(match)), ...byPosition.keys()])].sort(
    (a, b) => POSITION_ORDER.indexOf(a) - POSITION_ORDER.indexOf(b),
  );
  if (positions.length === 0) return null;

  // Ćelije imaju svoju podlogu i razmak, a 1px razmak između njih daje liniju; 2 kolone od telefona na dalje da ekipa ne vuče toliko skrola
  const list = (
    <ul className={cx("-mx-4 grid grid-cols-2 gap-px bg-line [&>li:last-child:nth-child(odd)]:col-span-2 sm:-mx-6", !bare && !collapsible && "border-t border-line")}>
      {positions.map((position) => {
        const c = byPosition.get(position);
        const me = position === mine;
        return (
          <li key={position} className="flex min-h-12 items-center gap-2.5 bg-panel px-3 py-2 sm:min-h-14 sm:gap-3 sm:px-6 sm:py-2.5">
            <div className="min-w-0 flex-1">
              <div className="truncate text-[12px] font-semibold text-fg-faint">{positionName(position, match.digital_scoresheet)}</div>
              {me ? (
                <div className="flex items-center gap-2 text-[14px] font-semibold text-fg sm:text-[15px]">
                  <span className="truncate">{c?.name ?? "Ti"}</span>
                  {/* Oznaka prijavljenog korisnika uz njegovo ime, uočljiva na prvi pogled */}
                  <span className="shrink-0 rounded-md bg-brand-soft px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-brand">Ti</span>
                </div>
              ) : c ? (
                <div className="flex items-center gap-1.5 text-[14px] font-semibold text-fg sm:gap-2 sm:text-[15px]" title={ASSIGNMENT_STATUS_LABEL[c.status]}>
                  {/* Tačka stanja: zeleno prihvatio, žuto čeka odgovor */}
                  <span className={cx("size-2 shrink-0 rounded-full", c.status === "accepted" ? "bg-mint" : "bg-amber")} aria-hidden />
                  <span className="truncate">{c.name}</span>
                  {c.status === "pending" && <span className="hidden shrink-0 text-[12px] font-medium text-fg-faint sm:inline">čeka odgovor</span>}
                </div>
              ) : (
                <div className="truncate text-[14px] font-medium text-fg-faint sm:text-[15px]">Još nije određeno</div>
              )}
            </div>
            {c?.phone && !me && (
              <a
                href={`tel:${c.phone}`}
                className="grid size-9 shrink-0 place-items-center rounded-md text-brand hover:bg-panel-2 sm:size-11"
                aria-label={`Pozovi: ${c.name}`}
                title={c.phone}
              >
                <Phone className="size-4 sm:size-5" strokeWidth={1.9} />
              </a>
            )}
          </li>
        );
      })}
    </ul>
  );

  if (!collapsible) return list;

  // Sažetak reda: imena ekipe ("Ti" za mene), zatvoreno po defaultu da kartica na mobitelu ne vuče skrol
  const names = positions.map((position) => (position === mine ? "Ti" : byPosition.get(position)?.name)).filter((n): n is string => !!n);
  const summary = names.length > 0 ? names.join(", ") : "Još nije određeno";

  return (
    <details className="group border-t border-line">
      <summary className="-mx-4 flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-2.5 transition-colors hover:bg-panel-2 sm:-mx-6 sm:px-6 [&::-webkit-details-marker]:hidden">
        <span className="min-w-0 truncate text-[13px] text-fg-muted">{summary}</span>
        <ChevronDown className="size-4 shrink-0 text-fg-faint transition-transform group-open:rotate-180" />
      </summary>
      {list}
    </details>
  );
}

export function CrewListSkeleton({ bare, collapsible }: { bare?: boolean; collapsible?: boolean }) {
  if (collapsible) {
    return (
      <div className="flex min-h-10 items-center gap-2 border-t border-line py-2.5">
        <Text className="text-[13px]" w="w-48" />
      </div>
    );
  }
  return (
    <ul className={cx("-mx-4 grid grid-cols-2 gap-px bg-line sm:-mx-6", !bare && "border-t border-line")}>
      {times(4, (j) => (
        <li key={j} className="flex min-h-12 items-center gap-2.5 bg-panel px-3 py-2 sm:min-h-14 sm:gap-3 sm:px-6 sm:py-2.5">
          <div className="min-w-0 flex-1">
            <Text className="text-[12px] font-semibold" w="w-20" />
            <Text className="text-[14px] font-semibold sm:text-[15px]" w={j % 2 ? "w-28" : "w-36"} />
          </div>
          {/* "Ti" nema dugme za poziv */}
          {j !== 1 && (
            <span className="grid size-9 shrink-0 place-items-center sm:size-11">
              <Bone className="size-4 sm:size-5" />
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

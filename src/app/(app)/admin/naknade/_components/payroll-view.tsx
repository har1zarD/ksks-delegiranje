import Link from "next/link";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { formatKM, formatMonth, matchesLabel, shiftMonth, type PayrollPerson } from "@/lib/finance";
import { formatDayMonth, POSITION_LABEL } from "@/lib/format";
import { cx } from "@/components/ui";

/** Biranje mjeseca: ‹ naziv › */
export function MonthPicker({ month, basePath }: { month: string; basePath: string }) {
  const link = (m: string) => `${basePath}?mjesec=${m}`;
  const arrow = "grid size-10 place-items-center rounded-md text-fg-muted hover:bg-panel-2 hover:text-fg";
  return (
    <div className="inline-flex items-center gap-1">
      <Link href={link(shiftMonth(month, -1))} className={arrow} aria-label="Prethodni mjesec">
        <ChevronLeft className="size-5" />
      </Link>
      <span className="min-w-40 text-center font-display text-[20px] font-semibold capitalize">{formatMonth(month)}</span>
      <Link href={link(shiftMonth(month, 1))} className={arrow} aria-label="Sljedeći mjesec">
        <ChevronRight className="size-5" />
      </Link>
    </div>
  );
}

export function PayrollItems({ person }: { person: PayrollPerson }) {
  return (
    <ul className="divide-y divide-line">
      {person.items.map((i) => (
        <li key={`${i.matchId}-${i.position}`} className="flex items-center gap-3 py-3 text-[14px]">
          <span className="scoreboard whitespace-nowrap w-12 shrink-0 text-[18px] font-semibold text-fg-muted">{formatDayMonth(i.startsAt)}</span>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-semibold">{i.teams}</span>
            <span className="block truncate text-[13px] text-fg-muted">
              {i.competition}, {POSITION_LABEL[i.position].toLowerCase()}
              {i.position.startsWith("referee") && (i.refereeCount === 3 ? " (trojka)" : " (dvojka)")}
            </span>
          </span>
          <span className={cx("scoreboard whitespace-nowrap shrink-0 text-right text-[18px] font-semibold", i.amount == null && "text-[14px] font-semibold text-orange")}>
            {i.amount == null ? "nije određeno" : formatKM(i.amount)}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function PayrollTable({ people }: { people: PayrollPerson[] }) {
  const total = people.reduce((s, p) => s + p.total, 0);
  const matches = people.reduce((s, p) => s + p.items.length, 0);
  return (
    <div className="rounded-lg border border-line bg-panel px-4 sm:px-5">
      <div className="flex items-end justify-between gap-4 border-b border-line py-4 sm:py-6">
        <div>
          <div className="text-[13px] font-semibold text-fg-muted">Ukupno za isplatu</div>
          <div className="text-[13px] text-fg-faint">
            {people.length} osoba, {matches} angažmana
          </div>
        </div>
        <div className="scoreboard whitespace-nowrap text-[28px] font-semibold leading-none sm:text-[32px]">{formatKM(total)}</div>
      </div>
      <ul className="divide-y divide-line">
        {people.map((p) => (
          <li key={p.profileId}>
            <details className="group">
              <summary className="-mx-3 px-3 rounded-md flex cursor-pointer list-none items-center gap-3 py-4 hover:bg-panel-2 [&::-webkit-details-marker]:hidden">
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{p.name}</span>
                  <span className="block text-[13px] text-fg-muted">
                    {matchesLabel(p.items.length)}
                    {p.missing > 0 && <span className="text-orange">, {p.missing} bez cijene</span>}
                  </span>
                </span>
                <span className="scoreboard whitespace-nowrap text-[22px] font-semibold">{formatKM(p.total)}</span>
                <ChevronDown className="size-5 text-fg-faint transition-transform group-open:rotate-180" />
              </summary>
              <div className="pl-4">
                <PayrollItems person={p} />
              </div>
            </details>
          </li>
        ))}
      </ul>
    </div>
  );
}

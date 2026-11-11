import { TeamName } from "@/components/team-name";
import { formatScore } from "@/lib/quarter-points";
import type { StandingRow } from "@/lib/standings";
import { cx } from "@/components/ui";

const NUM = "scoreboard whitespace-nowrap px-1.5 py-3 text-right text-[18px] font-semibold sm:px-2";

/** Tabela takmičenja. Na mobitelu se kriju porazi i postignuti/primljeni koševi. */
export function StandingsTable({ rows }: { rows: (StandingRow & { logoUrl: string | null })[] }) {
  return (
    <div className="overflow-hidden rounded-lg border border-line bg-panel shadow-panel">
      <table className="w-full">
        <caption className="sr-only">Tabela takmičenja: plasman, odigrane utakmice, pobjede, porazi, koš razlika i bodovi.</caption>
        <thead>
          <tr className="border-b border-line bg-panel-2 text-left text-[12px] font-semibold text-fg-muted">
            <th className="w-12 py-3 pl-4 font-semibold sm:pl-5">#</th>
            <th className="py-3 pr-2 font-semibold">Ekipa</th>
            <th className="w-9 py-3 pr-1.5 text-right font-semibold sm:w-12" title="Utakmice">U</th>
            <th className="w-9 py-3 pr-1.5 text-right font-semibold sm:w-12" title="Pobjede">P</th>
            <th className="hidden w-12 py-3 pr-2 text-right font-semibold sm:table-cell" title="Porazi">I</th>
            <th className="hidden w-16 py-3 pr-2 text-right font-semibold md:table-cell" title="Postignuti koševi">K+</th>
            <th className="hidden w-16 py-3 pr-2 text-right font-semibold md:table-cell" title="Primljeni koševi">K−</th>
            <th className="w-12 py-3 pr-1.5 text-right font-semibold sm:w-16" title="Koš razlika">+/−</th>
            <th className="w-12 py-3 pr-4 text-right font-semibold sm:w-16 sm:pr-5" title="Bodovi">B</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((r, i) => {
            const rank = i + 1;
            return (
              <tr key={r.teamId} className={cx("transition-colors hover:bg-panel-2", rank === 1 && "bg-brand-soft/60")}>
                <td className="py-3 pl-4 pr-2 sm:pl-5">
                  <span className={cx("scoreboard whitespace-nowrap text-[20px] font-semibold", rank === 1 ? "text-brand" : rank <= 3 ? "text-fg" : "text-fg-faint")}>{rank}</span>
                </td>
                <td className="max-w-0 truncate py-3 pr-2 font-display text-[18px] font-semibold max-sm:[&>span>[aria-hidden]]:w-8 sm:text-[20px]"><TeamName name={r.name} logoUrl={r.logoUrl} /></td>
                <td className={cx(NUM, "text-fg-muted")}>{r.played}</td>
                <td className={NUM}>{r.won}</td>
                <td className={cx(NUM, "hidden text-fg-muted sm:table-cell")}>{r.lost}</td>
                <td className={cx(NUM, "hidden text-fg-muted md:table-cell")}>{formatScore(r.pointsFor)}</td>
                <td className={cx(NUM, "hidden text-fg-muted md:table-cell")}>{formatScore(r.pointsAgainst)}</td>
                <td className={cx(NUM, r.diff > 0 ? "text-mint" : r.diff < 0 ? "text-crest" : "text-fg-muted")}>
                  {r.diff > 0 ? `+${formatScore(r.diff)}` : formatScore(r.diff)}
                </td>
                <td className={cx(NUM, "pr-4 text-[22px] sm:pr-5", rank === 1 ? "text-brand" : "text-fg")}>{formatScore(r.points)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

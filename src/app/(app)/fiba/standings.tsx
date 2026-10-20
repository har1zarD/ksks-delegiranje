import type { FibaStandingRow } from "@/lib/fiba-stats";
import { cx } from "@/components/ui";
import { FormDots, STICKY, TABLE_WRAP, TD, TH, TeamLink } from "./ui";

const pct = new Intl.NumberFormat("bs-BA", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/**
 * Tabela kategorije kao na EuroLeague / ABA ligi: plasman, utakmice, pobjede, porazi, procenat, koševi,
 * razlika, bodovi, domaćin/gost, zadnjih 5 i niz. Na telefonu ostaju plasman, ekipa, U, P, I, +/− i B (ostalo skrol).
 */
export function FibaStandings({ rows, category, season, logos, highlight }: {
  rows: FibaStandingRow[];
  category: string;
  season?: string | null;
  logos: Record<string, string | null>;
  /** Ekipa koja se ističe (stranica ekipe) */
  highlight?: string;
}) {
  return (
    <div className={TABLE_WRAP}>
      <table className="w-full min-w-[720px] border-collapse">
        <caption className="sr-only">Tabela: plasman, utakmice, pobjede, porazi, procenat pobjeda, koševi, koš razlika, bodovi, domaćin, gost, forma i niz.</caption>
        <thead className="border-b border-line bg-panel-2">
          <tr>
            <th className={cx(TH, STICKY, "w-[min(52vw,260px)] bg-panel-2 pl-4 text-left sm:w-auto sm:pl-5")}>Ekipa</th>
            <th className={TH} title="Utakmice">U</th>
            <th className={TH} title="Pobjede">P</th>
            <th className={TH} title="Porazi">I</th>
            <th className={TH} title="Procenat pobjeda">%</th>
            <th className={TH} title="Postignuti koševi">K+</th>
            <th className={TH} title="Primljeni koševi">K−</th>
            <th className={TH} title="Koš razlika">+/−</th>
            <th className={TH} title="Bodovi (pobjeda 2, poraz 1)">B</th>
            <th className={TH} title="Kod kuće">Dom.</th>
            <th className={TH} title="U gostima">Gost</th>
            <th className={cx(TH, "text-left")} title="Zadnjih 5 utakmica">Forma</th>
            <th className={cx(TH, "pr-4 sm:pr-5")} title="Niz pobjeda (P) ili poraza (I)">Niz</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((r, i) => {
            const rank = i + 1;
            const own = highlight === r.teamId;
            return (
              <tr key={r.teamId} className={cx("group transition-colors hover:bg-panel-2", own && "bg-panel-2")}>
                <td className={cx(STICKY, "py-2.5 pl-4 pr-2 group-hover:bg-panel-2 sm:pl-5", own && "bg-panel-2")}>
                  <span className="flex min-w-0 items-center gap-2.5">
                    <span className={cx("scoreboard w-5 shrink-0 text-right text-[15px] font-semibold", rank <= 4 ? "text-fg" : "text-fg-faint")}>{rank}</span>
                    <TeamLink category={category} season={season} name={r.name} logo={logos[r.name] ?? null} className="text-[15px] font-semibold" />
                  </span>
                </td>
                <td className={cx(TD, "text-fg-muted")}>{r.played}</td>
                <td className={cx(TD, "font-semibold")}>{r.won}</td>
                <td className={TD}>{r.lost}</td>
                <td className={cx(TD, "text-fg-muted")}>{r.played ? pct.format((r.won / r.played) * 100) : "–"}</td>
                <td className={cx(TD, "text-fg-muted")}>{r.pointsFor}</td>
                <td className={cx(TD, "text-fg-muted")}>{r.pointsAgainst}</td>
                <td className={cx(TD, r.diff > 0 ? "text-mint" : r.diff < 0 ? "text-crest" : "text-fg-muted")}>{r.diff > 0 ? `+${r.diff}` : r.diff}</td>
                <td className={cx(TD, "text-[16px] font-bold")}>{r.points}</td>
                <td className={cx(TD, "text-fg-muted")}>{r.home.won}–{r.home.lost}</td>
                <td className={cx(TD, "text-fg-muted")}>{r.away.won}–{r.away.lost}</td>
                <td className="px-2 py-2.5"><FormDots form={r.form} /></td>
                <td className={cx(TD, "pr-4 font-semibold sm:pr-5", r.streak?.startsWith("P") ? "text-mint" : "text-crest")}>{r.streak ?? "–"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

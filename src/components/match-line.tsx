import { TeamName, type TeamIdentity } from "@/components/team-name";
import { MapPin } from "lucide-react";
import { cx } from "@/components/ui";
import { formatTime, isoToSarajevo, matchKindLabel, matchNo, MONTHS_SHORT, periodShort, WEEKDAYS, type MatchKind } from "@/lib/format";

export type PeriodScore = { period: number; home_points: number; away_points: number };

export type MatchSummary = {
  number?: number;
  kind?: MatchKind;
  kind_label?: string | null;
  starts_at: string;
  round: number | null;
  home_score: number | null;
  away_score: number | null;
  competition: { short_name: string | null; name: string } | null;
  home: TeamIdentity | null;
  away: TeamIdentity | null;
  hall: { name: string } | null;
};

/** List kalendara: dan u sedmici, veliki broj, mjesec; ispod crte vrijeme. `lg` za zaglavlje utakmice, `selected` = označen (puna boja). */
export function DateTile({ iso, size = "md", selected, className }: { iso: string; size?: "md" | "lg"; selected?: boolean; className?: string }) {
  const { date } = isoToSarajevo(iso);
  const d = new Date(`${date}T12:00:00Z`);
  const lg = size === "lg";
  const label = cx("font-semibold uppercase leading-none tracking-[0.1em]", selected ? "text-brand-ink/65" : "text-fg-faint", lg ? "text-[11px]" : "text-[10px]");
  return (
    <div
      className={cx(
        "flex shrink-0 flex-col overflow-hidden rounded-lg border text-center transition-colors",
        selected ? "border-brand bg-brand text-brand-ink" : "border-line",
        lg ? "w-[76px] sm:w-[92px]" : "w-14",
        className,
      )}
    >
      <div className={cx("flex flex-col items-center", !selected && "bg-panel-2", lg ? "gap-1.5 py-2.5 sm:gap-2 sm:py-3" : "gap-1 py-2")}>
        <span className={label}>{WEEKDAYS[d.getUTCDay()]}</span>
        <span className={cx("scoreboard font-semibold leading-none tracking-[-0.03em]", lg ? "text-[32px] sm:text-[42px]" : "text-[24px]")}>{d.getUTCDate()}</span>
        <span className={label}>{MONTHS_SHORT[d.getUTCMonth()]}</span>
      </div>
      <span
        className={cx(
          "scoreboard whitespace-nowrap border-t font-semibold",
          selected ? "border-brand-ink/20" : "border-line bg-panel",
          lg ? "py-1.5 text-[15px] sm:text-[16px]" : "py-1 text-[13px]",
        )}
      >
        {formatTime(iso)}
      </span>
    </div>
  );
}

/** Uvijek 4 četvrtine, pa produžeci koji postoje */
export function periodColumns(periods: PeriodScore[]) {
  const max = Math.max(4, ...periods.map((p) => p.period));
  return Array.from({ length: max }, (_, i) => periods.find((p) => p.period === i + 1) ?? { period: i + 1, home_points: null, away_points: null });
}

/** "Utakmica 3, Liga, 2. kolo" + oznaka vrste (Turnir, Prijateljska) */
export function MatchLabel({ match }: { match: MatchSummary }) {
  return (
    <>
      {match.number != null && <span className="whitespace-nowrap text-fg-muted">{matchNo(match.number)}, </span>}
      <span className="whitespace-nowrap">
        {match.competition?.short_name ?? match.competition?.name}
        {match.round ? `, ${match.round}. kolo` : ""}
      </span>
      {matchKindLabel(match.kind, match.kind_label) && <KindTag>{matchKindLabel(match.kind, match.kind_label)}</KindTag>}
    </>
  );
}

/**
 * Utakmica u redu liste: datum lijevo, ekipe jedna ispod druge.
 * `showScore` = ukupni rezultat desno; `periods` = box score (Q1–Q4, produžeci) + ukupno.
 */
export function MatchLine({
  match,
  meta,
  badge,
  showScore,
  periods,
  aside,
  hideDate,
  hideLabelOnMobile,
}: {
  match: MatchSummary;
  /** Broj i takmičenje se na telefonu crtaju izvan reda (npr. u jezičku kartice) */
  hideLabelOnMobile?: boolean;
  /** Datum se crta izvan reda (npr. kao dugme za označavanje) */
  hideDate?: boolean;
  meta?: React.ReactNode;
  /** Stanje uz naziv takmičenja (npr. Uživo) */
  badge?: React.ReactNode;
  showScore?: boolean;
  periods?: PeriodScore[];
  aside?: React.ReactNode;
}) {
  const competition = <MatchLabel match={match} />;
  const hall = match.hall && (
    <div className="mt-1 flex items-center gap-1 truncate text-[13px] text-fg-muted">
      <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
      <span className="truncate">{match.hall.name}</span>
    </div>
  );

  if (periods) {
    return (
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-2 sm:gap-x-4">
        {!hideDate && <DateTile iso={match.starts_at} />}
        <div className="min-w-0 flex-1 basis-40">
          <BoxScore match={match} periods={periods} label={competition} badge={badge} />
          {hall}
          {meta && <div className="mt-2 text-[14px]">{meta}</div>}
        </div>
        {aside && <div className="min-w-0 self-center sm:ml-auto sm:shrink-0">{aside}</div>}
      </div>
    );
  }

  const score = showScore && match.home_score != null;
  const homeWon = score && match.home_score! > match.away_score!;
  const awayWon = score && match.away_score! > match.home_score!;

  return (
    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-2 sm:gap-x-4">
      {!hideDate && <DateTile iso={match.starts_at} />}
      <div className="min-w-0 flex-1 basis-40">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[12px] font-semibold text-fg-faint">
          <span className={cx("min-w-0 max-w-full truncate", hideLabelOnMobile && "max-sm:hidden")}>{competition}</span>
          {badge}
        </div>
        <div className={cx("mt-1 grid items-center gap-x-3 gap-y-1", score ? "grid-cols-[1fr_auto]" : "grid-cols-1")}>
          <span className={cx("truncate text-[17px] font-semibold leading-snug tracking-[-0.02em]", score && !homeWon && "text-fg-muted")}>
            <TeamName name={match.home?.name ?? "—"} logoUrl={match.home?.club?.logo_url} />
          </span>
          {score && <span className={cx("scoreboard whitespace-nowrap text-[22px] font-semibold leading-tight", homeWon ? "text-brand" : "text-fg-muted")}>{match.home_score}</span>}
          <span className={cx("truncate text-[17px] font-semibold leading-snug tracking-[-0.02em]", score && !awayWon && "text-fg-muted")}>
            <TeamName name={match.away?.name ?? "—"} logoUrl={match.away?.club?.logo_url} />
          </span>
          {score && <span className={cx("scoreboard whitespace-nowrap text-[22px] font-semibold leading-tight", awayWon ? "text-brand" : "text-fg-muted")}>{match.away_score}</span>}
        </div>
        {hall}
        {meta && <div className="mt-2 text-[14px]">{meta}</div>}
      </div>
      {aside && <div className="min-w-0 self-center sm:ml-auto sm:shrink-0">{aside}</div>}
    </div>
  );
}

/**
 * Box score: red po ekipi, kolone po četvrtini, ukupno desno (vodeća ekipa u akcentu).
 * `size="lg"` za zaglavlje utakmice.
 */
export function BoxScore({
  match,
  periods,
  label,
  badge,
  size = "sm",
}: {
  match: Pick<MatchSummary, "home" | "away" | "home_score" | "away_score">;
  periods: PeriodScore[];
  label?: React.ReactNode;
  badge?: React.ReactNode;
  size?: "sm" | "lg";
}) {
  const cols = periodColumns(periods);
  const home = match.home_score ?? 0;
  const away = match.away_score ?? 0;
  const lg = size === "lg";
  const team = cx("truncate font-semibold tracking-[-0.02em]", lg ? "text-[17px] sm:text-[20px]" : "text-[16px] sm:text-[17px]");
  const quarter = cx("scoreboard text-center", lg ? "text-[15px] sm:text-[17px]" : "text-[13px] sm:text-[14px]");
  const total = cx("scoreboard text-right font-semibold leading-none", lg ? "text-[30px] sm:text-[40px]" : "text-[22px]");
  const head = "text-center text-[11px] font-semibold text-fg-faint";

  // U listi (sm) naziv utakmice i stanje stoje u zaglavlju tabele, u ravni s Q1–Uk.; na stranici utakmice (lg) iznad tabele
  const heading = (label || badge) && (
    <span className={cx("flex min-w-0 items-center gap-x-2.5 text-[12px] font-semibold text-fg-faint", lg && "mb-3 flex-wrap gap-y-1")}>
      {label && <span className="min-w-0 max-w-full truncate">{label}</span>}
      {badge && <span className="shrink-0">{badge}</span>}
    </span>
  );

  return (
    <div>
      {lg && heading}
      <div className="overflow-x-auto">
      <div
        style={{ "--n": cols.length } as React.CSSProperties}
        className={cx(
          "grid min-w-[340px] items-center gap-x-1 sm:min-w-0 sm:gap-x-2",
          lg
            ? "grid-cols-[minmax(0,1fr)_repeat(var(--n),1.75rem)_3.25rem] gap-y-1.5 sm:grid-cols-[minmax(0,1fr)_repeat(var(--n),3.5rem)_5rem]"
            : "grid-cols-[minmax(0,1fr)_repeat(var(--n),1.5rem)_2.5rem] gap-y-0.5 sm:grid-cols-[minmax(0,1fr)_repeat(var(--n),2.75rem)_3.5rem]",
        )}
      >
        {!lg && heading ? heading : <span aria-hidden />}
        {cols.map((c) => (
          <span key={c.period} className={head}>
            {periodShort(c.period)}
          </span>
        ))}
        <span className={cx(head, "text-right")}>Uk.</span>

      {(["home", "away"] as const).map((side) => {
        const points = side === "home" ? home : away;
        const other = side === "home" ? away : home;
        const leads = points > other;
        const key = side === "home" ? "home_points" : "away_points";
        return [
          <span key={`${side}-name`} className={cx(team, !leads && points !== other && "text-fg-muted")}>
            <TeamName name={match[side]?.name ?? "—"} logoUrl={match[side]?.club?.logo_url} />
          </span>,
          ...cols.map((c) => {
            const v = c[key];
            const won = v != null && v > (side === "home" ? c.away_points ?? 0 : c.home_points ?? 0);
            return (
              <span key={`${side}-${c.period}`} className={cx(quarter, v == null ? "text-line-strong" : won ? "font-semibold text-fg" : "text-fg-muted")}>
                {v ?? "–"}
              </span>
            );
          }),
          <span key={`${side}-total`} className={cx(total, leads || points === other ? "text-fg" : "text-fg-faint")}>
            {points}
          </span>,
        ];
      })}
      </div>
      </div>
    </div>
  );
}

/** Vrsta utakmice koja nije liga (Prijateljska, Turnir, vlastiti naziv) */
export function KindTag({ children }: { children: React.ReactNode }) {
  return (
    <span className="ml-1.5 inline-flex items-center whitespace-nowrap rounded-md border border-line-strong px-1.5 py-px align-middle text-[11px] font-semibold text-fg-muted">
      {children}
    </span>
  );
}

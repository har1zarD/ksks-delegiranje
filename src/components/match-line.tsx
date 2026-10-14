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
  home: { name: string } | null;
  away: { name: string } | null;
  hall: { name: string } | null;
};

/** Datum: dan u sedmici, veliki broj, mjesec; vrijeme u akcent boji */
export function DateTile({ iso, className }: { iso: string; className?: string }) {
  const { date } = isoToSarajevo(iso);
  const d = new Date(`${date}T12:00:00Z`);
  return (
    <div className={cx("flex w-12 shrink-0 flex-col items-center", className)}>
      <span className="text-[11px] font-semibold text-fg-faint">{WEEKDAYS[d.getUTCDay()]}</span>
      <span className="scoreboard whitespace-nowrap text-[24px] font-semibold leading-none">{d.getUTCDate()}</span>
      <span className="text-[11px] font-semibold text-fg-muted">{MONTHS_SHORT[d.getUTCMonth()]}</span>
      <span className="scoreboard mt-1 whitespace-nowrap text-[14px] font-semibold text-brand">{formatTime(iso)}</span>
    </div>
  );
}

/** Uvijek 4 četvrtine, pa produžeci koji postoje */
export function periodColumns(periods: PeriodScore[]) {
  const max = Math.max(4, ...periods.map((p) => p.period));
  return Array.from({ length: max }, (_, i) => periods.find((p) => p.period === i + 1) ?? { period: i + 1, home_points: null, away_points: null });
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
}: {
  match: MatchSummary;
  meta?: React.ReactNode;
  /** Stanje uz naziv takmičenja (npr. Uživo) */
  badge?: React.ReactNode;
  showScore?: boolean;
  periods?: PeriodScore[];
  aside?: React.ReactNode;
}) {
  const competition = (
    <>
      {match.number != null && <span className="whitespace-nowrap text-fg-muted">{matchNo(match.number)}, </span>}
      <span className="whitespace-nowrap">
        {match.competition?.short_name ?? match.competition?.name}
        {match.round ? `, ${match.round}. kolo` : ""}
      </span>
      {matchKindLabel(match.kind, match.kind_label) && <KindTag>{matchKindLabel(match.kind, match.kind_label)}</KindTag>}
    </>
  );
  const hall = match.hall && (
    <div className="mt-1 flex items-center gap-1 truncate text-[13px] text-fg-muted">
      <MapPin className="size-3.5 shrink-0" />
      <span className="truncate">{match.hall.name}</span>
    </div>
  );

  if (periods) {
    return (
      <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
        <DateTile iso={match.starts_at} />
        <div className="min-w-0 flex-1">
          <BoxScore match={match} periods={periods} label={competition} badge={badge} />
          {hall}
          {meta && <div className="mt-2 text-[14px]">{meta}</div>}
        </div>
        {aside && <div className="shrink-0 self-center">{aside}</div>}
      </div>
    );
  }

  const score = showScore && match.home_score != null;
  const homeWon = score && match.home_score! > match.away_score!;
  const awayWon = score && match.away_score! > match.home_score!;

  return (
    <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
      <DateTile iso={match.starts_at} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[12px] font-semibold text-fg-faint">
          <span>{competition}</span>
          {badge}
        </div>
        <div className={cx("mt-0.5 grid items-baseline gap-x-3", score ? "grid-cols-[1fr_auto]" : "grid-cols-1")}>
          <span className={cx("truncate text-[17px] font-semibold leading-snug tracking-[-0.02em]", score && !homeWon && "text-fg-muted")}>
            {match.home?.name}
          </span>
          {score && <span className={cx("scoreboard whitespace-nowrap text-[22px] font-semibold leading-tight", homeWon ? "text-brand" : "text-fg-muted")}>{match.home_score}</span>}
          <span className={cx("truncate text-[17px] font-semibold leading-snug tracking-[-0.02em]", score && !awayWon && "text-fg-muted")}>
            {match.away?.name}
          </span>
          {score && <span className={cx("scoreboard whitespace-nowrap text-[22px] font-semibold leading-tight", awayWon ? "text-brand" : "text-fg-muted")}>{match.away_score}</span>}
        </div>
        {hall}
        {meta && <div className="mt-2 text-[14px]">{meta}</div>}
      </div>
      {aside && <div className="shrink-0 self-center">{aside}</div>}
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

  return (
    <div>
      {(label || badge) && (
        <div className={cx("flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[12px] font-semibold text-fg-faint", lg ? "mb-3" : "mb-1")}>
          {label && <span>{label}</span>}
          {badge}
        </div>
      )}
      <div
        style={{ "--n": cols.length } as React.CSSProperties}
        className={cx(
          "grid items-center gap-x-1 sm:gap-x-2",
          lg
            ? "grid-cols-[minmax(0,1fr)_repeat(var(--n),1.75rem)_3.25rem] gap-y-1.5 sm:grid-cols-[minmax(0,1fr)_repeat(var(--n),3.5rem)_5rem]"
            : "grid-cols-[minmax(0,1fr)_repeat(var(--n),1.5rem)_2.5rem] gap-y-0.5 sm:grid-cols-[minmax(0,1fr)_repeat(var(--n),2.75rem)_3.5rem]",
        )}
      >
        <span aria-hidden />
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
            {match[side]?.name}
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

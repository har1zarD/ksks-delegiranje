import { MapPin } from "lucide-react";
import { cx } from "@/components/ui";
import { formatTime, isoToSarajevo, MONTHS_SHORT, WEEKDAYS } from "@/lib/format";

export type MatchSummary = {
  starts_at: string;
  round: number | null;
  home_score: number | null;
  away_score: number | null;
  competition: { short_name: string | null; name: string } | null;
  home: { name: string } | null;
  away: { name: string } | null;
  hall: { name: string } | null;
};


/** Datum kao na semaforu: dan u sedmici, veliki broj, mjesec; vrijeme u zlatnoj */
export function DateTile({ iso, className }: { iso: string; className?: string }) {
  const { date } = isoToSarajevo(iso);
  const d = new Date(`${date}T12:00:00Z`);
  return (
    <div className={cx("flex w-12 shrink-0 flex-col items-center", className)}>
      <span className="text-[11px] font-semibold text-fg-faint">{WEEKDAYS[d.getUTCDay()]}</span>
      <span className="scoreboard whitespace-nowrap text-[24px] font-semibold leading-none">{d.getUTCDate()}</span>
      <span className="text-[11px] font-semibold text-fg-muted">{MONTHS_SHORT[d.getUTCMonth()]}</span>
      <span className="scoreboard whitespace-nowrap mt-1 text-[15px] font-semibold text-gold">{formatTime(iso)}</span>
    </div>
  );
}

/** Utakmica kao semafor: datum lijevo, ekipe jedna ispod druge, rezultat desno */
export function MatchLine({
  match,
  meta,
  showScore,
  aside,
}: {
  match: MatchSummary;
  meta?: React.ReactNode;
  showScore?: boolean;
  aside?: React.ReactNode;
}) {
  const score = showScore && match.home_score != null;
  const homeWon = score && match.home_score! > match.away_score!;
  const awayWon = score && match.away_score! > match.home_score!;

  return (
    <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
      <DateTile iso={match.starts_at} />
      <div className="min-w-0 flex-1">
        <div className="text-[12px] font-semibold text-fg-faint">
          {match.competition?.short_name ?? match.competition?.name}
          {match.round ? `, ${match.round}. kolo` : ""}
        </div>
        <div className={cx("mt-0.5 grid items-baseline gap-x-3", score ? "grid-cols-[1fr_auto]" : "grid-cols-1")}>
          <span className={cx("truncate text-[17px] font-semibold leading-snug tracking-[-0.02em]", score && !homeWon && "text-fg-muted")}>
            {match.home?.name}
          </span>
          {score && <span className={cx("scoreboard whitespace-nowrap text-[22px] font-semibold leading-tight", homeWon ? "text-gold" : "text-fg-muted")}>{match.home_score}</span>}
          <span className={cx("truncate text-[17px] font-semibold leading-snug tracking-[-0.02em]", score && !awayWon && "text-fg-muted")}>
            {match.away?.name}
          </span>
          {score && <span className={cx("scoreboard whitespace-nowrap text-[22px] font-semibold leading-tight", awayWon ? "text-gold" : "text-fg-muted")}>{match.away_score}</span>}
        </div>
        {match.hall && (
          <div className="mt-1 flex items-center gap-1 truncate text-[13px] text-fg-muted">
            <MapPin className="size-3.5 shrink-0" />
            <span className="truncate">{match.hall.name}</span>
          </div>
        )}
        {meta && <div className="mt-2 text-[14px]">{meta}</div>}
      </div>
      {aside && <div className="shrink-0 self-center">{aside}</div>}
    </div>
  );
}

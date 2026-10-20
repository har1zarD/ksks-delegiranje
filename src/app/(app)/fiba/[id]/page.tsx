import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ExternalLink, Radio } from "lucide-react";
import { getFibaGame } from "@/lib/data/fiba";
import { fibaGameUrl, type FibaGame, type FibaLine, type FibaTeam } from "@/lib/fiba";
import { formatDayHeading, formatTime, isoToSarajevo, periodShort } from "@/lib/format";
import { AutoRefresh } from "@/components/auto-refresh";
import { BoxScore } from "@/components/match-line";
import { Bone, SectionTitleSkeleton, Skeleton, Text } from "@/components/skeleton";
import { TeamName } from "@/components/team-name";
import { cx, Empty, SectionTitle, Status } from "@/components/ui";

export const metadata = { title: "FIBA utakmica — KSKS" };

export default function FibaGamePage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <>
      <Link href="/fiba" className="mb-6 inline-flex items-center gap-1 text-[14px] font-semibold text-fg-muted hover:text-fg">
        <ChevronLeft className="size-4" aria-hidden="true" /> FIBA uživo
      </Link>
      <Suspense fallback={<GameSkeleton />}>
        <Game params={params} />
      </Suspense>
    </>
  );
}

const STATE: Record<FibaGame["state"], { label: string; tone: "crest" | "mint" | "muted" }> = {
  live: { label: "Uživo", tone: "crest" },
  finished: { label: "Završena", tone: "mint" },
  scheduled: { label: "Zakazana", tone: "muted" },
};

async function Game({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const matchId = Number(id);
  if (!Number.isInteger(matchId) || matchId <= 0) notFound();
  const { game, stored, competition } = await getFibaGame(matchId);
  if (!game && !stored) notFound();

  const state = game?.state ?? "scheduled";
  const home = game?.home ?? null;
  const away = game?.away ?? null;
  const summary = {
    home: { name: home?.name ?? stored!.home_name, club: { logo_url: home?.logo ?? stored?.home_logo ?? null } },
    away: { name: away?.name ?? stored!.away_name, club: { logo_url: away?.logo ?? stored?.away_logo ?? null } },
    home_score: home?.score ?? stored?.home_score ?? null,
    away_score: away?.score ?? stored?.away_score ?? null,
  };
  const periods = (home?.periods ?? []).map((h, i) => ({ period: i + 1, home_points: h, away_points: away?.periods[i] ?? 0 }));
  const startsAt = stored?.starts_at;

  return (
    <div className="flex flex-col gap-10">
      {state === "live" && <AutoRefresh seconds={15} />}

      <section className="rounded-lg border border-line bg-panel px-4 shadow-panel sm:px-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line py-3">
          <span className="text-[13px] font-semibold text-fg-muted">
            {competition && <span className="text-fg">{competition.name}</span>}
            {competition && startsAt && ", "}
            {startsAt && `${formatDayHeading(isoToSarajevo(startsAt).date)}, ${formatTime(startsAt)}`}
          </span>
          <Status tone={STATE[state].tone} pulse={state === "live"}>
            {STATE[state].label}
            {state === "live" && game && ` · ${periodShort(game.period)} ${game.clock}`}
          </Status>
        </div>
        <div className="pb-5 pt-4 sm:pb-8 sm:pt-6">
          <BoxScore match={summary} periods={periods} size="lg" />
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-line py-3 text-[13px] text-fg-muted">
          {game?.officials.map((o) => (
            <span key={o.role}>
              {o.role}: <span className="font-medium text-fg">{o.name}</span>
            </span>
          ))}
          {game?.attendance && <span>Gledalaca: {game.attendance}</span>}
          <a href={fibaGameUrl(matchId)} target="_blank" rel="noreferrer" className="ml-auto inline-flex items-center gap-1 font-semibold hover:text-fg">
            FIBA LiveStats <ExternalLink className="size-3.5" aria-hidden="true" />
          </a>
        </div>
      </section>

      {!game ? (
        <Empty icon={<Radio />}>FIBA LiveStats još nema podatke za ovu utakmicu. Statistika se pojavi kad zapisničar pokrene utakmicu.</Empty>
      ) : (
        [game.home, game.away].map((t) => <TeamStats key={t.name} team={t} />)
      )}
    </div>
  );
}

const pct = (m: number, a: number) => (a === 0 ? "" : `${Math.round((m / a) * 100)}%`);

const COLUMNS: { key: string; label: string; title: string; value: (l: FibaLine) => React.ReactNode }[] = [
  { key: "pts", label: "PTS", title: "Poeni", value: (l) => l.pts },
  { key: "fg", label: "Š2+3", title: "Šut iz igre", value: (l) => `${l.fgm}/${l.fga}` },
  { key: "tp", label: "3P", title: "Trice", value: (l) => `${l.tpm}/${l.tpa}` },
  { key: "ft", label: "SB", title: "Slobodna bacanja", value: (l) => `${l.ftm}/${l.fta}` },
  { key: "reb", label: "SK", title: "Skokovi (napad + odbrana)", value: (l) => l.reb },
  { key: "ast", label: "AS", title: "Asistencije", value: (l) => l.ast },
  { key: "stl", label: "UL", title: "Ukradene lopte", value: (l) => l.stl },
  { key: "tov", label: "IL", title: "Izgubljene lopte", value: (l) => l.tov },
  { key: "blk", label: "BL", title: "Blokade", value: (l) => l.blk },
  { key: "pf", label: "LG", title: "Lične greške", value: (l) => l.pf },
  { key: "eff", label: "IND", title: "Indeks korisnosti", value: (l) => l.eff },
];

/** Statistika igrača jedne ekipe (box score) */
function TeamStats({ team }: { team: FibaTeam }) {
  const cell = "scoreboard px-2 py-2 text-right text-[14px] whitespace-nowrap";
  const head = "px-2 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-fg-faint";
  return (
    <section>
      <SectionTitle>
        <TeamName name={team.name} logoUrl={team.logo} />
      </SectionTitle>
      <div className="overflow-x-auto rounded-lg border border-line bg-panel shadow-panel">
        <table className="w-full min-w-[760px] border-collapse">
          <thead className="border-b border-line">
            <tr>
              <th className={cx(head, "w-10 pl-4 text-left sm:pl-6")}>#</th>
              <th className={cx(head, "text-left")}>Igrač</th>
              <th className={head} title="Minute">MIN</th>
              {COLUMNS.map((c) => (
                <th key={c.key} className={head} title={c.title}>
                  {c.label}
                </th>
              ))}
              <th className={cx(head, "pr-4 sm:pr-6")} title="Plus/minus">+/−</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {team.players.map((p) => (
              <tr key={`${p.number}-${p.name}`} className={cx(p.minutes === "0:00" && "text-fg-faint")}>
                <td className={cx(cell, "pl-4 text-left text-fg-muted sm:pl-6")}>{p.number}</td>
                <td className="py-2 pr-2 text-[14px] font-medium">
                  <span className="flex items-center gap-1.5 whitespace-nowrap">
                    {p.name}
                    {p.starter && <span className="text-[11px] font-semibold text-fg-faint" title="Starter">S</span>}
                    {p.onCourt && <span className="size-1.5 rounded-full bg-crest" title="Na terenu" />}
                  </span>
                </td>
                <td className={cx(cell, "text-fg-muted")}>{p.minutes}</td>
                {COLUMNS.map((c) => (
                  <td key={c.key} className={cx(cell, c.key === "pts" && "font-semibold")}>
                    {c.value(p)}
                  </td>
                ))}
                <td className={cx(cell, "pr-4 text-fg-muted sm:pr-6")}>{p.plusMinus > 0 ? `+${p.plusMinus}` : p.plusMinus}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t border-line-strong font-semibold">
            <tr>
              <td className={cx(cell, "pl-4 sm:pl-6")} />
              <td className="py-2 pr-2 text-[14px]">Ekipa</td>
              <td className={cell} />
              {COLUMNS.map((c) => (
                <td key={c.key} className={cell}>
                  {c.value(team.totals)}
                </td>
              ))}
              <td className={cx(cell, "pr-4 sm:pr-6")} />
            </tr>
            <tr className="text-fg-muted">
              <td className={cx(cell, "pl-4 sm:pl-6")} />
              <td className="pb-3 pr-2 text-[13px] font-medium">%</td>
              <td />
              <td />
              <td className={cx(cell, "pb-3 pt-0 text-[13px]")}>{pct(team.totals.fgm, team.totals.fga)}</td>
              <td className={cx(cell, "pb-3 pt-0 text-[13px]")}>{pct(team.totals.tpm, team.totals.tpa)}</td>
              <td className={cx(cell, "pb-3 pt-0 text-[13px]")}>{pct(team.totals.ftm, team.totals.fta)}</td>
              <td colSpan={COLUMNS.length - 3} />
            </tr>
          </tfoot>
        </table>
      </div>
      {team.coach && <p className="mt-2 text-[13px] text-fg-muted">Trener: <span className="font-medium text-fg">{team.coach}</span></p>}
    </section>
  );
}

function GameSkeleton() {
  return (
    <div className="flex flex-col gap-10">
      <Skeleton className="rounded-lg border border-line bg-panel px-4 py-5 shadow-panel sm:px-5">
        <Text w="w-48" />
        <div className="mt-6 flex flex-col gap-4">
          <Bone className="h-9 w-full" />
          <Bone className="h-9 w-full" />
        </div>
      </Skeleton>
      <section>
        <SectionTitleSkeleton w="w-48" />
        <Bone className="h-72 w-full rounded-lg" />
      </section>
    </div>
  );
}

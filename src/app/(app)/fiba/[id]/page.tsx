import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ExternalLink, Radio } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getFibaAliases, getFibaGame, getFibaGames, getLinkCandidates } from "@/lib/data/fiba";
import { feedState, fibaCategoryLabel, fibaGameUrl, properName, type FibaExtra, type FibaGame, type FibaLine, type FibaPlayer, type FibaTeam } from "@/lib/fiba";
import { fibaPlayerId, plusMinusText } from "@/lib/fiba-stats";
import { formatDayHeading, formatDayMonth, formatTime, isoToSarajevo, matchNo, periodShort } from "@/lib/format";
import { AutoRefresh } from "@/components/auto-refresh";
import { BoxScore } from "@/components/match-line";
import { Bone, SectionTitleSkeleton, Skeleton, Text } from "@/components/skeleton";
import { cx, Empty, SectionTitle, Status } from "@/components/ui";
import { LinkMatch } from "../link-match";
import { Tabs } from "../tabs";
import { PlayerLink, ResultMark, STICKY, TABLE_WRAP, TD, TH, TeamLink } from "../ui";
import { GameFlow } from "./game-flow";
import { PlayByPlay } from "./play-by-play";

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
  const [{ game, stored, match }, user, aliases, all] = await Promise.all([getFibaGame(matchId), getCurrentUser(), getFibaAliases(), getFibaGames()]);
  if (!game && !stored) notFound();
  const candidates = user.role === "admin" && !match ? await getLinkCandidates(stored?.starts_at ?? null) : [];

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
  const category = stored?.category ?? null;

  return (
    <div className="flex flex-col gap-10">
      {state === "live" && <AutoRefresh seconds={15} />}

      <section className="rounded-lg border border-line bg-panel px-4 shadow-panel sm:px-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line py-3">
          <span className="text-[13px] font-semibold text-fg-muted">
            <span className="text-fg">{fibaCategoryLabel(stored?.category)}</span>
            {startsAt && ", "}
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
          {match && (
            <Link href={user.role === "admin" ? `/admin/utakmice/${match.id}` : `/utakmice/${match.id}`} className="font-semibold text-fg hover:underline">
              {matchNo(match.number)}, {match.competition?.short_name ?? match.competition?.name}
            </Link>
          )}
          <a href={fibaGameUrl(matchId)} target="_blank" rel="noreferrer" className="ml-auto inline-flex items-center gap-1 font-semibold hover:text-fg">
            FIBA LiveStats <ExternalLink className="size-3.5" aria-hidden="true" />
          </a>
        </div>
      </section>

      {user.role === "admin" && !match && <LinkMatch fibaGameId={matchId} candidates={candidates} />}

      {!game ? (
        <>
          <Empty icon={<Radio />}>FIBA LiveStats još nema podatke za ovu utakmicu. Statistika se pojavi kad zapisničar pokrene utakmicu.</Empty>
          <Meetings games={all} gameId={matchId} home={summary.home.name} away={summary.away.name} category={category} />
        </>
      ) : (
        <Tabs
          tabs={[
            {
              key: "box-score",
              label: "Box score",
              content: (
                <div className="flex flex-col gap-10">
                  {[game.home, game.away].map((t) => (
                    <TeamStats key={t.name} team={t} category={category} playerId={(p) => fibaPlayerId(t.name, p.firstName, p.familyName, aliases)} />
                  ))}
                </div>
              ),
            },
            { key: "ekipe", label: "Ekipe", content: <Compare game={game} playerId={(t, p) => fibaPlayerId(t.name, p.firstName, p.familyName, aliases)} /> },
            ...(game.actions.length > 0
              ? [{
                  key: "tok",
                  label: "Tok utakmice",
                  content: (
                    <div className="flex flex-col gap-6">
                      <GameFlow actions={game.actions} home={game.home.name} away={game.away.name} periodMinutes={game.periodMinutes} />
                      <PlayByPlay actions={game.actions} home={game.home.name} away={game.away.name} />
                    </div>
                  ),
                }]
              : []),
            { key: "susreti", label: "Susreti i forma", content: <Meetings games={all} gameId={matchId} home={game.home.name} away={game.away.name} category={category} /> },
          ]}
        />
      )}
    </div>
  );
}

const pct = (m: number, a: number) => (a === 0 ? "" : `${Math.round((m / a) * 100)}%`);

type Column = { key: string; label: string; title: string; value: (l: FibaLine & { fd?: number }) => React.ReactNode; pct?: (l: FibaLine) => string };

const COLUMNS: Column[] = [
  { key: "pts", label: "PTS", title: "Poeni", value: (l) => l.pts },
  { key: "fg2", label: "Š2", title: "Dvojke", value: (l) => `${l.fgm - l.tpm}/${l.fga - l.tpa}`, pct: (l) => pct(l.fgm - l.tpm, l.fga - l.tpa) },
  { key: "tp", label: "3P", title: "Trice", value: (l) => `${l.tpm}/${l.tpa}`, pct: (l) => pct(l.tpm, l.tpa) },
  { key: "fg", label: "Š2+3", title: "Šut iz igre", value: (l) => `${l.fgm}/${l.fga}`, pct: (l) => pct(l.fgm, l.fga) },
  { key: "ft", label: "SB", title: "Slobodna bacanja", value: (l) => `${l.ftm}/${l.fta}`, pct: (l) => pct(l.ftm, l.fta) },
  { key: "oreb", label: "SKN", title: "Skokovi u napadu", value: (l) => l.oreb },
  { key: "dreb", label: "SKO", title: "Skokovi u odbrani", value: (l) => l.dreb },
  { key: "reb", label: "SK", title: "Skokovi ukupno", value: (l) => l.reb },
  { key: "ast", label: "AS", title: "Asistencije", value: (l) => l.ast },
  { key: "stl", label: "UL", title: "Ukradene lopte", value: (l) => l.stl },
  { key: "tov", label: "IL", title: "Izgubljene lopte", value: (l) => l.tov },
  { key: "blk", label: "BL", title: "Blokade", value: (l) => l.blk },
  { key: "pf", label: "LG", title: "Lične greške", value: (l) => l.pf },
  { key: "fd", label: "IG", title: "Iznuđene greške", value: (l) => l.fd ?? "" },
  { key: "eff", label: "IND", title: "Indeks korisnosti", value: (l) => l.eff },
];

/** Statistika igrača jedne ekipe (box score); ime igrača vodi na njegovu stranicu */
function TeamStats({ team, category, playerId }: { team: FibaTeam; category: string | null; playerId: (p: FibaPlayer) => string }) {
  const best = Math.max(...team.players.map((p) => p.pts));
  return (
    <section>
      <SectionTitle>
        <TeamLink category={category} name={team.name} logo={team.logo} />
      </SectionTitle>
      <div className={TABLE_WRAP}>
        <table className="w-full min-w-[980px] border-collapse">
          <caption className="sr-only">Statistika igrača ekipe {team.name}</caption>
          <thead className="border-b border-line bg-panel-2">
            <tr>
              <th className={cx(TH, "w-10 pl-4 text-left sm:pl-5")}>#</th>
              <th className={cx(TH, STICKY, "bg-panel-2 text-left")}>Igrač</th>
              <th className={TH} title="Minute">MIN</th>
              {COLUMNS.map((c) => (
                <th key={c.key} className={TH} title={c.title}>
                  {c.label}
                </th>
              ))}
              <th className={cx(TH, "pr-4 sm:pr-5")} title="Plus/minus">+/−</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {team.players.map((p, i) => {
              const dnp = p.minutes === "0:00";
              return (
                <tr key={`${p.number}-${p.name}`} className={cx("group hover:bg-panel-2", dnp && "text-fg-faint", p.starter && !team.players[i + 1]?.starter && "border-b border-line-strong")}>
                  <td className={cx(TD, "pl-4 text-left text-fg-muted sm:pl-5")}>{p.number}</td>
                  <td className={cx(STICKY, "max-w-[46vw] py-2 pr-3 group-hover:bg-panel-2 sm:max-w-none")}>
                    <span className="flex min-w-0 items-center gap-1.5 whitespace-nowrap text-[14px] font-medium">
                      <PlayerLink id={playerId(p)} name={p.name} className="truncate" />
                      {p.captain && <span className="text-[11px] font-semibold text-fg-faint" title="Kapiten">K</span>}
                      {p.onCourt && <span className="size-1.5 shrink-0 rounded-full bg-crest" title="Na terenu" />}
                    </span>
                  </td>
                  <td className={cx(TD, "text-fg-muted")}>{dnp ? "—" : p.minutes}</td>
                  {COLUMNS.map((c) => (
                    <td key={c.key} className={cx(TD, c.key === "pts" && "font-semibold", c.key === "pts" && p.pts === best && best > 0 && "font-bold")}>
                      {dnp ? "" : c.value(p)}
                    </td>
                  ))}
                  <td className={cx(TD, "pr-4 text-fg-muted sm:pr-5")}>{dnp ? "" : plusMinusText(p.plusMinus)}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="border-t border-line-strong bg-panel-2/50 font-semibold">
            <tr>
              <td className={cx(TD, "pl-4 sm:pl-5")} />
              <td className={cx(STICKY, "bg-panel-2 py-2 pr-3 text-[14px]")}>Ekipa</td>
              <td className={TD} />
              {COLUMNS.map((c) => (
                <td key={c.key} className={TD}>
                  {c.key === "fd" ? "" : c.value(team.totals)}
                </td>
              ))}
              <td className={cx(TD, "pr-4 sm:pr-5")} />
            </tr>
            <tr className="text-fg-muted">
              <td className={cx(TD, "pl-4 sm:pl-5")} />
              <td className={cx(STICKY, "bg-panel-2 pb-3 pr-3 text-[13px] font-medium")}>%</td>
              <td />
              {COLUMNS.map((c) => (
                <td key={c.key} className={cx(TD, "pb-3 pt-0 text-[13px]")}>{c.pct?.(team.totals) ?? ""}</td>
              ))}
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[13px] text-fg-muted">
        {team.coach && <span>Trener: <span className="font-medium text-fg">{properName(team.coach)}</span></span>}
        {team.timeouts != null && <span>Tajm-auti: {team.timeouts}</span>}
        {team.fouls != null && <span>Greške ekipe u četvrtini: {team.fouls}</span>}
        <span className="text-fg-faint">Starteri iznad crte. Klik na igrača: njegova historija i statistika.</span>
      </p>
    </section>
  );
}

const EXTRAS: { key: FibaExtra; label: string }[] = [
  { key: "paint", label: "Poeni iz reketa" },
  { key: "fastBreak", label: "Poeni iz kontre" },
  { key: "secondChance", label: "Poeni iz druge šanse" },
  { key: "fromTurnovers", label: "Poeni nakon izgubljenih lopti" },
  { key: "bench", label: "Poeni s klupe" },
  { key: "biggestLead", label: "Najveće vodstvo" },
  { key: "biggestRun", label: "Najveća serija" },
];

/** Poređenje ekipa (traka po stavci) i najbolji igrači utakmice */
function Compare({ game, playerId }: { game: FibaGame; playerId: (t: FibaTeam, p: FibaPlayer) => string }) {
  const { home, away } = game;
  const h = home.totals;
  const a = away.totals;
  const rows: { label: string; home: number; away: number; text?: [string, string]; lowerBetter?: boolean }[] = [
    { label: "Šut iz igre", home: h.fga ? h.fgm / h.fga : 0, away: a.fga ? a.fgm / a.fga : 0, text: [`${pct(h.fgm, h.fga) || "–"} (${h.fgm}/${h.fga})`, `${pct(a.fgm, a.fga) || "–"} (${a.fgm}/${a.fga})`] },
    { label: "Dvojke", home: h.fga - h.tpa ? (h.fgm - h.tpm) / (h.fga - h.tpa) : 0, away: a.fga - a.tpa ? (a.fgm - a.tpm) / (a.fga - a.tpa) : 0, text: [`${pct(h.fgm - h.tpm, h.fga - h.tpa) || "–"} (${h.fgm - h.tpm}/${h.fga - h.tpa})`, `${pct(a.fgm - a.tpm, a.fga - a.tpa) || "–"} (${a.fgm - a.tpm}/${a.fga - a.tpa})`] },
    { label: "Trice", home: h.tpa ? h.tpm / h.tpa : 0, away: a.tpa ? a.tpm / a.tpa : 0, text: [`${pct(h.tpm, h.tpa) || "–"} (${h.tpm}/${h.tpa})`, `${pct(a.tpm, a.tpa) || "–"} (${a.tpm}/${a.tpa})`] },
    { label: "Slobodna bacanja", home: h.fta ? h.ftm / h.fta : 0, away: a.fta ? a.ftm / a.fta : 0, text: [`${pct(h.ftm, h.fta) || "–"} (${h.ftm}/${h.fta})`, `${pct(a.ftm, a.fta) || "–"} (${a.ftm}/${a.fta})`] },
    { label: "Skokovi", home: h.reb, away: a.reb },
    { label: "Skokovi u napadu", home: h.oreb, away: a.oreb },
    { label: "Asistencije", home: h.ast, away: a.ast },
    { label: "Ukradene lopte", home: h.stl, away: a.stl },
    { label: "Blokade", home: h.blk, away: a.blk },
    { label: "Izgubljene lopte", home: h.tov, away: a.tov, lowerBetter: true },
    { label: "Lične greške", home: h.pf, away: a.pf, lowerBetter: true },
    ...EXTRAS.flatMap((e) => (home.extras[e.key] == null || away.extras[e.key] == null ? [] : [{ label: e.label, home: home.extras[e.key]!, away: away.extras[e.key]! }])),
    { label: "Indeks korisnosti", home: h.eff, away: a.eff },
  ];

  const leaders: { label: string; value: (p: FibaPlayer) => number }[] = [
    { label: "Poeni", value: (p) => p.pts },
    { label: "Skokovi", value: (p) => p.reb },
    { label: "Asistencije", value: (p) => p.ast },
    { label: "Indeks", value: (p) => p.eff },
  ];

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <section>
        <SectionTitle>Poređenje</SectionTitle>
        <div className="overflow-hidden rounded-lg border border-line bg-panel shadow-panel">
          <div className="grid grid-cols-2 border-b border-line bg-panel-2 px-4 py-2.5 text-[13px] font-semibold sm:px-5">
            <span className="truncate">{home.name}</span>
            <span className="truncate text-right">{away.name}</span>
          </div>
          <ul className="divide-y divide-line">
            {rows.map((r) => {
              const total = r.home + r.away;
              const share = total > 0 ? r.home / total : 0.5;
              const homeBetter = r.lowerBetter ? r.home < r.away : r.home > r.away;
              const awayBetter = r.lowerBetter ? r.away < r.home : r.away > r.home;
              return (
                <li key={r.label} className="px-4 py-2.5 sm:px-5">
                  <div className="grid grid-cols-[1fr_auto_1fr] items-baseline gap-3 text-[14px]">
                    <span className={cx("scoreboard", homeBetter ? "font-semibold" : "text-fg-muted")}>{r.text?.[0] ?? r.home}</span>
                    <span className="text-center text-[12px] font-semibold text-fg-muted">{r.label}</span>
                    <span className={cx("scoreboard text-right", awayBetter ? "font-semibold" : "text-fg-muted")}>{r.text?.[1] ?? r.away}</span>
                  </div>
                  <div className="mt-1.5 flex h-1.5 gap-1" aria-hidden>
                    <span className={cx("rounded-l-full", homeBetter ? "bg-fg" : "bg-fg-faint/40")} style={{ flex: share }} />
                    <span className={cx("rounded-r-full", awayBetter ? "bg-fg" : "bg-fg-faint/40")} style={{ flex: 1 - share }} />
                  </div>
                </li>
              );
            })}
          </ul>
          {(home.extras.leadChanges != null || home.extras.timesTied != null) && (
            <p className="border-t border-line px-4 py-2.5 text-[13px] text-fg-muted sm:px-5">
              {home.extras.leadChanges != null && <>Izmjena vodstva: <span className="font-semibold text-fg">{home.extras.leadChanges}</span></>}
              {home.extras.timesTied != null && <span className="ml-4">Izjednačenja: <span className="font-semibold text-fg">{home.extras.timesTied}</span></span>}
            </p>
          )}
        </div>
      </section>

      <section>
        <SectionTitle>Najbolji igrači</SectionTitle>
        <div className="overflow-hidden rounded-lg border border-line bg-panel shadow-panel">
          {leaders.map((l) => (
            <div key={l.label} className="border-b border-line last:border-b-0">
              <h3 className="bg-panel-2 px-4 py-1.5 text-[12px] font-semibold text-fg-muted sm:px-5">{l.label}</h3>
              {[home, away].map((t) => {
                const top = [...t.players].sort((x, y) => l.value(y) - l.value(x))[0];
                if (!top) return null;
                return (
                  <div key={t.name} className="flex items-center gap-3 px-4 py-2 sm:px-5">
                    <span className="min-w-0 flex-1">
                      <PlayerLink id={playerId(t, top)} name={top.name} className="block truncate text-[14px] font-semibold" />
                      <span className="block truncate text-[12px] text-fg-muted">{t.name}</span>
                    </span>
                    <span className="scoreboard text-[22px] font-semibold">{l.value(top)}</span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

/** Međusobni susreti u kategoriji i zadnjih 5 utakmica svake ekipe */
function Meetings({ games, gameId, home, away, category }: { games: Awaited<ReturnType<typeof getFibaGames>>; gameId: number; home: string; away: string; category: string | null }) {
  const done = games
    .filter((g) => g.id !== gameId && (!category || g.category === category) && feedState(g.status, g.live, g.starts_at) === "finished" && g.home_score != null)
    .sort((a, b) => Date.parse(b.starts_at ?? "") - Date.parse(a.starts_at ?? ""));
  const h2h = done.filter((g) => (g.home_name === home && g.away_name === away) || (g.home_name === away && g.away_name === home));
  const formOf = (team: string) => done.filter((g) => g.home_name === team || g.away_name === team).slice(0, 5);

  const line = (g: (typeof done)[number], team?: string) => {
    const own = team ? (g.home_name === team ? g.home_score! : g.away_score!) : null;
    const opp = team ? (g.home_name === team ? g.away_score! : g.home_score!) : null;
    return (
      <li key={g.id}>
        <Link href={`/fiba/${g.id}`} className="-mx-4 flex items-center gap-3 px-4 py-2.5 text-[14px] transition-colors hover:bg-panel-2 sm:-mx-5 sm:px-5">
          <span className="scoreboard w-14 shrink-0 text-[12px] text-fg-muted">{g.starts_at ? formatDayMonth(g.starts_at) : ""}</span>
          {team ? (
            <>
              <ResultMark won={own! > opp!} />
              <span className="min-w-0 flex-1 truncate">{g.home_name === team ? "vs" : "@"} {g.home_name === team ? g.away_name : g.home_name}</span>
              <span className="scoreboard font-semibold">{own}:{opp}</span>
            </>
          ) : (
            <>
              <span className="min-w-0 flex-1 truncate">{g.home_name} – {g.away_name}</span>
              <span className="scoreboard font-semibold">{g.home_score}:{g.away_score}</span>
            </>
          )}
        </Link>
      </li>
    );
  };

  return (
    <div className="grid gap-10 lg:grid-cols-3">
      <section>
        <SectionTitle count={h2h.length}>Međusobni susreti</SectionTitle>
        {h2h.length === 0 ? (
          <p className="text-[14px] text-fg-muted">Ekipe se ove sezone još nisu sastale.</p>
        ) : (
          <ul className="divide-y divide-line rounded-lg border border-line bg-panel px-4 shadow-panel sm:px-5">{h2h.map((g) => line(g))}</ul>
        )}
      </section>
      {[home, away].map((team) => {
        const form = formOf(team);
        return (
          <section key={team}>
            <SectionTitle>
              <span className="truncate">{team}</span>
            </SectionTitle>
            {form.length === 0 ? (
              <p className="text-[14px] text-fg-muted">Nema odigranih utakmica.</p>
            ) : (
              <ul className="divide-y divide-line rounded-lg border border-line bg-panel px-4 shadow-panel sm:px-5">{form.map((g) => line(g, team))}</ul>
            )}
          </section>
        );
      })}
    </div>
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

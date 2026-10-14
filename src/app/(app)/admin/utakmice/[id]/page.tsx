import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ChevronDown, ChevronLeft, FileText, MapPin, Printer } from "lucide-react";
import { getCompetitions, getDelegation, getHalls, type Candidate } from "@/lib/data/admin";
import { formatKM, matchCost } from "@/lib/finance";
import { isoToSarajevo, MATCH_STATUS_LABEL, POSITION_LABEL, requiredPositions, type MatchStatus, type Position } from "@/lib/format";
import { LiveRefresh } from "@/components/live-refresh";
import { BoxScore, DateTile } from "@/components/match-line";
import { ConfirmButton } from "@/components/confirm-button";
import { buttonClass, cx, Loading, Panel, SectionTitle, Status } from "@/components/ui";
import { deleteMatch } from "../actions";
import { MatchForm } from "../match-form";
import { unassign } from "./actions";
import { AssignForm } from "./assign-form";
import { SendForm } from "./send-form";

export const metadata = { title: "Delegiranje — KSKS" };

export default function DelegationPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <>
      <Link href="/admin/utakmice" className="mb-4 inline-flex items-center gap-1 text-[15px] font-semibold text-fg-muted hover:text-fg">
        <ChevronLeft className="size-5" />
        Utakmice
      </Link>
      <Suspense fallback={<Loading />}>
        <Delegation params={params} />
      </Suspense>
    </>
  );
}

const TABLE: Position[] = ["scorer", "timer", "shot_clock"];

function eligibleFor(position: Position, c: Candidate) {
  if (position === "commissioner") return c.isCommissioner;
  if (TABLE.includes(position)) return c.canTable;
  return c.canReferee;
}

const STATUS_TONE: Record<MatchStatus, "crest" | "mint" | "orange" | "muted"> = {
  scheduled: "muted",
  live: "crest",
  finished: "mint",
  postponed: "orange",
  cancelled: "orange",
};

async function Delegation({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getDelegation(id);
  if (!data) notFound();
  const { match, assignments, candidates } = data;

  const positions = requiredPositions(match.referee_count, match.table_count);
  const active = assignments.filter((a) => a.status === "pending" || a.status === "accepted");
  const onMatch = new Set(active.map((a) => a.profile!.id));
  const filled = positions.filter((p) => active.some((a) => a.position === p)).length;
  const unsent = assignments.filter((a) => a.status === "pending" && !a.notified_at).length;
  const cost = matchCost(match.rules, match.referee_count, match.table_count);

  return (
    <div className="flex flex-col gap-8">
      {/* Zaglavlje: datum kao semafor + ekipe */}
      <header className="flex items-start gap-4 sm:gap-6">
        <DateTile iso={match.starts_at} className="w-[72px] sm:w-[84px] [&>span:nth-child(2)]:text-[30px] sm:[&>span:nth-child(2)]:text-[46px]" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] font-semibold text-fg-faint">
            <span>
              {match.competition?.name}
              {match.round ? `, ${match.round}. kolo` : ""}
            </span>
            {match.status !== "scheduled" && (
              <Status tone={STATUS_TONE[match.status]} pulse={match.status === "live"}>
                {MATCH_STATUS_LABEL[match.status]}
              </Status>
            )}
          </div>
          <h1 className="mt-1 font-display text-[26px] font-semibold leading-tight tracking-[-0.03em] sm:text-[32px]">
            <span className="block">{match.home?.name}</span>
            <span className="block text-fg-muted">{match.away?.name}</span>
          </h1>
          <p className="mt-2 flex items-center gap-1.5 text-[14px] text-fg-muted">
            <MapPin className="size-4 shrink-0" />
            {match.hall?.name ?? "Dvorana nije određena"}
          </p>
          {match.notes && <p className="mt-2 max-w-prose text-[14px] text-fg">{match.notes}</p>}
        </div>
      </header>

      {(match.status === "live" || (match.status === "finished" && match.periods.length > 0)) && (
        <Panel className="py-4 sm:py-6">
          {match.status === "live" && <LiveRefresh matchIds={[match.id]} />}
          <BoxScore
            size="lg"
            match={match}
            periods={match.periods}
            label="Rezultat"
            badge={match.status === "live" ? <span className="font-medium">osvježava se uživo</span> : undefined}
          />
        </Panel>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* Pozicije */}
        <section>
          <SectionTitle
            action={
              <span className={cx("scoreboard whitespace-nowrap text-[20px] font-semibold", filled === positions.length ? "text-mint" : "text-orange")}>
                {filled}/{positions.length}
              </span>
            }
          >
            Delegiranje
          </SectionTitle>
          <ul className="divide-y divide-line rounded-lg border border-line bg-panel shadow-panel [&>*]:px-4 sm:[&>*]:px-6">
            {positions.map((position) => {
              const current = active.find((a) => a.position === position);
              const declined = assignments.find((a) => a.position === position && a.status === "declined");
              return (
                <li key={position} className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:gap-4">
                  <div className="text-[13px] font-semibold text-fg-muted sm:w-32 sm:shrink-0">{POSITION_LABEL[position]}</div>
                  {current ? (
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[17px] font-semibold">{current.profile!.full_name}</div>
                        <div className="mt-0.5">
                          {current.status === "accepted" ? (
                            <Status tone="mint">Prihvaćeno</Status>
                          ) : current.notified_at ? (
                            <Status tone="gold">Čeka odgovor</Status>
                          ) : (
                            <Status tone="muted">Nije poslano</Status>
                          )}
                        </div>
                      </div>
                      <form action={unassign}>
                        <input type="hidden" name="id" value={current.id} />
                        <button type="submit" className={buttonClass("destructive", "h-10 text-[14px]")}>
                          Ukloni
                        </button>
                      </form>
                    </div>
                  ) : (
                    <div className="flex min-w-0 flex-1 flex-col gap-2">
                      {declined && (
                        <p className="text-[13px] text-crest">
                          Odbijeno ({declined.profile!.full_name})
                          {declined.decline_reason ? `: ${declined.decline_reason}` : ""}
                        </p>
                      )}
                      <AssignForm
                        matchId={match.id}
                        position={position}
                        candidates={candidates.filter((c) => eligibleFor(position, c) && !onMatch.has(c.id))}
                      />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        {/* Bočno: slanje, trošak, bilten */}
        <aside className="flex flex-col gap-4 lg:sticky lg:top-6">
          <Panel className="py-4 sm:py-5">
            <SendForm matchId={match.id} unsent={unsent} />
          </Panel>

          <Panel className="py-4 sm:py-5">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-[13px] font-semibold text-fg-muted">Trošak utakmice</h2>
              <span className="scoreboard whitespace-nowrap text-[22px] font-semibold leading-none">{formatKM(cost.total)}</span>
            </div>
            <ul className="mt-3 flex flex-col gap-2 border-t border-line pt-3 text-[14px]">
              {cost.lines.map((l) => (
                <li key={l.label} className="flex items-baseline justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block font-semibold">{l.label}</span>
                    {l.unit != null && (
                      <span className="tabular block text-[13px] text-fg-muted">
                        {l.count} × {formatKM(l.unit)}
                      </span>
                    )}
                  </span>
                  {l.total == null ? (
                    <Link href="/admin/naknade" className="shrink-0 text-[13px] font-semibold text-orange hover:opacity-75">
                      Odredi cijenu
                    </Link>
                  ) : (
                    <span className="scoreboard whitespace-nowrap shrink-0 text-[18px] font-semibold">{formatKM(l.total)}</span>
                  )}
                </li>
              ))}
            </ul>
          </Panel>

          <div className="grid grid-cols-2 gap-2">
            <Link href={`/utakmice/${match.id}`} className={buttonClass("secondary", "text-[14px]")}>
              <FileText className="size-4" />
              Rezultat
            </Link>
            <Link href={`/bilten/${match.id}`} className={buttonClass("secondary", "text-[14px]")}>
              <Printer className="size-4" />
              Bilten
            </Link>
          </div>
        </aside>
      </div>

      {/* Izmjena utakmice */}
      <details className="group rounded-lg border border-line bg-panel shadow-panel px-4 sm:px-5">
        <summary className="-mx-3 px-3 rounded-md flex cursor-pointer list-none items-center justify-between gap-3 py-4 font-display text-[20px] font-semibold hover:bg-panel-2 [&::-webkit-details-marker]:hidden">
          Uredi utakmicu
          <ChevronDown className="size-5 text-fg-faint transition-transform group-open:rotate-180" />
        </summary>
        <div className="border-t border-line py-4 sm:py-6">
          <Suspense fallback={<Loading />}>
            <EditMatch match={match} />
          </Suspense>
          <form action={deleteMatch} className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
            <input type="hidden" name="id" value={match.id} />
            <p className="text-[13px] text-fg-muted">Brisanje uklanja utakmicu i sva delegiranja na njoj.</p>
            <ConfirmButton variant="danger" message="Obrisati utakmicu i sva delegiranja na njoj?">
              Obriši utakmicu
            </ConfirmButton>
          </form>
        </div>
      </details>
    </div>
  );
}

async function EditMatch({
  match,
}: {
  match: NonNullable<Awaited<ReturnType<typeof getDelegation>>>["match"];
}) {
  const [competitions, halls] = await Promise.all([getCompetitions(), getHalls()]);
  const { date, time } = isoToSarajevo(match.starts_at);
  return (
    <MatchForm
      competitions={competitions}
      halls={halls}
      values={{
        id: match.id,
        competition_id: match.competition_id,
        round: match.round,
        home_team_id: match.home_team_id,
        away_team_id: match.away_team_id,
        hall_id: match.hall_id,
        date,
        time,
        referee_count: match.referee_count,
        table_count: match.table_count,
        status: match.status,
        notes: match.notes,
      }}
    />
  );
}

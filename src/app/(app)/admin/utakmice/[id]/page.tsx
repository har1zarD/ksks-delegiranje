import { TeamName } from "@/components/team-name";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ChevronDown, ChevronLeft, FileImage, FileText, MapPin, Printer, Trash2, Users } from "lucide-react";
import { candidateFits, getCompetitions, getDelegation, getHalls } from "@/lib/data/admin";
import { formatKM, matchCost } from "@/lib/finance";
import { crewOf, crewPositions, crewSummary, crewWithout, NOMINATION_GROUP_LABEL, nominationGroupOf, type NominationGroup } from "@/lib/crew";
import { isoToSarajevo, matchKindLabel, matchNo, MATCH_STATUS_LABEL, POSITION_LABEL, positionName, type MatchStatus, type Position } from "@/lib/format";
import { LiveRefresh } from "@/components/live-refresh";
import { BoxScore, DateTile, KindTag } from "@/components/match-line";
import { ConfirmButton } from "@/components/confirm-button";
import {
  Bone,
  ButtonSkeleton,
  DateTileSkeleton,
  Skeleton,
  StatusSkeleton,
  TeamNameSkeleton,
  Text,
  TextButtonSkeleton,
  times,
} from "@/components/skeleton";
import { buttonClass, cx, Empty, Panel, ROWS, SectionTitle, Status } from "@/components/ui";
import { deleteMatch } from "../actions";
import { MatchForm, MatchFormSkeleton } from "../match-form";
import { removePosition, unassign } from "./actions";
import { AddPosition } from "./add-position";
import { AssignForm } from "./assign-form";
import { ReplaceButton } from "./replace-dialog";
import { PublishMatch } from "@/components/publish";
import { listScoresheets } from "@/lib/scoresheets";

export const metadata = { title: "Delegiranje — KSKS" };

export default function DelegationPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <>
      <Link href="/admin/utakmice" className="mb-4 inline-flex items-center gap-1 text-[15px] font-semibold text-fg-muted hover:text-fg">
        <ChevronLeft className="size-5" />
        Utakmice
      </Link>
      <Suspense fallback={<DelegationSkeleton />}>
        <Delegation params={params} />
      </Suspense>
    </>
  );
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
  const [data, sheets] = await Promise.all([getDelegation(id), listScoresheets(id)]);
  if (!data) notFound();
  const { match, assignments, candidates } = data;

  const crew = crewOf(match);
  const positions = crewPositions(crew);
  const split = Boolean(match.rules?.split_nominations);
  // Seniori: sudije + komesar i pomoćne sudije su odvojene nominacije; omladinska jedna lista
  const groups: { key: NominationGroup | null; positions: Position[] }[] = split
    ? (["officials", "table"] as const)
        .map((g) => ({ key: g, positions: positions.filter((p) => nominationGroupOf(p) === g) }))
        .filter((g) => g.positions.length > 0)
    : [{ key: null, positions }];
  const unsentIn = (g: NominationGroup | null) =>
    assignments.filter((a) => a.status === "pending" && !a.notified_at && (!g || nominationGroupOf(a.position) === g)).length;
  const active = assignments.filter((a) => a.status === "pending" || a.status === "accepted");
  const onMatch = new Set(active.map((a) => a.profile!.id));
  const filled = positions.filter((p) => active.some((a) => a.position === p)).length;
  const cost = matchCost(match.rules, crew);
  // Prazna pozicija se može ukloniti sa utakmice ako su prazne i sve pozicije koje bi s njom nestale (zadnja sudija, zadnja statistika)
  const removable = (position: Position) => {
    const kept = crewPositions(crewWithout(crew, position));
    return positions.filter((p) => !kept.includes(p)).every((p) => !active.some((a) => a.position === p));
  };
  // Pozicije koje utakmica još nema, za "Dodaj poziciju"
  const addable: { position: Position; label: string }[] = [
    ...(crew.commissioner ? [] : [{ position: "commissioner" as const, label: POSITION_LABEL.commissioner }]),
    ...(!crew.referees ? [{ position: "referee_1" as const, label: "Sudije (dvojka)" }] : crew.refereeCount === 2 ? [{ position: "referee_3" as const, label: POSITION_LABEL.referee_3 }] : []),
    ...(crew.scorer ? [] : [{ position: "scorer" as const, label: positionName("scorer", crew.digital) }]),
    ...(crew.assistantScorer ? [] : [{ position: "assistant_scorer" as const, label: POSITION_LABEL.assistant_scorer }]),
    ...(crew.timer ? [] : [{ position: "timer" as const, label: POSITION_LABEL.timer }]),
    ...(crew.assistantTimer ? [] : [{ position: "assistant_timer" as const, label: POSITION_LABEL.assistant_timer }]),
    ...(crew.shotClock ? [] : [{ position: "shot_clock" as const, label: POSITION_LABEL.shot_clock }]),
    ...(crew.timerShotClock ? [] : [{ position: "timer_shot_clock" as const, label: POSITION_LABEL.timer_shot_clock }]),
    ...(crew.stats < 3 ? [{ position: `statistician_${crew.stats + 1}` as Position, label: POSITION_LABEL[`statistician_${crew.stats + 1}` as Position] }] : []),
  ];

  return (
    <div className="flex flex-col gap-8">
      {/* Zaglavlje: datum kao semafor + ekipe */}
      <header className="flex items-start gap-4 sm:gap-6">
        <DateTile iso={match.starts_at} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] font-semibold text-fg-faint">
            <span>
              <span className="text-fg">{matchNo(match.number)}</span>, {match.competition?.name}
              {match.round ? `, ${match.round}. kolo` : ""}
            </span>
            {matchKindLabel(match.kind, match.kind_label) && <KindTag>{matchKindLabel(match.kind, match.kind_label)}</KindTag>}
            {match.status !== "scheduled" && (
              <Status tone={STATUS_TONE[match.status]} pulse={match.status === "live"}>
                {MATCH_STATUS_LABEL[match.status]}
              </Status>
            )}
          </div>
          <h1 className="mt-1 font-display text-[26px] font-semibold leading-tight tracking-[-0.03em] sm:text-[32px]">
            <TeamName name={match.home?.name ?? "Domaćin"} logoUrl={match.home?.club?.logo_url} wrap />
            <TeamName name={match.away?.name ?? "Gost"} logoUrl={match.away?.club?.logo_url} className="mt-2 text-fg-muted" wrap />
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
            badge={match.status === "live" ? <span className="font-medium">Osvježava se uživo</span> : undefined}
          />
        </Panel>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* Pozicije */}
        <section>
          <SectionTitle
            icon={<Users />}
            action={
              <span className={cx("scoreboard whitespace-nowrap text-[20px] font-semibold", filled === positions.length ? "text-mint" : "text-orange")}>
                {filled}/{positions.length}
              </span>
            }
          >
            Delegiranje
          </SectionTitle>
          <div className="flex flex-col gap-6">
          {groups.map((group) => (
          <div key={group.key ?? "all"}>
          {group.key && (
            <h3 className="pb-2 text-[13px] font-semibold text-fg-muted">{NOMINATION_GROUP_LABEL[group.key]}</h3>
          )}
          <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-panel shadow-panel [&>*]:px-4 sm:[&>*]:px-6">
            {group.positions.map((position) => {
              const current = active.find((a) => a.position === position);
              const declined = assignments.find((a) => a.position === position && a.status === "declined");
              return (
                <li key={position} className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:gap-4">
                  <div className="text-[13px] font-semibold text-fg-muted sm:w-32 sm:shrink-0">{positionName(position, crew.digital)}</div>
                  {current ? (
                    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-2">
                      {/* Na mobitelu ime u svom redu, dugmad ispod */}
                      <div className="min-w-0 flex-1 basis-full sm:basis-0">
                        <div className="truncate text-[17px] font-semibold">{current.profile!.full_name}</div>
                        <div className="mt-0.5">
                          {current.status === "accepted" ? (
                            <Status tone="mint">Prihvaćeno</Status>
                          ) : current.notified_at ? (
                            <Status tone="gold">Čeka odgovor</Status>
                          ) : (
                            <Status tone="muted">Nije aktivirano</Status>
                          )}
                        </div>
                      </div>
                      <ReplaceButton
                        assignmentId={current.id}
                        current={current.profile!.full_name}
                        position={positionName(position, crew.digital)}
                        notified={Boolean(current.notified_at)}
                        candidates={candidates.filter((c) => candidateFits(position, c) && !onMatch.has(c.id))}
                      />
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
                        candidates={candidates.filter((c) => candidateFits(position, c) && !onMatch.has(c.id))}
                        aside={
                          removable(position) && (
                            <form action={removePosition} className="shrink-0">
                              <input type="hidden" name="match_id" value={match.id} />
                              <input type="hidden" name="position" value={position} />
                              <ConfirmButton
                                label="Ukloni poziciju sa utakmice"
                                title="Ukloniti poziciju sa utakmice?"
                                message={`${positionName(position, crew.digital)} se uklanja samo s ove utakmice. Vraća se dugmetom „Dodaj poziciju”.`}
                                confirmLabel="Ukloni"
                                className="h-10 w-10 px-0"
                              >
                                <Trash2 className="size-4" aria-hidden="true" />
                              </ConfirmButton>
                            </form>
                          )
                        }
                      />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
          </div>
          ))}
          {positions.length === 0 && <Empty icon={<Users />}>Sastav ove utakmice nema nijednu poziciju. Dodaj je dugmetom ispod.</Empty>}
          <div className="flex justify-end">
            <AddPosition matchId={match.id} options={addable} />
          </div>
          </div>
        </section>

        {/* Bočno: slanje, trošak, bilten */}
        <aside className="flex flex-col gap-4 lg:sticky lg:top-36">
          <Panel className="flex flex-col gap-4 py-4 sm:py-5">
            <PublishMatch matchId={match.id} publishedAt={match.published_at} unpublished={unsentIn(null)} crew={active.length} />
            <p className="border-t border-line pt-3 text-[13px] text-fg-muted">{crewSummary(crew)}</p>
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

          {sheets.length > 0 && (
            <Panel className="py-4 sm:py-5">
              <h2 className="flex items-center gap-1.5 text-[13px] font-semibold text-fg-muted">
                <FileImage className="size-4" aria-hidden="true" />
                Zapisnik
              </h2>
              <ul className="mt-3 grid grid-cols-3 gap-2">
                {sheets.map((s, i) => (
                  <li key={s.path}>
                    <a href={s.url} target="_blank" rel="noopener" className="block overflow-hidden rounded-md border border-line bg-panel-2 hover:opacity-90">
                      {/* eslint-disable-next-line @next/next/no-img-element -- privremeni potpisani link iz Storagea */}
                      <img src={s.url} alt={`Zapisnik, slika ${i + 1}`} className="aspect-[3/4] w-full object-cover" />
                    </a>
                  </li>
                ))}
              </ul>
            </Panel>
          )}

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
      <details className="group overflow-hidden rounded-lg border border-line bg-panel shadow-panel px-4 sm:px-6">
        <summary className="-mx-4 flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-4 transition-colors sm:-mx-6 sm:px-6 font-display text-[20px] font-semibold hover:bg-panel-2 [&::-webkit-details-marker]:hidden">
          Uredi utakmicu
          <ChevronDown className="size-5 text-fg-faint transition-transform group-open:rotate-180" />
        </summary>
        <div className="border-t border-line py-4 sm:py-6">
          <Suspense fallback={<MatchFormSkeleton edit />}>
            <EditMatch match={match} />
          </Suspense>
          <form action={deleteMatch} className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
            <input type="hidden" name="id" value={match.id} />
            <p className="text-[13px] text-fg-muted">Brisanje uklanja utakmicu i sva delegiranja na njoj.</p>
            <ConfirmButton variant="danger" title="Obrisati utakmicu?" message="Brišu se i sva delegiranja na njoj." confirmLabel="Obriši">
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
        number: match.number,
        kind: match.kind,
        kind_label: match.kind_label,
        competition_id: match.competition_id,
        round: match.round,
        home_team_id: match.home_team_id,
        away_team_id: match.away_team_id,
        hall_id: match.hall_id,
        date,
        time,
        crew: crewOf(match),
        status: match.status,
        notes: match.notes,
        published_at: match.published_at,
      }}
    />
  );
}

/** Kao delegiranje: zaglavlje utakmice, pozicije (dodijeljene i prazne), bočni paneli i "Uredi utakmicu" */
function DelegationSkeleton() {
  return (
    <Skeleton className="flex flex-col gap-8">
      <div className="flex items-start gap-4 sm:gap-6">
        <DateTileSkeleton size="lg" />
        <div className="min-w-0 flex-1">
          <Text className="text-[13px] font-semibold" w="w-56" />
          <div className="mt-1 font-display text-[26px] font-semibold leading-tight sm:text-[32px]">
            <TeamNameSkeleton w="w-56" />
            <TeamNameSkeleton w="w-48" className="mt-2" />
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[14px]">
            <Bone className="size-4 shrink-0 rounded-full" />
            <Text w="w-36" />
          </div>
        </div>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section>
          <SectionTitle icon={<Users />} action={<Text className="scoreboard text-[20px] font-semibold" w="w-10" />}>
            Delegiranje
          </SectionTitle>
          <ul className={ROWS}>
            {times(5, (i) => (
              <li key={i} className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:gap-4">
                <Text className="text-[13px] font-semibold sm:w-32 sm:shrink-0" w="w-20" />
                {i < 2 ? (
                  <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-2">
                    <div className="min-w-0 flex-1 basis-full sm:basis-0">
                      <Text className="text-[17px] font-semibold" w={i ? "w-36" : "w-44"} />
                      <div className="mt-0.5">
                        <StatusSkeleton w="w-20" />
                      </div>
                    </div>
                    <ButtonSkeleton className="h-10 w-24 sm:h-10" />
                    <TextButtonSkeleton />
                  </div>
                ) : (
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <div className="flex min-w-0 gap-2">
                      <span aria-hidden className="block h-11 min-w-0 flex-1 rounded-lg border border-line-strong bg-panel sm:h-10" />
                      <ButtonSkeleton className="w-24" />
                    </div>
                    <Text className="text-[12px]" w="w-28" />
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>

        <aside className="flex flex-col gap-4">
          <Panel className="flex flex-col gap-4 py-4 sm:py-5">
            <div className="flex flex-col gap-2">
              <Text className="text-[13px]" w="w-56" />
              <ButtonSkeleton className="w-full" />
            </div>
            <Text className="border-t border-line pt-3 text-[13px]" w="w-48" />
          </Panel>
          <Panel className="py-4 sm:py-5">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-[13px] font-semibold text-fg-muted">Trošak utakmice</span>
              <Text className="scoreboard text-[22px] font-semibold leading-none" w="w-24" />
            </div>
            <ul className="mt-3 flex flex-col gap-2 border-t border-line pt-3 text-[14px]">
              {times(3, (i) => (
                <li key={i} className="flex items-baseline justify-between gap-3">
                  <span className="min-w-0">
                    <Text className="font-semibold" w="w-24" />
                    <Text className="text-[13px]" w="w-20" />
                  </span>
                  <Text className="scoreboard text-[18px] font-semibold" w="w-16" />
                </li>
              ))}
            </ul>
          </Panel>
          <div className="grid grid-cols-2 gap-2">
            <ButtonSkeleton />
            <ButtonSkeleton />
          </div>
        </aside>
      </div>

      <div className="flex items-center justify-between gap-3 rounded-lg border border-line bg-panel px-4 py-4 shadow-panel sm:px-6">
        <span className="font-display text-[20px] font-semibold">Uredi utakmicu</span>
        <Bone className="size-5" />
      </div>
    </Skeleton>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CalendarDays, ChevronLeft, MapPin, Printer, Users, ClipboardList, FileImage, Radio, Wallet } from "lucide-react";
import { getMatchPage } from "@/lib/data/report";
import { listScoresheets } from "@/lib/scoresheets";
import { formatDayMonth, formatTime, formatWeekday, matchNo, MATCH_STATUS_LABEL, scoreUndoUntil, type MatchStatus } from "@/lib/format";
import { Bone, Skeleton, StatusSkeleton, Text, times } from "@/components/skeleton";
import { CrewList, CrewListSkeleton } from "@/components/crew-list";
import { Button, buttonClass, cx, SectionTitle, Status } from "@/components/ui";
import { setStatus } from "./actions";
import { BiltenForm } from "./bilten-form";
import { FinalScoreForm } from "./final-score-form";
import { QuarterScoreForm } from "./quarter-score-form";
import { FinishButton } from "./finish-button";
import { LockMatchButton } from "@/components/lock-match-button";
import { MatchPaidButton } from "@/components/match-paid-button";
import { BoxScore } from "@/components/match-line";
import { usesQuarterPoints } from "@/lib/quarter-points";
import { AdminScoreForm } from "./admin-score-form";
import { FinalScore, ScoreBoard } from "./score-board";
import { Scoresheets } from "./scoresheets";
import { FibaMatchForm } from "@/app/(app)/fiba/link-match";

export const metadata = { title: "Utakmica — KSKS" };

type Params = Promise<{ id: string }>;

const STATUS_TONE: Record<MatchStatus, "crest" | "mint" | "muted" | "orange"> = {
  scheduled: "muted",
  live: "crest",
  finished: "mint",
  postponed: "orange",
  cancelled: "orange",
};

export default function MatchPage({ params }: { params: Params }) {
  return (
    <>
      <Link
        href="/utakmice"
        className="-ml-2 mb-4 inline-flex h-10 items-center gap-1 rounded-md pl-1 pr-3 text-[15px] font-semibold text-fg-muted hover:bg-panel hover:text-fg"
      >
        <ChevronLeft className="size-5" /> Moje utakmice
      </Link>
      <Suspense fallback={<MatchSkeleton />}>
        <Match params={params} />
      </Suspense>
    </>
  );
}

async function Match({ params }: { params: Params }) {
  const { id } = await params;
  const page = await getMatchPage(id);
  if (!page) notFound();
  const { user, match, crew, periods, report, isAdmin, isCommissioner, isTable, isReferee } = page;

  const canScore = isCommissioner || isAdmin;
  const open = match.status !== "cancelled" && match.status !== "postponed";
  // Povezana FIBA LiveStats utakmica: četvrtine se same prepisuju iz FIBA (pg_cron svake minute), niko ih ne unosi
  const fiba = match.fiba_game_id != null;
  // Minibasket: rezultat su bodovi četvrtina; koševi sve 4 četvrtine se upisuju odjednom na kraju utakmice
  const quarters = usesQuarterPoints(match.competition?.category);
  // Bez komesara (i bez četvrtina) vodi se samo konačni rezultat: upisuje ga pomoćni sudija sa zapisnika
  const finalOnly = quarters || (!fiba && periods.length === 0 && (match.home_score != null || !match.has_commissioner));
  // Rezultat upisuje pomoćni sudija (kad nema komesara); na Minibasketu sudije ili pomoćne sudije. Smiju ga ispraviti ili poništiti još 24 sata nakon upisa
  const crewScores = !isAdmin && (quarters ? isTable || isReferee : isTable && !match.has_commissioner);
  const undoUntil = crewScores && match.status === "finished" ? scoreUndoUntil(match.score_entered_at) : null;
  // Upisuju rezultat dok ga nema (i kad je sudija već označio utakmicu završenom) ili dok traje rok za ispravku
  const canFinal = !fiba && open && crewScores && (match.home_score == null || undoUntil !== null);
  // Savez ispravlja rezultat svake utakmice koja nije u toku (u toku se unosi na semaforu): po četvrtinama ili samo konačni.
  // FIBA utakmica samo po četvrtinama (konačni bi FIBA ponovo prepisala), Unobasket samo konačni (broj dobijenih četvrtina)
  const adminFix = isAdmin && open && match.status !== "live";
  // Zaključavanje bez unosa rezultata: sudije i sto na svojoj stranici, savez uvijek; utakmicu u toku završava komesar
  const canLock = open && match.status !== "finished" && (isAdmin || ((isReferee || isTable) && match.status !== "live"));
  // Slike zapisnika: savez, komesar, pomoćne sudije i sudije (svi prihvaćeni na utakmici)
  const scoresheetAccess = isAdmin || isCommissioner || isTable || isReferee;
  const sheets = scoresheetAccess ? await listScoresheets(match.id) : [];
  // FIBA LiveStats link i pristupni kod: delegirani upisuju ono čega nema (savez ih mijenja na admin stranici utakmice); komesar ovo ne vidi
  const canFiba = open && !isAdmin && !isCommissioner && scoresheetAccess && (match.fiba_game_id == null || !match.fiba_stream_key);
  // Isplata: bilo ko prihvaćen na utakmici (sudija, sto, komesar) ili savez. Isplaćena = sva prihvaćena delegiranja isplaćena
  const canPay = isAdmin || isReferee || isTable || isCommissioner;
  const accepted = crew.filter((c) => c.status === "accepted");
  const allPaid = accepted.length > 0 && accepted.every((c) => c.paid_at);
  const showBilten = isCommissioner || isAdmin || !!report?.submitted_at;
  const canPrint = showBilten && !!report;
  const canFinish = canScore && !finalOnly && match.status === "live";
  const homeName = match.home?.name ?? "Domaćin";
  const awayName = match.away?.name ?? "Gost";

  return (
    <div className="flex flex-col gap-10">
      {/* Semafor */}
      <section className="rounded-lg border border-line bg-panel shadow-panel px-4 sm:px-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line py-3">
          <span className="text-[13px] font-semibold text-fg-muted">
            <span className="text-fg">{matchNo(match.number)}</span>, {match.competition?.name}
            {match.round ? `, ${match.round}. kolo` : ""}
          </span>
          <Status tone={STATUS_TONE[match.status]} pulse={match.status === "live"}>
            {match.status === "live" ? "Uživo" : MATCH_STATUS_LABEL[match.status]}
          </Status>
        </div>
        <div className="pb-5 pt-4 sm:pb-8 sm:pt-6">
          {quarters && periods.length > 0 ? (
            <BoxScore size="lg" match={match} periods={periods} />
          ) : finalOnly ? (
            <FinalScore homeName={homeName} awayName={awayName} homeLogoUrl={match.home?.club?.logo_url ?? null} awayLogoUrl={match.away?.club?.logo_url ?? null} home={match.home_score} away={match.away_score} />
          ) : (
            <ScoreBoard
              matchId={match.id}
              homeName={homeName}
              awayName={awayName}
              homeLogoUrl={match.home?.club?.logo_url ?? null}
              awayLogoUrl={match.away?.club?.logo_url ?? null}
              initial={periods}
              canEdit={!fiba && (isAdmin || isCommissioner) && match.status === "live"}
            />
          )}
          {fiba && (
            <p className="pt-3 text-[14px] text-fg-muted">
              Rezultat se automatski preuzima s FIBA LiveStats (svake minute){isAdmin ? "; savez ga može ispraviti u dijelu Zapisnik." : ", ne unosi se ručno."}
            </p>
          )}
          {!fiba && isCommissioner && !isAdmin && match.status === "scheduled" && (
            <p className="pt-3 text-[14px] text-fg-muted">Rezultat se unosi kad započneš utakmicu.</p>
          )}
          {!fiba && isCommissioner && !isAdmin && match.status === "finished" && (
            <p className="pt-3 text-[14px] text-fg-muted">Utakmica je završena. Za ispravku rezultata javi se savezu.</p>
          )}
          {/* FIBA utakmicu pokreće sync (prva akcija na LiveStats), pa nema "Počni utakmicu"; "Završi utakmicu" je na dnu stranice */}
          {canScore && !finalOnly && match.status === "scheduled" && !fiba && (
            <div className="mt-5 border-t border-line pt-5">
              <form action={setStatus}>
                <input type="hidden" name="match_id" value={match.id} />
                <input type="hidden" name="status" value="live" />
                <Button type="submit" className="w-full sm:w-auto">
                  Počni utakmicu
                </Button>
              </form>
            </div>
          )}
          {canLock && (
            <div className="mt-5 border-t border-line pt-5">
              <LockMatchButton matchId={match.id} className="sm:w-auto" />
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-2 border-t border-line py-3 text-[14px] text-fg-muted">
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="size-4" />
            <span className="capitalize">{formatWeekday(match.starts_at)}</span> {formatDayMonth(match.starts_at)} u {formatTime(match.starts_at)}
          </span>
          {match.hall && (
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="size-4" /> {match.hall.name}
            </span>
          )}
          {match.fiba_game_id && (
            <Link href={`/fiba/${match.fiba_game_id}`} className="inline-flex items-center gap-1.5 font-semibold text-fg hover:underline">
              <Radio className="size-4" /> FIBA statistika uživo
            </Link>
          )}
          {match.fiba_stream_key && (
            <span className="inline-flex items-center gap-1.5">
              FIBA LiveStats kod: <span className="select-all font-mono font-semibold text-fg">{match.fiba_stream_key}</span>
            </span>
          )}
        </div>
        {match.notes && <p className="border-t border-line py-3 text-[14px]">{match.notes}</p>}
      </section>

      {canFiba && (
        <section>
          <SectionTitle icon={<Radio />}>FIBA LiveStats</SectionTitle>
          <div className="rounded-lg border border-line bg-panel px-4 py-5 shadow-panel sm:px-6">
            <p className="mb-4 text-[14px] text-fg-muted">Ako utakmica ide na FIBA LiveStats, upiši link utakmice i pristupni kod. Rezultat se onda preuzima automatski.</p>
            <FibaMatchForm matchId={match.id} fibaGameId={match.fiba_game_id} streamKey={match.fiba_stream_key} fillOnly />
          </div>
        </section>
      )}

      {scoresheetAccess && (
        <section>
          <SectionTitle icon={<FileImage />} count={sheets.length}>
            Zapisnik
          </SectionTitle>
          <div className="flex flex-col gap-5 rounded-lg border border-line bg-panel px-4 py-5 shadow-panel sm:px-6">
            {adminFix && (
              <div>
                <h3 className="mb-3 text-[13px] font-semibold text-fg-muted">Ispravka rezultata (savez)</h3>
                <AdminScoreForm
                  key={`${match.home_score}:${match.away_score}:${periods.length}`}
                  matchId={match.id}
                  homeName={homeName}
                  awayName={awayName}
                  homeLogoUrl={match.home?.club?.logo_url ?? null}
                  awayLogoUrl={match.away?.club?.logo_url ?? null}
                  periods={periods}
                  home={match.home_score}
                  away={match.away_score}
                  quarterPointsLeague={quarters}
                  allowQuarters={match.competition?.category !== "unobasket"}
                  allowFinal={!fiba}
                />
                {fiba && (
                  <p className="mt-3 text-[14px] text-fg-muted">Ispravljene četvrtine FIBA LiveStats više ne prepisuje.</p>
                )}
              </div>
            )}
            {canFinal && quarters && (
              <div>
                <h3 className="mb-3 text-[13px] font-semibold text-fg-muted">Rezultat po četvrtinama sa zapisnika</h3>
                {/* key: nakon poništavanja forma kreće ispočetka (prazna polja, bez stare poruke) */}
                <QuarterScoreForm
                  key={match.home_score == null ? "new" : "entered"}
                  matchId={match.id}
                  homeName={homeName}
                  awayName={awayName}
                  homeLogoUrl={match.home?.club?.logo_url ?? null}
                  awayLogoUrl={match.away?.club?.logo_url ?? null}
                  periods={periods}
                  entered={match.home_score != null}
                  byCrew={crewScores}
                  undoUntil={undoUntil}
                />
              </div>
            )}
            {canFinal && !quarters && (
              <div>
                <h3 className="mb-3 text-[13px] font-semibold text-fg-muted">Konačni rezultat sa zapisnika</h3>
                {/* key: nakon poništavanja forma kreće ispočetka (prazna polja, bez stare poruke) */}
                <FinalScoreForm
                  key={match.home_score == null ? "new" : "entered"}
                  matchId={match.id}
                  homeName={homeName}
                  awayName={awayName}
                  homeLogoUrl={match.home?.club?.logo_url ?? null}
                  awayLogoUrl={match.away?.club?.logo_url ?? null}
                  home={match.home_score}
                  away={match.away_score}
                  byTable={crewScores}
                  hint={match.competition?.category === "unobasket" ? "Upisuje se broj dobijenih četvrtina, npr. 3:1 (svaka dobijena četvrtina je bod)." : undefined}
                  undoUntil={undoUntil}
                />
              </div>
            )}
            {!fiba && crewScores && open && !canFinal && (
              <p className="text-[14px] text-fg-muted">Rezultat je upisan i utakmica je završena. Za ispravku se javi savezu.</p>
            )}
            <div className={cx((canFinal || adminFix) && "border-t border-line pt-5")}>
              <h3 className="mb-3 text-[13px] font-semibold text-fg-muted">
                Slike zapisnika, statistike i sl. <span className="font-normal text-faint">(nije obavezno)</span>
              </h3>
              <Scoresheets matchId={match.id} sheets={sheets} canEdit={open} />
            </div>
          </div>
        </section>
      )}

      {canPay && accepted.length > 0 && (
        <section>
          <SectionTitle icon={<Wallet />}>Isplata</SectionTitle>
          <div className="rounded-lg border border-line bg-panel px-4 py-5 shadow-panel sm:px-6">
            {!allPaid && (
              <p className="mb-4 text-[14px] text-fg-muted">Naknade još nisu isplaćene. Kad klub isplati službena lica, označi utakmicu isplaćenom.</p>
            )}
            <MatchPaidButton matchId={match.id} paid={allPaid} className="sm:w-auto" />
          </div>
        </section>
      )}

      <section>
        <SectionTitle icon={<Users />} count={crew.length}>Službena lica</SectionTitle>
        <div className="overflow-hidden rounded-lg border border-line bg-panel px-4 shadow-panel sm:px-6">
          <CrewList
            bare
            match={match}
            crew={crew.map((c) => ({ position: c.position, status: c.status, name: c.profile!.full_name, phone: c.profile!.phone }))}
            mine={crew.find((c) => c.profile_id === user.id)?.position}
          />
        </div>
      </section>

      {showBilten && (
        <section>
          <SectionTitle icon={<ClipboardList />}>Bilten</SectionTitle>
          {isCommissioner || isAdmin ? (
            <BiltenForm matchId={match.id} homeName={homeName} awayName={awayName} homeLogoUrl={match.home?.club?.logo_url ?? null} awayLogoUrl={match.away?.club?.logo_url ?? null} values={report} isAdmin={isAdmin} />
          ) : (
            <p className="rounded-lg border border-line bg-panel shadow-panel px-4 sm:px-5 py-6 text-[15px] text-fg-muted">
              Komesar je poslao bilten.
            </p>
          )}
        </section>
      )}

      {/* Na dnu, poslije svega što se upisuje (statistika, slike, bilten) */}
      {(canPrint || canFinish) && (
        <div className="flex flex-col gap-3 sm:items-end">
          {canFinish && (
            <p className="text-[13px] text-fg-muted sm:text-right">
              „Završi utakmicu” je odvojeno od biltena — samo označava da je utakmica odigrana i vodi se kao završena (u prošlim utakmicama).
              Savezu se time ne šalje nikakav mail; bilten pošalji posebno, iznad.
            </p>
          )}
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-end">
            {canPrint && (
              <Link href={`/bilten/${match.id}`} className={buttonClass("secondary")}>
                <Printer className="size-4" /> Za štampu
              </Link>
            )}
            {canFinish && <FinishButton matchId={match.id} />}
          </div>
        </div>
      )}
    </div>
  );
}

/** Kao stranica utakmice: semafor s četvrtinama, termin, pa službena lica */
function MatchSkeleton() {
  return (
    <Skeleton className="flex flex-col gap-10">
      <section className="rounded-lg border border-line bg-panel px-4 shadow-panel sm:px-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line py-3">
          <Text className="text-[13px] font-semibold" w="w-56" />
          <StatusSkeleton w="w-14" />
        </div>
        <div className="pb-5 pt-4 sm:pb-8 sm:pt-6">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 py-2 text-center sm:gap-6">
            {times(2, (i) => (
              <div key={i} className={cx("min-w-0", i > 0 && "order-last")}>
                <Text className="scoreboard text-[clamp(52px,19vw,84px)] font-semibold leading-[0.9] sm:text-[112px] lg:text-[128px]" w="w-[1.2em]" />
                <span className="mt-3 flex flex-col items-center justify-center gap-2 font-display text-[17px] font-semibold leading-tight sm:flex-row sm:text-[22px]">
                  <Bone className="h-8 w-12 shrink-0" />
                  <Text w="w-24" />
                </span>
              </div>
            ))}
            <div className="scoreboard pb-6 text-[40px] font-semibold text-fg-faint sm:text-[64px]">:</div>
          </div>
          <div className="mt-4 rounded-lg border border-line bg-panel px-4 sm:px-5">
            <div className="grid grid-cols-[3.25rem_1fr_1fr_2.75rem] items-center gap-2 border-b border-line px-3 py-2 text-[12px] font-semibold text-fg-faint sm:grid-cols-[8rem_1fr_1fr_2.75rem] sm:px-4">
              <span>Period</span>
              {times(2, (i) => (
                <span key={i} className="flex min-w-0 flex-col items-center justify-center gap-2 sm:flex-row">
                  <Bone className="h-8 w-12 shrink-0" />
                  <Text w="w-16" />
                </span>
              ))}
              <span aria-hidden />
            </div>
            <ul className="divide-y divide-line">
              {times(4, (i) => (
                <li key={i} className="grid grid-cols-[3.25rem_1fr_1fr_2.75rem] items-center gap-2 px-3 py-2 sm:grid-cols-[8rem_1fr_1fr_2.75rem] sm:px-4">
                  <Text className="scoreboard text-[20px] font-semibold sm:text-[15px]" w="w-8 sm:w-20" />
                  <Text className="scoreboard py-2 text-center text-[26px] font-semibold" w="w-8" />
                  <Text className="scoreboard py-2 text-center text-[26px] font-semibold" w="w-8" />
                  <span aria-hidden />
                </li>
              ))}
            </ul>
          </div>
          <Text className="mt-3 text-[13px]" w="w-48" />
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-2 border-t border-line py-3 text-[14px]">
          <span className="inline-flex items-center gap-1.5">
            <Bone className="size-4" />
            <Text w="w-40" />
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Bone className="size-4 rounded-full" />
            <Text w="w-32" />
          </span>
        </div>
      </section>

      <section>
        <SectionTitle icon={<Users />}>
          Službena lica
          <span className="inline-flex min-w-6 shrink-0 items-center justify-center rounded-md border border-line bg-panel px-1.5 py-0.5 text-[12px]">
            <Text w="w-2" />
          </span>
        </SectionTitle>
        <div className="overflow-hidden rounded-lg border border-line bg-panel px-4 shadow-panel sm:px-6">
          <CrewListSkeleton bare />
        </div>
      </section>
    </Skeleton>
  );
}

import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { Plus, CalendarDays, ChevronLeft, ChevronRight, FileImage, FileText } from "lucide-react";
import { delegatedHere, getAdminMatches, getCompetitions, getHalls, overviewEnd, type MatchPayment } from "@/lib/data/admin";
import { matchesLabel } from "@/lib/finance";
import { dayKey, formatDayHeading, formatTime, formatWeekday, isoToSarajevo, MATCH_STATUS_LABEL, MONTHS_SHORT } from "@/lib/format";
import { FilterContent, FilterNavProvider, FilterSegment, PageLink, PageStep } from "@/components/filter-nav";
import { LiveRefresh } from "@/components/live-refresh";
import { PublishSelection, SelectAll, SelectMatch, type Incomplete } from "@/components/publish";
import { CrewLine } from "@/components/crew-line";
import { MatchLine } from "@/components/match-line";
import { StaffingCrew, StaffingTab } from "@/components/staffing-badge";
import { matchesWithScoresheets } from "@/lib/scoresheets";
import { MatchLineSkeleton, SegmentsSkeleton, Skeleton, StatusSkeleton, Text, times } from "@/components/skeleton";
import { ButtonLink, cx, Empty, PageHeader, Rows, ROWS, Segments, Status } from "@/components/ui";
import { QuickAssign } from "./quick-assign";
import { ScheduleEdit } from "./schedule-edit";
import { paginateDays, pageRange } from "@/lib/paginate";

export const metadata = { title: "Utakmice — KSKS" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default function AdminMatchesPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <>
      <PageHeader icon={<CalendarDays />} title="Utakmice" subtitle="Raspored po danima. Otvori utakmicu da delegiraš sudije, sto i komesara.">
        <ButtonLink href="/admin/utakmice/satnice" variant="secondary">
          <FileText className="size-4" aria-hidden="true" />
          Satnice (PDF)
        </ButtonLink>
        <ButtonLink href="/admin/utakmice/nova">
          <Plus className="size-5" strokeWidth={2.2} />
          Nova utakmica
        </ButtonLink>
      </PageHeader>
      <Suspense fallback={<MatchesSkeleton />}>
        <Matches searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Matches({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const competitionId = typeof sp.takmicenje === "string" ? sp.takmicenje : undefined;
  const past = sp.prikaz === "odigrane";

  const [competitions, all, withSheets, halls] = await Promise.all([
    getCompetitions(),
    getAdminMatches({ when: past ? "past" : "upcoming", competitionId }),
    matchesWithScoresheets(),
    past ? [] : getHalls(),
  ]);

  // Novi filter vraća na prvu stranicu
  const href = (p: { takmicenje?: string; prikaz?: string; strana?: number }) => {
    const q = new URLSearchParams();
    const t = "takmicenje" in p ? p.takmicenje : competitionId;
    const v = "prikaz" in p ? p.prikaz : past ? "odigrane" : undefined;
    if (t) q.set("takmicenje", t);
    if (v) q.set("prikaz", v);
    if (p.strana && p.strana > 1) q.set("strana", String(p.strana));
    const s = q.toString();
    return `/admin/utakmice${s ? `?${s}` : ""}`;
  };

  // Aktivirane zakazane utakmice narednih OVERVIEW_DAYS dana su na Pregledu; ovdje ostaju one koje tek treba aktivirati i kasnije aktivirane.
  // Predstojeće van Sarajeva (A2 liga jug, A1 žene) KSKS ne delegira
  const end = overviewEnd();
  const matches = past ? all : all.filter((m) => delegatedHere(m) && !(m.status === "scheduled" && m.published_at && m.starts_at < end));
  const allActivated = matches.length === 0 && all.length > 0;

  // Grupisanje po danu (sarajevsko vrijeme)
  const days = new Map<string, typeof matches>();
  for (const m of matches) {
    const day = dayKey(m.starts_at);
    days.set(day, [...(days.get(day) ?? []), m]);
  }

  const pages = paginateDays([...days]);
  const requested = Number(sp.strana);
  const page = Number.isInteger(requested) && requested >= 1 && requested <= pages.length ? requested : 1;
  const shown = pages[page - 1] ?? [];

  const live = matches.filter((m) => m.status === "live").map((m) => m.id);
  // Aktiviranje (objava nominacije) ima smisla samo za utakmice koje tek dolaze
  const unpublished = (list: typeof matches) => list.filter((m) => m.status === "scheduled" && !m.published_at).map((m) => m.id);
  // Za napomenu u traci kad je označena utakmica bez svih službenih lica
  const incomplete: Incomplete = Object.fromEntries(
    matches
      .filter((m) => m.status === "scheduled" && m.staffing.missing.length > 0)
      .map((m) => [m.id, { label: `${m.home?.name ?? "—"} – ${m.away?.name ?? "—"}`, missing: m.staffing.missing.length }]),
  );

  const content = (
    <FilterNavProvider>
      <div className="flex flex-col gap-8">
        <LiveRefresh matchIds={live} />
        <div className="flex flex-col gap-3">
          <Segments>
            <FilterSegment href={href({ prikaz: undefined })} param="prikaz" active={!past}>
              Predstoje
            </FilterSegment>
            <FilterSegment href={href({ prikaz: "odigrane" })} param="prikaz" value="odigrane" active={past}>
              Odigrane
            </FilterSegment>
          </Segments>
          <Segments>
            <FilterSegment href={href({ takmicenje: undefined })} param="takmicenje" active={!competitionId}>
              Sva takmičenja
            </FilterSegment>
            {competitions.map((c) => (
              <FilterSegment key={c.id} href={href({ takmicenje: c.id })} param="takmicenje" value={c.id} active={competitionId === c.id}>
                {c.short_name ?? c.name}
              </FilterSegment>
            ))}
          </Segments>
        </div>

        <FilterContent fallback={<DaysSkeleton />}>
          {matches.length === 0 ? (
            <Empty
              icon={<Image src="/brand/calendar-icon.webp" alt="" width={40} height={40} className="size-10" />}
              action={allActivated ? <ButtonLink href="/admin" variant="secondary">Pregled</ButtonLink> : !past && <ButtonLink href="/admin/utakmice/nova">Nova utakmica</ButtonLink>}
            >
              {past
                ? "Nema odigranih utakmica za ovaj izbor."
                : allActivated
                  ? "Sve predstojeće utakmice za ovaj izbor su aktivirane. Nalaze se na Pregledu."
                  : "Nema zakazanih utakmica za ovaj izbor. Dodaj utakmicu ili napravi raspored u Takmičenjima."}
            </Empty>
          ) : (
            shown.map(([day, list]) => (
              <section key={day}>
                <h2 className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 pb-3">
                  <span className="font-display text-[20px] font-semibold tracking-[-0.02em] sm:text-[22px]">{formatDayHeading(day)}</span>
                  <span className="flex items-baseline gap-4">
                    {!past && <SelectAll ids={unpublished(list)} />}
                    <span className="text-[13px] font-semibold text-fg-faint">{matchesLabel(list.length)}</span>
                  </span>
                </h2>
                <Rows>
                  {list.map((m) => {
                    // Termin i dvorana se mijenjaju odmah iz liste (zakazane i odgođene, dok nisu aktivirane); aktivirana samo pokazuje dvoranu
                    const editable = !past && !m.published_at && (m.status === "scheduled" || m.status === "postponed");
                    const sheet = withSheets.has(m.id) && m.status !== "scheduled";
                    const statusMark = m.status === "postponed" || m.status === "cancelled" || (m.status === "finished" && m.periods.length === 0);
                    // Isplata samo za utakmice koje su se igrale (odgođena/otkazana se ne plaća)
                    const payMark = m.status !== "postponed" && m.status !== "cancelled" && m.payment.state !== "none";
                    // Delegiranje po poziciji bez otvaranja utakmice (samo zakazane)
                    const quick = editable && m.status === "scheduled";
                    const label = `${m.home?.name ?? "—"} – ${m.away?.name ?? "—"}`;
                    const crewButtons = (className: string) => (
                      <QuickAssign matchId={m.id} slots={m.slots} digital={m.digital_scoresheet} label={label} className={className} />
                    );
                    return (
                      <li
                        key={m.id}
                        className={cx(
                          "relative flex items-center gap-3 transition-colors sm:gap-4",
                          // Odgođena: druga boja kartice
                          m.status === "postponed" ? "bg-orange/8 hover:bg-orange/12" : "hover:bg-panel-2",
                          m.status === "scheduled" && "pt-5 sm:pt-0",
                          // Telefon: pozicije za delegiranje u svom redu preko cijele kartice
                          quick && "flex-wrap gap-y-0 md:flex-nowrap",
                        )}
                      >
                        {m.status === "scheduled" && <StaffingTab match={m} staffing={m.staffing} publishedAt={m.published_at} fiba={m.fiba} />}
                        {/* Datum je dugme za označavanje (aktiviranje), ostatak reda otvara utakmicu */}
                        {!past && m.status === "scheduled" && <SelectMatch id={m.id} iso={m.starts_at} label={`${m.home?.name} – ${m.away?.name}`} />}
                        <div className="flex min-w-0 flex-1 flex-col">
                          <div className="flex min-w-0 flex-1 items-start gap-2">
                            <Link href={`/admin/utakmice/${m.id}`} className={cx("flex min-w-0 flex-1 items-center gap-3 py-4", editable && "pb-2.5")}>
                              <MatchLine
                                match={m}
                                hideDate={!past && m.status === "scheduled"}
                                hideTime={m.status === "postponed"}
                                hideHall={editable}
                                hideLabelOnMobile={m.status === "scheduled"}
                                periods={m.status === "live" || (m.status === "finished" && m.periods.length > 0) ? m.periods : undefined}
                                showScore={past}
                                // Zakazane imaju delegirane desno (StaffingCrew); uživo ekipa ide u liniju ispod
                                meta={!past && m.status === "live" ? <CrewLine slots={m.slots} digital={m.digital_scoresheet} /> : undefined}
                                badge={
                                  <>
                                    {m.status === "live" ? (
                                      <Status tone="crest" pulse>
                                        Uživo
                                      </Status>
                                    ) : m.status === "finished" && m.periods.length > 0 ? (
                                      <Status tone="muted">Kraj</Status>
                                    ) : undefined}
                                    {!past && m.clubs_notified_at && <Status tone="mint">Raspored poslan klubovima</Status>}
                                  </>
                                }
                                aside={
                                  past ? (
                                    // Ko je radio utakmicu (kao na Pregledu), iznad zapisnik, stanje i isplata
                                    <div className="flex flex-col items-start gap-1.5 sm:items-end">
                                      {(sheet || statusMark || payMark) && (
                                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                          {sheet && <SheetMark />}
                                          {statusMark && <Status tone={m.status === "finished" ? "muted" : "orange"}>{MATCH_STATUS_LABEL[m.status]}</Status>}
                                          {payMark && <PaymentMark payment={m.payment} />}
                                        </div>
                                      )}
                                      <StaffingCrew staffing={m.staffing} tabbed={false} />
                                    </div>
                                  ) : withSheets.has(m.id) && m.status !== "scheduled" ? (
                                    <SheetMark />
                                  ) : m.status === "scheduled" ? (
                                    <StaffingCrew staffing={m.staffing} />
                                  ) : m.status === "postponed" || m.status === "cancelled" || (m.status === "finished" && m.periods.length === 0) ? (
                                    <Status tone={m.status === "finished" ? "muted" : "orange"} size={m.status === "postponed" ? "lg" : undefined}>
                                      {MATCH_STATUS_LABEL[m.status]}
                                    </Status>
                                  ) : undefined
                                }
                              />
                            </Link>
                            {/* Telefon: dugmad ispod su samo ikonice, pa se termin i dvorana čitaju gore desno */}
                            {editable && <ScheduleText iso={m.starts_at} hall={m.hall?.name ?? null} hideTime={m.status === "postponed"} />}
                          </div>
                          {editable && (
                            <div className={cx("flex flex-wrap items-center gap-x-3 gap-y-2", quick ? "pb-2.5 md:pb-4" : "pb-4")}>
                              <ScheduleEdit id={m.id} iso={m.starts_at} hallId={m.hall?.id ?? null} halls={halls} label={label} hideTime={m.status === "postponed"} />
                              {quick && crewButtons("hidden border-l border-line pl-3 md:flex")}
                            </div>
                          )}
                        </div>
                        {quick && crewButtons("flex basis-full pb-4 md:hidden [&>span]:flex-1 [&_button]:w-full")}
                      </li>
                    );
                  })}
                </Rows>
              </section>
            ))
          )}
        </FilterContent>

        {pages.length > 1 && (
          <nav aria-label="Stranice rasporeda" className="flex items-center justify-center gap-2 pt-2 sm:gap-3">
            <PageStep href={page > 1 ? href({ strana: page - 1 }) : null} label="Prethodna stranica">
              <ChevronLeft className="size-5" />
            </PageStep>
            <div className="-my-1 min-w-0 overflow-x-auto py-1 [scrollbar-width:none]">
              <div className="inline-flex gap-0.5 rounded-lg bg-track p-[3px]">
                {pages.map((p, i) => (
                  <PageLink key={i} href={href({ strana: i + 1 })} page={i + 1} active={page === i + 1}>
                    <span className="scoreboard text-[18px] font-semibold leading-tight">{i + 1}</span>
                    <span className="whitespace-nowrap text-[12px] font-semibold">{pageRange(p)}</span>
                  </PageLink>
                ))}
              </div>
            </div>
            <PageStep href={page < pages.length ? href({ strana: page + 1 }) : null} label="Sljedeća stranica">
              <ChevronRight className="size-5" />
            </PageStep>
          </nav>
        )}
      </div>
    </FilterNavProvider>
  );

  // Predstojeće: aktiviranje (objava nominacije)
  return past ? content : <PublishSelection incomplete={incomplete}>{content}</PublishSelection>;
}

/** Isplata utakmice: sva prihvaćena delegiranja isplaćena, dio ili ništa (bez delegiranih nema oznake) */
function PaymentMark({ payment }: { payment: MatchPayment }) {
  if (payment.state === "none") return null;
  if (payment.state === "paid") return <Status tone="mint">Isplaćena</Status>;
  if (payment.state === "partial") return <Status tone="gold">{`Isplaćeno ${payment.paid}/${payment.total}`}</Status>;
  return <Status tone="orange">Nije isplaćena</Status>;
}

/** Telefon, gore desno, sitno: datum, ispod vrijeme (odgođena bez vremena), ispod dvorana */
function ScheduleText({ iso, hall, hideTime }: { iso: string; hall: string | null; hideTime?: boolean }) {
  const [, month, day] = isoToSarajevo(iso).date.split("-").map(Number);
  return (
    <div className="flex max-w-[45%] shrink-0 flex-col items-end pt-4 text-right text-[12px] font-medium leading-snug text-fg-muted md:hidden">
      <span className="whitespace-nowrap">
        {formatWeekday(iso)}, {day}. {MONTHS_SHORT[month - 1]}
      </span>
      {!hideTime && <span className="tabular">{formatTime(iso)}</span>}
      <span className={cx("max-w-full truncate", !hall && "text-fg-faint")}>{hall ?? "Bez dvorane"}</span>
    </div>
  );
}

/** Utakmica ima sliku zapisnika */
function SheetMark() {
  return (
    <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-fg-muted" title="Ima sliku zapisnika">
      <FileImage className="size-4" aria-hidden="true" />
      Zapisnik
    </span>
  );
}

/** Kao raspored: filteri, pa dani s utakmicama (datum, utakmica, stanje delegiranja) */
function MatchesSkeleton() {
  return (
    <div className="flex flex-col gap-8">
      <Skeleton className="flex flex-col gap-3">
        <SegmentsSkeleton widths={["w-16", "w-16"]} />
        <SegmentsSkeleton widths={["w-24", "w-16", "w-20", "w-14", "w-20", "w-16"]} />
      </Skeleton>
      <DaysSkeleton />
    </div>
  );
}

/** Dani s utakmicama (i dok se učitava novi filter ili stranica) */
function DaysSkeleton() {
  return (
    <Skeleton className="flex flex-col gap-8">
      {times(2, (d) => (
        <section key={d}>
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 pb-3">
            <Text className="font-display text-[20px] font-semibold sm:text-[22px]" w="w-52" />
            <Text className="text-[13px] font-semibold" w="w-20" />
          </div>
          <ul className={ROWS}>
            {times(3, (i) => (
              <li key={i} className="flex items-center">
                <div className="flex min-w-0 flex-1 items-center py-4">
                  <MatchLineSkeleton i={d * 3 + i} aside={<StatusSkeleton w="w-20" />} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </Skeleton>
  );
}

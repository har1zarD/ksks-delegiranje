import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { Plus, CalendarDays, ChevronLeft, ChevronRight, FileImage } from "lucide-react";
import { getAdminMatches, getCompetitions } from "@/lib/data/admin";
import { matchesLabel } from "@/lib/finance";
import { dayKey, MATCH_STATUS_LABEL } from "@/lib/format";
import { FilterContent, FilterNavProvider, FilterSegment, PageLink, PageStep } from "@/components/filter-nav";
import { LiveRefresh } from "@/components/live-refresh";
import { PublishSelection, SelectAll, SelectMatch, type Incomplete } from "@/components/publish";
import { MatchLine } from "@/components/match-line";
import { EmailStatus, StaffingBadge, StaffingCrew } from "@/components/staffing-badge";
import { matchesWithScoresheets } from "@/lib/scoresheets";
import { MatchLineSkeleton, SegmentsSkeleton, Skeleton, StatusSkeleton, Text, times } from "@/components/skeleton";
import { ButtonLink, cx, Empty, PageHeader, Rows, ROWS, Segments, Status } from "@/components/ui";

export const metadata = { title: "Utakmice — KSKS" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const dayHeading = new Intl.DateTimeFormat("bs-BA", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });

/** "subota, 24. oktobar" iz "2026-10-24" */
function formatDay(day: string) {
  const s = dayHeading.format(new Date(`${day}T12:00:00Z`));
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function AdminMatchesPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <>
      <PageHeader icon={<CalendarDays />} title="Utakmice" subtitle="Raspored po danima. Otvori utakmicu da delegiraš sudije, sto i komesara.">
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

  const [competitions, matches, withSheets] = await Promise.all([
    getCompetitions(),
    getAdminMatches({ when: past ? "past" : "upcoming", competitionId }),
    matchesWithScoresheets(),
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
            <Empty icon={<Image src="/brand/calendar-icon.webp" alt="" width={40} height={40} className="size-10" />} action={!past && <ButtonLink href="/admin/utakmice/nova">Nova utakmica</ButtonLink>}>
              {past ? "Nema odigranih utakmica za ovaj izbor." : "Nema zakazanih utakmica za ovaj izbor. Dodaj utakmicu ili napravi raspored u Takmičenjima."}
            </Empty>
          ) : (
            shown.map(([day, list]) => (
              <section key={day}>
                <h2 className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 pb-3">
                  <span className="font-display text-[20px] font-semibold tracking-[-0.02em] sm:text-[22px]">{formatDay(day)}</span>
                  <span className="flex items-baseline gap-4">
                    {!past && <SelectAll ids={unpublished(list)} />}
                    <span className="text-[13px] font-semibold text-fg-faint">{matchesLabel(list.length)}</span>
                  </span>
                </h2>
                <Rows>
                  {list.map((m) => (
                    <li key={m.id} className={cx("relative flex items-center gap-3 transition-colors hover:bg-panel-2 sm:gap-4", m.status === "scheduled" && "pt-5 sm:pt-0")}>
                      {/* Stanje delegiranja i emaila: jezičak na vrhu kartice, gore desno (na telefonu red ima mjesta ispod njega; od sm je iznad tabele delegiranih) */}
                      {m.status === "scheduled" && (
                        <div className="absolute right-4 top-0 flex items-center gap-2 rounded-b-lg border border-t-0 border-line bg-panel-2 py-1 pl-2.5 pr-1.5 sm:right-6">
                          <StaffingBadge staffing={m.staffing} />
                          <EmailStatus publishedAt={m.published_at} unnotified={m.staffing.unnotified} compact />
                        </div>
                      )}
                      {/* Datum je dugme za označavanje (aktiviranje), ostatak reda otvara utakmicu */}
                      {!past && m.status === "scheduled" && <SelectMatch id={m.id} iso={m.starts_at} label={`${m.home?.name} – ${m.away?.name}`} />}
                      <Link href={`/admin/utakmice/${m.id}`} className="flex min-w-0 flex-1 items-center gap-3 py-4">
                        <MatchLine
                          match={m}
                          hideDate={!past && m.status === "scheduled"}
                          periods={m.status === "live" || (m.status === "finished" && m.periods.length > 0) ? m.periods : undefined}
                          showScore={past}
                          badge={
                            m.status === "live" ? (
                              <Status tone="crest" pulse>
                                Uživo
                              </Status>
                            ) : m.status === "finished" && m.periods.length > 0 ? (
                              <Status tone="muted">Kraj</Status>
                            ) : undefined
                          }
                          aside={
                            withSheets.has(m.id) && m.status !== "scheduled" ? (
                              <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-fg-muted" title="Ima sliku zapisnika">
                                <FileImage className="size-4" aria-hidden="true" />
                                Zapisnik
                              </span>
                            ) : m.status === "scheduled" ? (
                              <StaffingCrew staffing={m.staffing} />
                            ) : m.status === "postponed" || m.status === "cancelled" || (m.status === "finished" && m.periods.length === 0) ? (
                              <Status tone={m.status === "finished" ? "muted" : "orange"}>{MATCH_STATUS_LABEL[m.status]}</Status>
                            ) : undefined
                          }
                        />
                      </Link>
                    </li>
                  ))}
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

  return past ? content : <PublishSelection incomplete={incomplete}>{content}</PublishSelection>;
}

/** Stranica ima cijele dane, dok ne skupi bar PAGE_MATCHES utakmica (dan se nikad ne dijeli) */
const PAGE_MATCHES = 20;

function paginateDays<T>(days: [string, T[]][]) {
  const pages: [string, T[]][][] = [];
  let count = PAGE_MATCHES;
  for (const d of days) {
    if (count >= PAGE_MATCHES) {
      pages.push([]);
      count = 0;
    }
    pages[pages.length - 1].push(d);
    count += d[1].length;
  }
  return pages;
}

const shortDay = new Intl.DateTimeFormat("bs-BA", { day: "numeric", month: "short", timeZone: "UTC" });

/** "24. okt – 14. nov" (prvi i zadnji dan stranice) */
function pageRange(page: [string, unknown[]][]) {
  const fmt = (day: string) => shortDay.format(new Date(`${day}T12:00:00Z`)).replace(/\.$/, "");
  const first = fmt(page[0][0]);
  const last = fmt(page[page.length - 1][0]);
  return first === last ? first : `${first} – ${last}`;
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

import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { Plus, CalendarDays, FileImage } from "lucide-react";
import { getAdminMatches, getCompetitions } from "@/lib/data/admin";
import { matchesLabel } from "@/lib/finance";
import { dayKey, MATCH_STATUS_LABEL } from "@/lib/format";
import { LiveRefresh } from "@/components/live-refresh";
import { PublishSelection, SelectAll, SelectMatch } from "@/components/publish";
import { CrewLine } from "@/components/crew-line";
import { MatchLine } from "@/components/match-line";
import { StaffingBadge } from "@/components/staffing-badge";
import { matchesWithScoresheets } from "@/lib/scoresheets";
import { MatchLineSkeleton, SegmentsSkeleton, Skeleton, StatusSkeleton, Text, times } from "@/components/skeleton";
import { ButtonLink, Empty, PageHeader, Rows, ROWS, Segment, Segments, Status } from "@/components/ui";

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

  const href = (p: { takmicenje?: string; prikaz?: string }) => {
    const q = new URLSearchParams();
    const t = "takmicenje" in p ? p.takmicenje : competitionId;
    const v = "prikaz" in p ? p.prikaz : past ? "odigrane" : undefined;
    if (t) q.set("takmicenje", t);
    if (v) q.set("prikaz", v);
    const s = q.toString();
    return `/admin/utakmice${s ? `?${s}` : ""}`;
  };

  // Grupisanje po danu (sarajevsko vrijeme)
  const days = new Map<string, typeof matches>();
  for (const m of matches) {
    const day = dayKey(m.starts_at);
    days.set(day, [...(days.get(day) ?? []), m]);
  }

  const live = matches.filter((m) => m.status === "live").map((m) => m.id);
  // Aktiviranje (objava nominacije) ima smisla samo za utakmice koje tek dolaze
  const unpublished = (list: typeof matches) => list.filter((m) => m.status === "scheduled" && !m.published_at).map((m) => m.id);

  const content = (
    <div className="flex flex-col gap-8">
      <LiveRefresh matchIds={live} />
      <div className="flex flex-col gap-3">
        <Segments>
          <Segment href={href({ prikaz: undefined })} active={!past}>
            Predstoje
          </Segment>
          <Segment href={href({ prikaz: "odigrane" })} active={past}>
            Odigrane
          </Segment>
        </Segments>
        <Segments>
          <Segment href={href({ takmicenje: undefined })} active={!competitionId}>
            Sva takmičenja
          </Segment>
          {competitions.map((c) => (
            <Segment key={c.id} href={href({ takmicenje: c.id })} active={competitionId === c.id}>
              {c.short_name ?? c.name}
            </Segment>
          ))}
        </Segments>
      </div>

      {matches.length === 0 ? (
        <Empty icon={<Image src="/brand/calendar-icon.webp" alt="" width={40} height={40} className="size-10" />} action={!past && <ButtonLink href="/admin/utakmice/nova">Nova utakmica</ButtonLink>}>
          {past ? "Nema odigranih utakmica za ovaj izbor." : "Nema zakazanih utakmica za ovaj izbor. Dodaj utakmicu ili napravi raspored u Takmičenjima."}
        </Empty>
      ) : (
        [...days].map(([day, list]) => (
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
                <li key={m.id} className="flex items-center gap-1 transition-colors hover:bg-panel-2">
                  {!past && m.status === "scheduled" && <SelectMatch id={m.id} label={`${m.home?.name} – ${m.away?.name}`} />}
                  <Link href={`/admin/utakmice/${m.id}`} className="flex min-w-0 flex-1 items-center gap-3 py-4">
                    <MatchLine
                      match={m}
                      periods={m.status === "live" || (m.status === "finished" && m.periods.length > 0) ? m.periods : undefined}
                      showScore={past}
                      meta={!past && (m.status === "scheduled" || m.status === "live") ? <CrewLine slots={m.slots} digital={m.digital_scoresheet} /> : undefined}
                      badge={
                        m.status === "live" ? (
                          <Status tone="crest" pulse>
                            Uživo
                          </Status>
                        ) : m.status === "finished" && m.periods.length > 0 ? (
                          <Status tone="muted">Kraj</Status>
                        ) : m.status === "scheduled" && !m.published_at ? (
                          <Status tone="muted">Nije aktivirano</Status>
                        ) : undefined
                      }
                      aside={
                        withSheets.has(m.id) && m.status !== "scheduled" ? (
                          <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-fg-muted" title="Ima sliku zapisnika">
                            <FileImage className="size-4" aria-hidden="true" />
                            Zapisnik
                          </span>
                        ) : m.status === "scheduled" ? (
                          <StaffingBadge staffing={m.staffing} />
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
    </div>
  );

  return past ? content : <PublishSelection>{content}</PublishSelection>;
}

/** Kao raspored: filteri, pa dani s utakmicama (kvačica, utakmica, stanje delegiranja) */
function MatchesSkeleton() {
  return (
    <Skeleton className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <SegmentsSkeleton widths={["w-16", "w-16"]} />
        <SegmentsSkeleton widths={["w-24", "w-16", "w-20", "w-14", "w-20", "w-16"]} />
      </div>
      {times(2, (d) => (
        <section key={d}>
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 pb-3">
            <Text className="font-display text-[20px] font-semibold sm:text-[22px]" w="w-52" />
            <Text className="text-[13px] font-semibold" w="w-20" />
          </div>
          <ul className={ROWS}>
            {times(3, (i) => (
              <li key={i} className="flex items-center gap-1">
                <span className="flex size-11 shrink-0 items-center justify-center">
                  <span className="size-[18px] rounded-[4px] border border-line-strong" />
                </span>
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

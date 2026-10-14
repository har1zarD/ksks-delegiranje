import Link from "next/link";
import { Suspense } from "react";
import { Plus } from "lucide-react";
import { getAdminMatches, getCompetitions } from "@/lib/data/admin";
import { matchesLabel } from "@/lib/finance";
import { dayKey, MATCH_STATUS_LABEL } from "@/lib/format";
import { LiveRefresh } from "@/components/live-refresh";
import { MatchLine } from "@/components/match-line";
import { StaffingBadge } from "@/components/staffing-badge";
import { ButtonLink, Empty, Loading, PageHeader, Rows, Segment, Segments, Status } from "@/components/ui";

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
      <PageHeader title="Utakmice" subtitle="Raspored po danima. Otvori utakmicu da delegiraš sudije, sto i komesara.">
        <ButtonLink href="/admin/utakmice/nova">
          <Plus className="size-5" strokeWidth={2.2} />
          Nova utakmica
        </ButtonLink>
      </PageHeader>
      <Suspense fallback={<Loading />}>
        <Matches searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Matches({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const competitionId = typeof sp.takmicenje === "string" ? sp.takmicenje : undefined;
  const past = sp.prikaz === "odigrane";

  const [competitions, matches] = await Promise.all([
    getCompetitions(),
    getAdminMatches({ when: past ? "past" : "upcoming", competitionId }),
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

  return (
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
        <Empty action={!past && <ButtonLink href="/admin/utakmice/nova">Nova utakmica</ButtonLink>}>
          {past ? "Nema odigranih utakmica za ovaj izbor." : "Nema zakazanih utakmica za ovaj izbor. Dodaj utakmicu ili napravi raspored u Takmičenjima."}
        </Empty>
      ) : (
        [...days].map(([day, list]) => (
          <section key={day}>
            <h2 className="flex items-baseline justify-between gap-3 pb-3">
              <span className="font-display text-[20px] font-semibold tracking-[-0.02em] sm:text-[22px]">{formatDay(day)}</span>
              <span className="text-[13px] font-semibold text-fg-faint">
                {matchesLabel(list.length)}
              </span>
            </h2>
            <Rows>
              {list.map((m) => (
                <li key={m.id}>
                  <Link href={`/admin/utakmice/${m.id}`} className="-mx-4 flex items-center gap-3 px-4 py-4 transition-colors hover:bg-panel-2 sm:-mx-6 sm:px-6">
                    <MatchLine
                      match={m}
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
                        m.status === "scheduled" ? (
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
}

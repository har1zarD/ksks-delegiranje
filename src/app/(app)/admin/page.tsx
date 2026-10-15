import Link from "next/link";
import { Suspense } from "react";
import { ChevronRight, Plus, CalendarDays, CheckCircle2, Clock, Users, Radio, ClipboardList } from "lucide-react";
import { getAdminMatches } from "@/lib/data/admin";
import { formatKM, matchCost } from "@/lib/finance";
import { POSITION_LABEL } from "@/lib/format";
import { LiveRefresh } from "@/components/live-refresh";
import { MatchLine } from "@/components/match-line";
import { PageIntro } from "@/components/page-intro";
import { StaffingBadge } from "@/components/staffing-badge";
import { Bone, MatchRowsSkeleton, SectionTitleSkeleton, Skeleton, StatSkeleton, StatusSkeleton, Text } from "@/components/skeleton";
import { ButtonLink, Empty, Panel, Rows, SectionTitle, Stat, Status } from "@/components/ui";

export const metadata = { title: "Pregled — KSKS" };

const DAYS_AHEAD = 14;

export default function AdminHome() {
  return (
    <>
      <PageIntro eyebrow="Centar za delegiranje" title="Pregled" subtitle={`Utakmice u narednih ${DAYS_AHEAD} dana i šta još treba delegirati.`}>
        <ButtonLink href="/admin/utakmice/nova"><Plus className="size-4" aria-hidden="true" />Nova utakmica</ButtonLink>
      </PageIntro>
      <Suspense fallback={<OverviewSkeleton />}>
        <Overview />
      </Suspense>
    </>
  );
}

async function Overview() {
  const [soon, upcoming] = await Promise.all([
    getAdminMatches({ when: "upcoming", days: DAYS_AHEAD }),
    getAdminMatches({ when: "upcoming" }),
  ]);
  const live = upcoming.filter((m) => m.status === "live");
  const active = soon.filter((m) => m.status === "scheduled" || m.status === "live");
  const open = active.filter((m) => m.staffing.missing.length > 0);
  const waiting = active.reduce((n, m) => n + m.staffing.pending, 0);
  const full = active.filter((m) => m.staffing.missing.length === 0).length;
  const costs = active.map((m) => matchCost(m.rules, m.crew));
  const cost = costs.reduce((s, c) => s + c.total, 0);
  const costMissing = costs.some((c) => c.missing);

  return (
    <div className="flex flex-col gap-10">
      {live.length > 0 && (
        <section>
          <LiveRefresh matchIds={live.map((m) => m.id)} />
          <SectionTitle icon={<Radio />} count={live.length}>Uživo</SectionTitle>
          <Rows>
            {live.map((m) => (
              <li key={m.id}>
                <Link href={`/admin/utakmice/${m.id}`} className="-mx-4 flex items-center gap-3 px-4 py-4 transition-colors hover:bg-panel-2 sm:-mx-6 sm:px-6">
                  <MatchLine
                    match={m}
                    periods={m.periods}
                    badge={
                      <Status tone="crest" pulse>
                        Uživo
                      </Status>
                    }
                  />
                </Link>
              </li>
            ))}
          </Rows>
        </section>
      )}

      <Panel className="overflow-hidden">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-6 py-5 sm:py-7 lg:grid-cols-4">
          <Stat icon={<CalendarDays />} label={`Utakmica u ${DAYS_AHEAD} dana`} value={active.length} />
          <Stat icon={<CheckCircle2 />} label="Potpuno delegirano" value={full} tone={full === active.length && active.length > 0 ? "mint" : undefined} />
          <Stat icon={<Clock />} label="Čeka odgovor" value={waiting} tone={waiting > 0 ? "gold" : undefined} />
          <Stat icon={<Users />} label="Nedostaje delegiranje" value={open.length} tone={open.length > 0 ? "orange" : undefined} />
        </dl>
        <div className="flex flex-wrap items-end justify-between gap-3 border-t border-line py-4">
          <div>
            <div className="text-[13px] font-semibold text-fg-muted">Trošak delegiranja u {DAYS_AHEAD} dana</div>
            {costMissing && (
              <Link href="/admin/naknade" className="text-[13px] text-orange hover:opacity-75">
                Neke cijene nisu određene
              </Link>
            )}
          </div>
          <div className="scoreboard whitespace-nowrap text-[28px] font-semibold leading-none sm:text-[32px]">{formatKM(cost)}</div>
        </div>
      </Panel>

      <section>
        <SectionTitle icon={<ClipboardList />} count={open.length}>Treba delegirati</SectionTitle>
        {open.length === 0 ? (
          <Empty icon={<CheckCircle2 />} title={active.length > 0 ? "Delegiranje je popunjeno" : "Nema predstojećih utakmica"} action={<ButtonLink href="/admin/utakmice" variant="secondary">Sve utakmice</ButtonLink>}>
            {active.length > 0 ? `Sve utakmice u narednih ${DAYS_AHEAD} dana imaju popunjene pozicije.` : `Nema zakazanih utakmica u narednih ${DAYS_AHEAD} dana.`}
          </Empty>
        ) : (
          <Rows>
            {open.map((m) => (
              <li key={m.id}>
                <Link href={`/admin/utakmice/${m.id}`} className="-mx-4 flex items-center gap-3 px-4 py-4 transition-colors hover:bg-panel-2 sm:-mx-6 sm:px-6">
                  <MatchLine
                    match={m}
                    meta={
                      <div className="flex flex-wrap gap-x-3 gap-y-1">
                        {m.staffing.missing.map((p) => (
                          <Status key={p} tone="orange">
                            {POSITION_LABEL[p]}
                          </Status>
                        ))}
                      </div>
                    }
                  />
                  <ChevronRight className="size-5 shrink-0 text-fg-faint" />
                </Link>
              </li>
            ))}
          </Rows>
        )}
      </section>

      {open.length === 0 && upcoming.length > 0 && (
        <section>
          <SectionTitle icon={<CalendarDays />}>Sljedeće utakmice</SectionTitle>
          <Rows>
            {upcoming.slice(0, 5).map((m) => (
              <li key={m.id}>
                <Link href={`/admin/utakmice/${m.id}`} className="-mx-4 flex items-center gap-3 px-4 py-4 transition-colors hover:bg-panel-2 sm:-mx-6 sm:px-6">
                  <MatchLine match={m} aside={<StaffingBadge staffing={m.staffing} />} />
                </Link>
              </li>
            ))}
          </Rows>
        </section>
      )}
    </div>
  );
}

/** Kao pregled: brojke i trošak, pa utakmice kojima nedostaje delegiranje */
function OverviewSkeleton() {
  return (
    <Skeleton className="flex flex-col gap-10">
      <Panel className="overflow-hidden">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-6 py-5 sm:py-7 lg:grid-cols-4">
          <StatSkeleton w="w-10" label="w-32" />
          <StatSkeleton w="w-10" label="w-32" />
          <StatSkeleton w="w-10" label="w-24" />
          <StatSkeleton w="w-10" label="w-36" />
        </dl>
        <div className="flex flex-wrap items-end justify-between gap-3 border-t border-line py-4">
          <Text className="text-[13px] font-semibold" w="w-52" />
          <Text className="scoreboard text-[28px] font-semibold leading-none sm:text-[32px]" w="w-32" />
        </div>
      </Panel>
      <section>
        <SectionTitleSkeleton count />
        <MatchRowsSkeleton
          meta={
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              <StatusSkeleton w="w-16" />
              <StatusSkeleton w="w-24" />
            </div>
          }
          aside={<Bone className="size-5" />}
        />
      </section>
    </Skeleton>
  );
}

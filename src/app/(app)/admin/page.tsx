import Link from "next/link";
import Image from "next/image";
import { Suspense } from "react";
import { ChevronRight, Plus, CalendarDays, CheckCircle2, Clock, Users, Radio, ClipboardList, Send, Wallet } from "lucide-react";
import { delegatedHere, getActivatedMatches, getAdminMatches, OVERVIEW_DAYS } from "@/lib/data/admin";
import { formatKM, matchCost, matchesLabel } from "@/lib/finance";
import { dayKey, formatDayHeading, formatDayMonth, formatTime, positionName } from "@/lib/format";
import { PingPending, type PingItem } from "./ping-pending";
import { LiveRefresh } from "@/components/live-refresh";
import { CrewLine } from "@/components/crew-line";
import { MatchLine } from "@/components/match-line";
import { PageIntro } from "@/components/page-intro";
import { StaffingBadge, StaffingCrew, StaffingTab } from "@/components/staffing-badge";
import { Bone, MatchRowsSkeleton, Skeleton, StatusSkeleton, Text } from "@/components/skeleton";
import { ButtonLink, cx, Empty, MiniStat, Rows, SectionTitle, Status } from "@/components/ui";

export const metadata = { title: "Pregled — KSKS" };

const DAYS_AHEAD = OVERVIEW_DAYS;

export default function AdminHome() {
  return (
    <>
      <PageIntro
        compact
        eyebrow="Centar za delegiranje"
        title="Pregled"
        subtitle={`Raspored i delegiranje za narednih ${DAYS_AHEAD} dana.`}
        illustration={<Image src="/illustrations/basketball.webp" alt="" width={22} height={22} />}
      >
        <Suspense fallback={<OverviewStatsSkeleton />}>
          <OverviewStats />
        </Suspense>
        <ButtonLink href="/admin/utakmice/nova" className="h-8! gap-1! rounded-lg px-2.5! text-[12px]! sm:h-8!"><Plus className="size-3.5" aria-hidden="true" />Nova utakmica</ButtonLink>
      </PageIntro>
      <Suspense fallback={<OverviewSkeleton />}>
        <Overview />
      </Suspense>
    </>
  );
}

async function Overview() {
  const [soon, activatedList] = await Promise.all([getAdminMatches({ when: "upcoming", days: DAYS_AHEAD }), getActivatedMatches()]);
  const live = soon.filter((m) => m.status === "live");
  const active = soon.filter((m) => (m.status === "scheduled" || m.status === "live") && delegatedHere(m));
  const open = active.filter((m) => m.staffing.missing.length > 0);

  // Aktivirane (nominacija poslana) utakmice stoje na vrhu dok se ne upiše rezultat, po danu; neaktivirane su u Utakmicama
  const activated = byDay(activatedList);
  // Potvrđene nominacije: prihvaćene od svih poslanih (prihvaćeno + čeka odgovor) na aktiviranim utakmicama.
  // Ista osoba na dvije utakmice su dvije nominacije; neposlana delegiranja (izmjene nakon aktiviranja) ne ulaze dok se ne objave.
  const people = activatedList.flatMap((m) => m.staffing.people);
  const sent = people.length - activatedList.reduce((n, m) => n + m.staffing.unnotified, 0);
  const confirmed = people.filter((p) => p.accepted).length;
  // "Pingaj": poslane nominacije bez odgovora
  const toPing: PingItem[] = activatedList.flatMap((m) =>
    m.staffing.people
      .filter((p) => !p.accepted && p.notified)
      .map((p) => ({
        assignmentId: p.assignmentId,
        name: p.name,
        position: positionName(p.position, m.crew.digital),
        match: `${m.home?.name ?? "?"} – ${m.away?.name ?? "?"}`,
        when: `${formatDayMonth(m.starts_at)} ${formatTime(m.starts_at)}`,
      })),
  );

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

      {activatedList.length > 0 && (
        <section>
          <SectionTitle
            icon={<Send />}
            count={activatedList.length}
            action={
              sent > 0 && (
                <div className="flex shrink-0 items-center gap-3 self-center">
                  <span className="hidden whitespace-nowrap text-[13px] text-fg-muted sm:inline" title="Prihvaćene nominacije od svih poslanih na aktiviranim utakmicama">
                    <span className={cx("scoreboard text-[16px] font-semibold", confirmed === sent ? "text-mint" : "text-fg")}>
                      {confirmed}/{sent}
                    </span>{" "}
                    potvrđeno
                  </span>
                  <PingPending items={toPing} />
                </div>
              )
            }
          >
            <span className="truncate text-[16px] sm:text-[17px]">Aktivirane utakmice</span>
          </SectionTitle>
          {sent > 0 && (
            <div className="-mt-1 mb-4 flex items-center gap-3 sm:hidden" title="Prihvaćene nominacije od svih poslanih na aktiviranim utakmicama">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-panel-2">
                <div className={cx("h-full rounded-full", confirmed === sent ? "bg-mint" : "bg-fg")} style={{ width: `${(confirmed / sent) * 100}%` }} />
              </div>
              <span className="whitespace-nowrap text-[12px] text-fg-muted">
                <span className={cx("scoreboard text-[14px] font-semibold", confirmed === sent ? "text-mint" : "text-fg")}>
                  {confirmed}/{sent}
                </span>{" "}
                potvrđeno
              </span>
            </div>
          )}
          <div className="flex flex-col gap-6">
            {activated.map(([key, list]) => (
              <div key={key}>
                <GroupHeading groupKey={key} count={list.length} />
                <Rows>
                  {list.map((m) => (
                    <li key={m.id} className="relative flex items-center pt-5 transition-colors hover:bg-panel-2 sm:pt-0">
                      <StaffingTab match={m} staffing={m.staffing} publishedAt={m.published_at} fiba={m.fiba} />
                      <Link href={`/admin/utakmice/${m.id}`} className="flex min-w-0 flex-1 items-center py-3 sm:py-4">
                        <MatchLine match={m} hideLabelOnMobile aside={<StaffingCrew staffing={m.staffing} />} />
                      </Link>
                    </li>
                  ))}
                </Rows>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <SectionTitle icon={<ClipboardList />} count={open.length}>Treba delegirati</SectionTitle>
        {open.length === 0 ? (
          <Empty icon={<CheckCircle2 />} title={active.length > 0 ? "Delegiranje je popunjeno" : "Nema predstojećih utakmica"} action={<ButtonLink href="/admin/utakmice" variant="secondary">Sve utakmice</ButtonLink>}>
            {active.length > 0 ? `Sve utakmice u narednih ${DAYS_AHEAD} dana imaju popunjene pozicije.` : `Nema zakazanih utakmica u narednih ${DAYS_AHEAD} dana.`}
          </Empty>
        ) : (
          <div className="flex flex-col gap-6">
            {byDay(open).map(([key, list]) => (
              <div key={key}>
                <GroupHeading groupKey={key} count={list.length} />
                <Rows>
                  {list.map((m) => (
                    <li key={m.id}>
                      <Link href={`/admin/utakmice/${m.id}`} className="-mx-4 flex items-center gap-3 px-4 py-4 transition-colors hover:bg-panel-2 sm:-mx-6 sm:px-6">
                        <MatchLine
                          match={m}
                          meta={<CrewLine slots={m.slots} digital={m.digital_scoresheet} />}
                        />
                        <ChevronRight className="size-5 shrink-0 text-fg-faint" />
                      </Link>
                    </li>
                  ))}
                </Rows>
              </div>
            ))}
          </div>
        )}
      </section>

      {open.length === 0 && active.length > 0 && (
        <section>
          <SectionTitle icon={<CalendarDays />}>Sljedeće utakmice</SectionTitle>
          <Rows>
            {active.slice(0, 5).map((m) => (
              <li key={m.id}>
                <Link href={`/admin/utakmice/${m.id}`} className="-mx-4 flex items-center gap-3 px-4 py-4 transition-colors hover:bg-panel-2 sm:-mx-6 sm:px-6">
                  <MatchLine match={m} meta={<CrewLine slots={m.slots} digital={m.digital_scoresheet} />} aside={<StaffingBadge staffing={m.staffing} />} />
                </Link>
              </li>
            ))}
          </Rows>
        </section>
      )}
    </div>
  );
}

/** Utakmice po danu (svaki datum svoja grupa); redom kako su došle */
function byDay<T extends { starts_at: string }>(list: T[]) {
  const groups = new Map<string, T[]>();
  for (const m of list) {
    const key = dayKey(m.starts_at);
    groups.set(key, [...(groups.get(key) ?? []), m]);
  }
  return [...groups];
}

/** "Subota, 31. oktobar" i broj utakmica desno */
function GroupHeading({ groupKey, count }: { groupKey: string; count: number }) {
  return (
    <h3 className="flex items-baseline justify-between gap-3 pb-3">
      <span className="font-display text-[17px] font-semibold tracking-[-0.02em]">{formatDayHeading(groupKey)}</span>
      <span className="text-[13px] font-semibold text-fg-faint">{matchesLabel(count)}</span>
    </h3>
  );
}

/** Brojke za narednih DAYS_AHEAD dana u zaglavlju, pored "Nova utakmica" */
async function OverviewStats() {
  const soon = await getAdminMatches({ when: "upcoming", days: DAYS_AHEAD });
  const active = soon.filter((m) => (m.status === "scheduled" || m.status === "live") && delegatedHere(m));
  const open = active.filter((m) => m.staffing.missing.length > 0).length;
  const waiting = active.reduce((n, m) => n + m.staffing.pending, 0);
  const full = active.filter((m) => m.staffing.missing.length === 0).length;
  const costs = active.map((m) => matchCost(m.rules, m.crew));
  const cost = costs.reduce((s, c) => s + c.total, 0);
  const costMissing = costs.some((c) => c.missing);

  return (
    <dl className="flex flex-wrap items-center gap-x-4 gap-y-1.5 sm:mr-2">
      <MiniStat icon={<CalendarDays />} label="utakmica" title={`Utakmica u ${DAYS_AHEAD} dana`} value={active.length} />
      <MiniStat icon={<CheckCircle2 />} label="popunjeno" title="Potpuno delegirano" value={full} tone={full === active.length && active.length > 0 ? "mint" : undefined} />
      <MiniStat icon={<Clock />} label="čeka" title="Čeka odgovor" value={waiting} tone={waiting > 0 ? "gold" : undefined} />
      <MiniStat icon={<Users />} label="nedostaje" title="Nedostaje delegiranje" value={open} tone={open > 0 ? "orange" : undefined} />
      <MiniStat
        icon={<Wallet />}
        label="trošak"
        title={`Trošak delegiranja u ${DAYS_AHEAD} dana${costMissing ? " (neke cijene nisu određene, vidi Naknade)" : ""}`}
        value={costMissing ? `${formatKM(cost)}*` : formatKM(cost)}
        tone={costMissing ? "orange" : undefined}
      />
    </dl>
  );
}

function OverviewStatsSkeleton() {
  return (
    <Skeleton className="flex flex-wrap items-center gap-x-4 gap-y-1.5 sm:mr-2">
      {["w-16", "w-20", "w-12", "w-20", "w-28"].map((w, i) => (
        <Text key={i} className="text-[17px]" w={w} />
      ))}
    </Skeleton>
  );
}

/** Kao pregled: utakmice kojima nedostaje delegiranje */
function OverviewSkeleton() {
  return (
    <Skeleton className="flex flex-col gap-10">
      <section>
        <SectionTitle icon={<ClipboardList />}>
          Treba delegirati
          <span className="inline-flex min-w-6 shrink-0 items-center justify-center rounded-md border border-line bg-panel px-1.5 py-0.5 text-[12px]">
            <Text w="w-2" />
          </span>
        </SectionTitle>
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

import Link from "next/link";
import Image from "next/image";
import { Suspense } from "react";
import { ChevronRight, Plus, CalendarDays, CheckCircle2, Clock, Users, Radio, ClipboardList, Send, Wallet } from "lucide-react";
import { getActivatedMatches, getAdminMatches } from "@/lib/data/admin";
import { formatKM, matchCost, matchesLabel } from "@/lib/finance";
import { dayKey, formatDayHeading } from "@/lib/format";
import { LiveRefresh } from "@/components/live-refresh";
import { CrewLine } from "@/components/crew-line";
import { MatchLine } from "@/components/match-line";
import { PageIntro } from "@/components/page-intro";
import { StaffingBadge, StaffingCrew, StaffingTab } from "@/components/staffing-badge";
import { Bone, MatchRowsSkeleton, Skeleton, StatusSkeleton, Text } from "@/components/skeleton";
import { ButtonLink, cx, Empty, MiniStat, Rows, SectionTitle, Status } from "@/components/ui";

export const metadata = { title: "Pregled — KSKS" };

const DAYS_AHEAD = 14;

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
  const [soon, upcoming, activatedList] = await Promise.all([
    getAdminMatches({ when: "upcoming", days: DAYS_AHEAD }),
    getAdminMatches({ when: "upcoming" }),
    getActivatedMatches(),
  ]);
  const live = upcoming.filter((m) => m.status === "live");
  const active = soon.filter((m) => m.status === "scheduled" || m.status === "live");
  const open = active.filter((m) => m.staffing.missing.length > 0);

  // Aktivirane (nominacija poslana) utakmice stoje na vrhu dok se ne upiše rezultat, po danu kao u rasporedu; neaktivirane su u Utakmicama
  const activated = new Map<string, typeof activatedList>();
  for (const m of activatedList) {
    const day = dayKey(m.starts_at);
    activated.set(day, [...(activated.get(day) ?? []), m]);
  }
  // Potvrđene nominacije: prihvaćene od svih poslanih (prihvaćeno + čeka odgovor) na aktiviranim utakmicama.
  // Ista osoba na dvije utakmice su dvije nominacije; neposlana delegiranja (izmjene nakon aktiviranja) ne ulaze dok se ne objave.
  const people = activatedList.flatMap((m) => m.staffing.people);
  const sent = people.length - activatedList.reduce((n, m) => n + m.staffing.unnotified, 0);
  const confirmed = people.filter((p) => p.accepted).length;

  return (
    <div className="flex flex-col gap-10">
      {activatedList.length > 0 && (
        <section>
          <SectionTitle
            icon={<Send />}
            count={activatedList.length}
            action={
              sent > 0 && (
                <span className="self-center whitespace-nowrap text-[12px] text-fg-muted sm:text-[13px]" title="Prihvaćene nominacije od svih poslanih na aktiviranim utakmicama">
                  <span className={cx("scoreboard text-[14px] font-semibold sm:text-[16px]", confirmed === sent ? "text-mint" : "text-fg")}>
                    {confirmed}/{sent}
                  </span>{" "}
                  potvrđeno
                </span>
              )
            }
          >
            <span className="whitespace-nowrap text-[15px] sm:text-[17px]">Aktivirane utakmice</span>
          </SectionTitle>
          <div className="flex flex-col gap-6">
            {[...activated].map(([day, list]) => (
              <div key={day}>
                <h3 className="flex items-baseline justify-between gap-3 pb-3">
                  <span className="font-display text-[17px] font-semibold tracking-[-0.02em]">{formatDayHeading(day)}</span>
                  <span className="text-[13px] font-semibold text-fg-faint">{matchesLabel(list.length)}</span>
                </h3>
                <Rows>
                  {list.map((m) => (
                    <li key={m.id} className="relative flex items-center pt-5 transition-colors hover:bg-panel-2 sm:pt-0">
                      <StaffingTab match={m} staffing={m.staffing} publishedAt={m.published_at} />
                      <Link href={`/admin/utakmice/${m.id}`} className="flex min-w-0 flex-1 items-center py-4">
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
                    meta={<CrewLine slots={m.slots} digital={m.digital_scoresheet} />}
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

/** Brojke za narednih DAYS_AHEAD dana u zaglavlju, pored "Nova utakmica" */
async function OverviewStats() {
  const soon = await getAdminMatches({ when: "upcoming", days: DAYS_AHEAD });
  const active = soon.filter((m) => m.status === "scheduled" || m.status === "live");
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

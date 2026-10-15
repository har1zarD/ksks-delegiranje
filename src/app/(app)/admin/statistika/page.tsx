import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { BarChart3, CalendarCheck, Clock, Wallet, XCircle } from "lucide-react";
import { getStats, type PersonStats } from "@/lib/data/stats";
import { resolvePeriod, type PayrollPeriod } from "@/lib/data/finance";
import { formatKM, formatMonth, matchesLabel, round2 } from "@/lib/finance";
import { PayrollSummary, PeriodPicker } from "@/app/(app)/admin/naknade/_components/payroll-view";
import { PayrollSummarySkeleton, PeriodPickerSkeleton, Skeleton, Text, times } from "@/components/skeleton";
import { cx, Empty, PageHeader, Panel, ROWS, SectionTitle } from "@/components/ui";

export const metadata = { title: "Statistika — KSKS" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default function StatsPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <>
      <PageHeader
        icon={<BarChart3 />}
        title="Statistika"
        subtitle="Ko je koliko sudio i radio za stolom, ko je odbijao nominacije i ko je koliko zaradio. Računaju se samo završene utakmice."
      />
      <Suspense fallback={<StatsSkeleton />}>
        <Stats searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Stats({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  await connection(); // "tekući mjesec" se računa po zahtjevu
  // Bez izbora: cijela evidencija (sezona), a ne samo tekući mjesec
  const period: PayrollPeriod = sp.mjesec === undefined ? "sve" : resolvePeriod(sp.mjesec);
  const people = await getStats(period);
  const params = { mjesec: typeof sp.mjesec === "string" ? sp.mjesec : undefined };
  const personHref = (id: string) => `/admin/naknade/osoba/${id}${period === "sve" ? "?mjesec=sve" : `?mjesec=${period}`}`;
  const when = period === "sve" ? "u cijeloj evidenciji" : `u ${formatMonth(period)}`;

  const byMatches = [...people].filter((p) => p.matches > 0).sort((a, b) => b.matches - a.matches || a.name.localeCompare(b.name, "bs"));
  const byDeclined = [...people].filter((p) => p.declined > 0).sort((a, b) => b.declined - a.declined || a.name.localeCompare(b.name, "bs"));
  const byEarned = [...people].filter((p) => p.earned > 0).sort((a, b) => b.earned - a.earned || a.name.localeCompare(b.name, "bs"));
  const byUnpaid = [...people].filter((p) => p.unpaid > 0).sort((a, b) => b.unpaid - a.unpaid || a.name.localeCompare(b.name, "bs"));
  const totals = people.reduce(
    (t, p) => ({ earned: round2(t.earned + p.earned), paid: round2(t.paid + p.paid), unpaid: round2(t.unpaid + p.unpaid), unpaidCount: t.unpaidCount + p.unpaidCount, declined: t.declined + p.declined }),
    { earned: 0, paid: 0, unpaid: 0, unpaidCount: 0, declined: 0 },
  );

  return (
    <div className="flex flex-col gap-10">
      <PeriodPicker period={period} basePath="/admin/statistika" params={params} />

      {people.length === 0 ? (
        <Empty icon={<BarChart3 />}>Nema završenih utakmica ni odbijenih nominacija {when}.</Empty>
      ) : (
        <>
          <PayrollSummary
            total={totals.earned}
            paid={totals.paid}
            unpaid={totals.unpaid}
            note={`${people.length} ${people.length % 10 >= 2 && people.length % 10 <= 4 && (people.length % 100 < 12 || people.length % 100 > 14) ? "osobe" : "osoba"}, ${totals.unpaidCount} neisplaćeno, ${declinedLabel(totals.declined)}`}
          />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <TopList icon={<CalendarCheck />} title="Najviše utakmica" people={byMatches} value={(p) => matchesLabel(p.matches)} personHref={personHref} />
            <TopList icon={<Wallet />} title="Najviše zaradili" people={byEarned} value={(p) => formatKM(p.earned)} personHref={personHref} />
            <TopList icon={<Clock />} title="Najviše se duguje" people={byUnpaid} value={(p) => formatKM(p.unpaid)} personHref={personHref} empty="Sve je isplaćeno." />
            <TopList icon={<XCircle />} title="Najviše odbijenih nominacija" people={byDeclined} value={(p) => declinedLabel(p.declined)} personHref={personHref} empty="Niko nije odbio nominaciju." />
          </div>

          <section>
            <SectionTitle icon={<BarChart3 />} count={people.length}>Sve osobe</SectionTitle>
            <div className="overflow-x-auto rounded-lg border border-line bg-panel shadow-panel">
              <table className="w-full min-w-[820px] text-[14px]">
                <thead>
                  <tr className="border-b border-line text-left text-[12px] font-semibold text-fg-faint">
                    <th className="px-4 py-3 sm:px-6">Osoba</th>
                    <Th>Utakmice</Th>
                    <Th>Sudija</Th>
                    <Th>Sto</Th>
                    <Th>Komesar</Th>
                    <Th>Odbijeno</Th>
                    <Th>Zarađeno</Th>
                    <Th>Isplaćeno</Th>
                    <Th>Duguje se</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {people.map((p) => (
                    <tr key={p.profileId} className="transition-colors hover:bg-panel-2">
                      <td className="px-4 py-3 sm:px-6">
                        <Link href={personHref(p.profileId)} className="font-semibold text-fg hover:text-brand">
                          {p.name}
                        </Link>
                        {p.missing > 0 && <div className="text-[12px] text-orange">{p.missing} bez cijene</div>}
                      </td>
                      <Td strong>{p.matches}</Td>
                      <Td muted={p.referee === 0}>{p.referee}</Td>
                      <Td muted={p.table === 0}>{p.table}</Td>
                      <Td muted={p.commissioner === 0}>{p.commissioner}</Td>
                      <Td muted={p.declined === 0} tone={p.declined > 0 ? "text-crest" : undefined}>{p.declined}</Td>
                      <Td strong>{formatKM(p.earned)}</Td>
                      <Td muted={p.paid === 0} tone="text-mint">{formatKM(p.paid)}</Td>
                      <Td muted={p.unpaid === 0} tone="text-crest">{formatKM(p.unpaid)}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

/** "3 odbijene nominacije" */
function declinedLabel(n: number) {
  const one = n % 10 === 1 && n % 100 !== 11;
  const few = n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14);
  return `${n} ${one ? "odbijena" : "odbijene"} ${one ? "nominacija" : few ? "nominacije" : "nominacija"}`;
}

/** Top 5 po jednoj mjeri: redni broj, ime (link na obračun osobe) i vrijednost */
function TopList({
  icon,
  title,
  people,
  value,
  personHref,
  empty = "Nema podataka.",
}: {
  icon: React.ReactNode;
  title: string;
  people: PersonStats[];
  value: (p: PersonStats) => string;
  personHref: (id: string) => string;
  empty?: string;
}) {
  const top = people.slice(0, 5);
  return (
    <Panel className="overflow-hidden">
      <h3 className="flex items-center gap-2 border-b border-line py-3 text-[13px] font-semibold text-fg-muted [&>svg]:size-4">
        {icon}
        {title}
      </h3>
      {top.length === 0 ? (
        <p className="py-4 text-[14px] text-fg-faint">{empty}</p>
      ) : (
        <ol className="divide-y divide-line">
          {top.map((p, i) => (
            <li key={p.profileId} className="flex items-center gap-3 py-2.5">
              <span className={cx("scoreboard w-5 shrink-0 text-center text-[13px] font-semibold", i === 0 ? "text-brand" : "text-fg-faint")}>{i + 1}</span>
              <Link href={personHref(p.profileId)} className="min-w-0 flex-1 truncate text-[15px] font-semibold text-fg hover:text-brand">
                {p.name}
              </Link>
              <span className="scoreboard shrink-0 text-[14px] font-semibold text-fg-muted">{value(p)}</span>
            </li>
          ))}
        </ol>
      )}
    </Panel>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-3 py-3 text-right font-semibold last:pr-4 sm:last:pr-6">{children}</th>;
}

function Td({ children, strong, muted, tone }: { children: React.ReactNode; strong?: boolean; muted?: boolean; tone?: string }) {
  return (
    <td className={cx("scoreboard whitespace-nowrap px-3 py-3 text-right last:pr-4 sm:last:pr-6", strong && "font-semibold text-fg", muted ? "text-fg-faint" : tone)}>
      {children}
    </td>
  );
}

/** Kao statistika: period, tri liste i tabela osoba */
function StatsSkeleton() {
  return (
    <Skeleton className="flex flex-col gap-10">
      <PeriodPickerSkeleton />
      <PayrollSummarySkeleton />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {times(4, (i) => (
          <Panel key={i} className="overflow-hidden">
            <div className="border-b border-line py-3">
              <Text className="text-[13px] font-semibold" w="w-36" />
            </div>
            <ul className="divide-y divide-line">
              {times(5, (j) => (
                <li key={j} className="flex items-center gap-3 py-2.5">
                  <Text className="text-[13px]" w="w-4" />
                  <Text className="flex-1 text-[15px] font-semibold" w={j % 2 ? "w-32" : "w-40"} />
                  <Text className="text-[14px]" w="w-16" />
                </li>
              ))}
            </ul>
          </Panel>
        ))}
      </div>
      <ul className={ROWS}>
        {times(6, (i) => (
          <li key={i} className="flex items-center gap-3 py-3">
            <Text className="flex-1 font-semibold" w={i % 2 ? "w-36" : "w-44"} />
            <Text w="w-10" />
            <Text w="w-10" />
            <Text w="w-16" />
          </li>
        ))}
      </ul>
    </Skeleton>
  );
}

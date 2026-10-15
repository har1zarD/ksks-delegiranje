import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { ChevronLeft } from "lucide-react";
import { BULLETIN_CATEGORIES, getRoundBulletin, type BulletinCategory } from "@/lib/data/report";
import { formatDayMonth, formatTime, MATCH_STATUS_LABEL, matchNo } from "@/lib/format";
import { Skeleton, Text, times } from "@/components/skeleton";
import { cx, Segment, Segments } from "@/components/ui";
import { PrintButton } from "../[id]/print-button";
import { cell, ReportBody, sheetTitle } from "../report-sheet";

export const metadata = { title: "Bilten kola — KSKS" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

// A4; svaka utakmica na svojoj stranici, pregled rezultata na prvoj
const PRINT_CSS = `
@page { size: A4; margin: 14mm 16mm; }
@media print {
  main { max-width: none !important; padding: 0 !important; }
  [class*="lg:pl-[260px]"] { padding-left: 0 !important; }
  .bilten { font-size: 11pt; box-shadow: none !important; border-radius: 0 !important; padding: 0 !important; border: 0 !important; }
  .sheet { break-before: page; border: 0 !important; margin-top: 0 !important; padding-top: 0 !important; }
}
`;

export default function RoundBulletinPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <>
      <style>{PRINT_CSS}</style>
      <Suspense fallback={<RoundSkeleton />}>
        <RoundBulletin searchParams={searchParams} />
      </Suspense>
    </>
  );
}

const isCategory = (v: unknown): v is BulletinCategory => BULLETIN_CATEGORIES.some((c) => c.key === v);

async function RoundBulletin({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const category: BulletinCategory = isCategory(sp.kategorija) ? sp.kategorija : "pioniri";
  const wanted = typeof sp.kolo === "string" && /^\d+$/.test(sp.kolo) ? Number(sp.kolo) : null;

  // Bez izabranog kola: zadnje odigrano/zakazano kolo te kategorije
  let data = await getRoundBulletin(category, wanted ?? 0);
  const round = wanted ?? data.rounds.at(-1) ?? null;
  if (wanted === null && round !== null) data = await getRoundBulletin(category, round);

  const label = BULLETIN_CATEGORIES.find((c) => c.key === category)!.label;
  const href = (p: { kategorija?: string; kolo?: number | null }) => {
    const q = new URLSearchParams();
    q.set("kategorija", p.kategorija ?? category);
    const k = "kolo" in p ? p.kolo : round;
    if (k) q.set("kolo", String(k));
    return `/bilten/kolo?${q}`;
  };
  const sheets = data.competitions.flatMap((c) => c.matches);
  const score = (s: (typeof sheets)[number]) => {
    const t = s.periods.reduce((a, p) => ({ h: a.h + p.home_points, a: a.a + p.away_points }), { h: 0, a: 0 });
    if (s.periods.length > 0) return `${t.h} : ${t.a}`;
    return s.match.home_score != null ? `${s.match.home_score} : ${s.match.away_score}` : "—";
  };

  return (
    <div className="mx-auto max-w-[210mm]">
      <div className="mb-5 flex flex-col gap-3 print:hidden">
        <div className="flex items-center justify-between gap-4">
          <Link href="/rezultati" className="-ml-2 inline-flex h-10 items-center gap-1 rounded-md pl-1 pr-3 text-[15px] font-semibold text-fg-muted hover:bg-panel hover:text-fg">
            <ChevronLeft className="size-5" /> Rezultati
          </Link>
          {sheets.length > 0 && <PrintButton />}
        </div>
        <Segments>
          {BULLETIN_CATEGORIES.map((c) => (
            <Segment key={c.key} href={href({ kategorija: c.key, kolo: null })} active={c.key === category}>
              {c.label}
            </Segment>
          ))}
        </Segments>
        {data.rounds.length > 0 && (
          <Segments>
            {data.rounds.map((r) => (
              <Segment key={r} href={href({ kolo: r })} active={r === round}>
                {r}. kolo
              </Segment>
            ))}
          </Segments>
        )}
      </div>

      <article className="bilten overflow-x-auto rounded-lg border border-line bg-white p-5 shadow-panel text-[14px] leading-snug text-black [color-scheme:light] sm:p-[14mm]">
        <header className="flex items-center gap-4 border-b border-black/30 pb-4">
          <Image src="/brand/ksks-logo.svg" alt="KSKS" width={64} height={64} />
          <div className="flex-1">
            <p className="text-[12px] text-black/60 print:text-black">Košarkaški savez Kantona Sarajevo</p>
            <h1 className="font-display text-[26px] font-bold leading-tight">Bilten {round ? `${round}. kola` : "kola"}</h1>
            <p>
              <strong>{label}</strong>
              {data.competitions.length > 1 && `: ${data.competitions.map((c) => c.name).join(", ")}`}
            </p>
          </div>
        </header>

        {sheets.length === 0 ? (
          <p className="py-8 text-center text-black/60">Nema utakmica {label.toLowerCase()} {round ? `u ${round}. kolu` : "u ovoj sezoni"}.</p>
        ) : (
          <>
            {/* Pregled rezultata kola po takmičenju */}
            <section className="py-5">
              <h2 className="pb-2 font-semibold">Rezultati kola</h2>
              {data.competitions
                .filter((c) => c.matches.length > 0)
                .map((c) => (
                  <div key={c.id} className="mb-4">
                    {data.competitions.length > 1 && <h3 className="pb-1 text-[13px] font-semibold text-black/60 print:text-black">{c.name}</h3>}
                    <table className="tabular w-full border-collapse">
                      <tbody>
                        {c.matches.map(({ match, periods }) => (
                          <tr key={match.id}>
                            <td className={`${cell} w-20 whitespace-nowrap`}>{matchNo(match.number)}</td>
                            <td className={`${cell} w-28 whitespace-nowrap`}>
                              {formatDayMonth(match.starts_at)} {formatTime(match.starts_at)}
                            </td>
                            <td className={cell}>
                              {match.home?.name ?? "—"} – {match.away?.name ?? "—"}
                            </td>
                            <td className={`${cell} w-20 whitespace-nowrap text-center font-semibold`}>
                              {match.status === "finished" || match.status === "live" || periods.length > 0
                                ? score({ match, periods, crew: [], report: null })
                                : MATCH_STATUS_LABEL[match.status]}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
            </section>

            {/* Bilten svake utakmice, na štampi svaka na svojoj stranici */}
            {sheets.map((s) => (
              <section key={s.match.id} className="sheet mt-10 border-t border-black/30 pt-6">
                <div className="flex items-start justify-between gap-4">
                  <h2 className="font-display text-[20px] font-bold leading-tight">{sheetTitle(s.match)}</h2>
                  {!s.report?.submitted_at && <span className={cx("text-[13px] font-semibold", s.report ? "" : "text-black/60 print:text-black")}>{s.report ? "Nacrt" : "Bilten nije upisan"}</span>}
                </div>
                <ReportBody match={s.match} crew={s.crew} periods={s.periods} report={s.report} />
              </section>
            ))}
          </>
        )}
      </article>
    </div>
  );
}

/** Kao bilten kola: filteri, zaglavlje i pregled rezultata */
function RoundSkeleton() {
  return (
    <Skeleton className="mx-auto max-w-[210mm]">
      <div className="mb-5 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-4">
          <span className="-ml-2 inline-flex h-10 items-center gap-1 pl-1 pr-3 text-[15px] font-semibold text-fg-muted">
            <ChevronLeft className="size-5" /> Rezultati
          </span>
        </div>
        <Text w="w-80" />
        <Text w="w-56" />
      </div>
      <div className="rounded-lg border border-line bg-white p-5 text-[14px] leading-snug text-black shadow-panel [color-scheme:light] sm:p-[14mm]">
        <div className="flex items-center gap-4 border-b border-black/30 pb-4">
          <Image src="/brand/ksks-logo.svg" alt="" width={64} height={64} />
          <div className="flex-1">
            <p className="text-[12px] text-black/60">Košarkaški savez Kantona Sarajevo</p>
            <p className="font-display text-[26px] font-bold leading-tight text-black">Bilten kola</p>
            <Text w="w-40" />
          </div>
        </div>
        <div className="py-5">
          <p className="pb-2 font-semibold">Rezultati kola</p>
          {times(4, (i) => (
            <div key={i} className="flex gap-4 border-b border-black/10 py-1.5">
              <Text w="w-20" />
              <Text w="w-28" />
              <Text className="flex-1" w="w-64" />
              <Text w="w-12" />
            </div>
          ))}
        </div>
      </div>
    </Skeleton>
  );
}

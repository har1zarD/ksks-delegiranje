import { TeamName } from "@/components/team-name";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getMatchPage } from "@/lib/data/report";
import { FOUL_TYPE_LABEL, foulTimeLabel } from "@/lib/data/report-selects";
import { formatDayMonth, formatTime, formatWeekday, matchNo, POSITION_LABEL } from "@/lib/format";
import { ChevronLeft } from "lucide-react";
import { ButtonSkeleton, Skeleton, TeamNameSkeleton, Text, times } from "@/components/skeleton";
import { PrintButton } from "./print-button";

export const metadata = { title: "Bilten — KSKS" };

type Params = Promise<{ id: string }>;

// A4, bez zaglavlja aplikacije (header ima print:hidden)
const PRINT_CSS = `
@page { size: A4; margin: 14mm 16mm; }
@media print {
  main { max-width: none !important; padding: 0 !important; }
  [class*="lg:pl-[260px]"] { padding-left: 0 !important; }
  .bilten { font-size: 11pt; box-shadow: none !important; border-radius: 0 !important; padding: 0 !important; }
}
`;

export default function BiltenPage({ params }: { params: Params }) {
  return (
    <>
      <style>{PRINT_CSS}</style>
      <Suspense fallback={<BiltenSkeleton />}>
        <Bilten params={params} />
      </Suspense>
    </>
  );
}

const cell = "border border-black/20 px-2 py-1 print:border-black/40";

async function Bilten({ params }: { params: Params }) {
  const { id } = await params;
  const page = await getMatchPage(id);
  if (!page) notFound();
  const { match, crew, periods, report } = page;

  const homeName = match.home?.name ?? "Domaćin";
  const awayName = match.away?.name ?? "Gost";
  const total = periods.reduce((t, p) => ({ h: t.h + p.home_points, a: t.a + p.away_points }), { h: 0, a: 0 });
  const commissioner = crew.find((c) => c.position === "commissioner" && c.status === "accepted");
  const accepted = crew.filter((c) => c.status === "accepted");

  return (
    <div className="mx-auto max-w-[210mm]">
      <div className="mb-5 flex items-center justify-between gap-4 print:hidden">
        <Link
          href={`/utakmice/${match.id}`}
          className="-ml-2 inline-flex h-10 items-center gap-1 rounded-md pl-1 pr-3 text-[15px] font-semibold text-fg-muted hover:bg-panel hover:text-fg"
        >
          <ChevronLeft className="size-5" /> Utakmica
        </Link>
        <PrintButton />
      </div>
      {/* Papir: bijeli A4 list na ekranu, čista stranica na štampi */}
      <article className="bilten overflow-x-auto rounded-lg border border-line bg-white p-5 shadow-panel text-[14px] leading-snug text-black [color-scheme:light] sm:p-[14mm]">
        <header className="flex items-center gap-4 border-b border-black/30 pb-4">
          <Image src="/brand/ksks-logo.svg" alt="KSKS" width={64} height={64} />
          <div className="flex-1">
            <p className="text-[12px] text-black/60 print:text-black">Košarkaški savez Kantona Sarajevo</p>
            <h1 className="font-display text-[26px] font-bold leading-tight">Bilten utakmice</h1>
            <p>
              <strong>{matchNo(match.number)}</strong>, {match.competition?.name}
              {match.round ? `, ${match.round}. kolo` : ""}
            </p>
          </div>
          {!report?.submitted_at && (
            <span className="text-[13px] font-semibold">Nacrt</span>
          )}
        </header>

        <section className="py-5">
          <p className="tabular">
            <span className="capitalize">{formatWeekday(match.starts_at)}</span> {formatDayMonth(match.starts_at)} u{" "}
            {formatTime(match.starts_at)}, {match.hall?.name ?? "dvorana nije upisana"}
          </p>
          {/* Na mobitelu grb iznad imena, da ekipe stanu uz rezultat */}
          <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 sm:gap-4">
            <TeamName name={homeName} logoUrl={match.home?.club?.logo_url} className="flex-col text-center text-[16px] font-semibold sm:flex-row sm:justify-end sm:text-left sm:text-[18px]" wrap eager />
            <div className="scoreboard whitespace-nowrap text-[28px] font-bold sm:text-[34px]">
              {total.h} : {total.a}
            </div>
            <TeamName name={awayName} logoUrl={match.away?.club?.logo_url} className="flex-col text-center text-[16px] font-semibold sm:flex-row sm:text-left sm:text-[18px]" wrap eager />
          </div>
        </section>

        <div className="overflow-x-auto">
          <table className="tabular w-full border-collapse text-center">
            <thead>
              <tr>
                <th className={`${cell} text-left font-medium`}>Ekipa</th>
                {periods.map((p) => (
                  <th key={p.period} className={`${cell} font-medium`}>
                    {p.period <= 4 ? `${p.period}.` : `P${p.period - 4}`}
                  </th>
                ))}
                <th className={`${cell} font-medium`}>Ukupno</th>
              </tr>
            </thead>
            <tbody>
              {(
                [
                  [homeName, "home_points", total.h],
                  [awayName, "away_points", total.a],
                ] as const
              ).map(([name, side, sum]) => (
                <tr key={side}>
                  <td className={`${cell} text-left`}><TeamName name={name} logoUrl={side === "home_points" ? match.home?.club?.logo_url : match.away?.club?.logo_url} wrap eager /></td>
                  {periods.map((p) => (
                    <td key={p.period} className={cell}>
                      {p[side]}
                    </td>
                  ))}
                  <td className={`${cell} font-semibold`}>{sum}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <section className="mt-6 grid gap-x-8 gap-y-1 sm:grid-cols-2">
          <h2 className="pb-1 font-semibold sm:col-span-2">Službena lica</h2>
          {accepted.map((c) => (
            <div key={c.id} className="flex justify-between gap-4 border-b border-black/10 py-1">
              <span className="text-black/60 print:text-black">{POSITION_LABEL[c.position]}</span>
              <span>{c.profile!.full_name}</span>
            </div>
          ))}
        </section>

        <section className="mt-6 grid grid-cols-3 gap-4">
          <Info label="Gledalaca" value={report?.spectators} />
          <Info label="Početak" value={report?.started_at?.slice(0, 5)} />
          <Info label="Kraj" value={report?.ended_at?.slice(0, 5)} />
        </section>

        <section className="mt-6">
          <h2 className="pb-1 font-semibold">Tehničke, nesportske i diskvalifikujuće greške</h2>
          {report?.technicals.length ? (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className={`${cell} text-left font-medium`}>Ekipa</th>
                    <th className={`${cell} text-left font-medium`}>Igrač / trener</th>
                    <th className={`${cell} text-left font-medium`}>Kad</th>
                    <th className={`${cell} text-left font-medium`}>Vrsta</th>
                  </tr>
                </thead>
                <tbody>
                  {report.technicals.map((t, i) => (
                    <tr key={i}>
                      <td className={cell}><TeamName name={t.team === "home" ? homeName : awayName} logoUrl={match[t.team]?.club?.logo_url} wrap eager /></td>
                      <td className={cell}>{t.player}</td>
                      <td className={`${cell} whitespace-nowrap`}>{foulTimeLabel(t) || "—"}</td>
                      <td className={cell}>{FOUL_TYPE_LABEL[t.type]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p>Nije bilo.</p>
          )}
        </section>

        <TextBlock title="Incidenti" text={report?.incidents} />
        <TextBlock title="Napomene komesara" text={report?.remarks} />

        <footer className="mt-16 flex justify-end">
          <div className="w-64 text-center">
            <div className="border-t border-black/50 pt-1">
              Komesar{commissioner ? `: ${commissioner.profile!.full_name}` : ""}
            </div>
          </div>
        </footer>
      </article>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div>
      <div className="text-[12px] text-black/60 print:text-black">{label}</div>
      <div className="tabular">{value ?? "—"}</div>
    </div>
  );
}

function TextBlock({ title, text }: { title: string; text: string | null | undefined }) {
  return (
    <section className="mt-6">
      <h2 className="pb-1 font-semibold">{title}</h2>
      <p className="whitespace-pre-wrap">{text || "Nema."}</p>
    </section>
  );
}

/** Kao bilten: A4 list sa zaglavljem, rezultatom, tabelom četvrtina, službenim licima i napomenama */
function BiltenSkeleton() {
  return (
    <Skeleton className="mx-auto max-w-[210mm]">
      <div className="mb-5 flex items-center justify-between gap-4">
        <span className="-ml-2 inline-flex h-10 items-center gap-1 pl-1 pr-3 text-[15px] font-semibold text-fg-muted">
          <ChevronLeft className="size-5" /> Utakmica
        </span>
        <ButtonSkeleton className="w-28" />
      </div>
      <div className="rounded-lg border border-line bg-white p-5 text-[14px] leading-snug text-black shadow-panel [color-scheme:light] sm:p-[14mm]">
        <div className="flex items-center gap-4 border-b border-black/30 pb-4">
          <Image src="/brand/ksks-logo.svg" alt="" width={64} height={64} />
          <div className="flex-1">
            <p className="text-[12px] text-black/60">Košarkaški savez Kantona Sarajevo</p>
            <p className="font-display text-[26px] font-bold leading-tight text-black">Bilten utakmice</p>
            <Text w="w-64" />
          </div>
        </div>
        <div className="py-5">
          <Text w="w-72" />
          <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 sm:gap-4">
            <TeamNameSkeleton className="flex-col text-[16px] font-semibold sm:flex-row sm:justify-end sm:text-[18px]" w="w-24 sm:w-32" />
            <Text className="scoreboard text-[28px] font-bold sm:text-[34px]" w="w-24 sm:w-28" />
            <TeamNameSkeleton className="flex-col text-[16px] font-semibold sm:flex-row sm:text-[18px]" w="w-24 sm:w-32" />
          </div>
        </div>
        {/* Tabela četvrtina: zaglavlje i dva reda s grbom, kao prava */}
        <div className="overflow-x-auto">
          <table className="tabular w-full border-collapse text-center">
            <thead>
              <tr>
                <th className={`${cell} text-left font-medium`}>Ekipa</th>
                {["1.", "2.", "3.", "4."].map((p) => (
                  <th key={p} className={`${cell} font-medium`}>
                    {p}
                  </th>
                ))}
                <th className={`${cell} font-medium`}>Ukupno</th>
              </tr>
            </thead>
            <tbody>
              {times(2, (i) => (
                <tr key={i}>
                  <td className={`${cell} text-left`}>
                    <TeamNameSkeleton w={i ? "w-28" : "w-32"} />
                  </td>
                  {times(5, (j) => (
                    <td key={j} className={cell}>
                      <Text w="w-5" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-6 grid gap-x-8 gap-y-1 sm:grid-cols-2">
          <p className="pb-1 font-semibold sm:col-span-2">Službena lica</p>
          {times(6, (i) => (
            <div key={i} className="flex justify-between gap-4 border-b border-black/10 py-1">
              <Text w="w-20" />
              <Text w="w-28" />
            </div>
          ))}
        </div>
        <div className="mt-6 grid grid-cols-3 gap-4">
          {["Gledalaca", "Početak", "Kraj"].map((label) => (
            <div key={label}>
              <div className="text-[12px] text-black/60">{label}</div>
              <Text w="w-10" />
            </div>
          ))}
        </div>
        {["Tehničke, nesportske i diskvalifikujuće greške", "Incidenti", "Napomene komesara"].map((title) => (
          <div key={title} className="mt-6">
            <p className="pb-1 font-semibold">{title}</p>
            <Text w="w-20" />
          </div>
        ))}
        <div className="mt-16 flex justify-end">
          <Text className="w-64 border-t border-black/50 pt-1 text-center" w="w-40" />
        </div>
      </div>
    </Skeleton>
  );
}

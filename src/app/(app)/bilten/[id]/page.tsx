import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getMatchPage } from "@/lib/data/report";
import { FOUL_TYPE_LABEL } from "@/lib/data/report-selects";
import { formatDayMonth, formatTime, formatWeekday, POSITION_LABEL } from "@/lib/format";
import { ChevronLeft } from "lucide-react";
import { Loading } from "@/components/ui";
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
      <Suspense fallback={<Loading />}>
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
      <article className="bilten overflow-x-auto rounded-md bg-white p-5 text-[14px] leading-snug text-black [color-scheme:light] sm:p-[14mm]">
        <header className="flex items-center gap-4 border-b border-black/30 pb-4">
          <Image src="/brand/ksks-logo.svg" alt="KSKS" width={64} height={64} />
          <div className="flex-1">
            <p className="text-[12px] text-black/60 print:text-black">Košarkaški savez Kantona Sarajevo</p>
            <h1 className="font-display text-[26px] font-bold leading-tight">Bilten utakmice</h1>
            <p>
              {match.competition?.name}
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
          <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
            <div className="text-right text-[18px] font-semibold">{homeName}</div>
            <div className="scoreboard whitespace-nowrap text-[34px] font-bold">
              {total.h} : {total.a}
            </div>
            <div className="text-[18px] font-semibold">{awayName}</div>
          </div>
        </section>

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
              <th className={`${cell} font-medium`}>Lične greške</th>
            </tr>
          </thead>
          <tbody>
            {(
              [
                [homeName, "home_points", total.h, report?.home_fouls],
                [awayName, "away_points", total.a, report?.away_fouls],
              ] as const
            ).map(([name, side, sum, fouls]) => (
              <tr key={side}>
                <td className={`${cell} text-left`}>{name}</td>
                {periods.map((p) => (
                  <td key={p.period} className={cell}>
                    {p[side]}
                  </td>
                ))}
                <td className={`${cell} font-semibold`}>{sum}</td>
                <td className={cell}>{fouls ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <section className="mt-6 grid grid-cols-2 gap-x-8 gap-y-1">
          <h2 className="col-span-2 pb-1 font-semibold">Službena lica</h2>
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
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className={`${cell} text-left font-medium`}>Ekipa</th>
                  <th className={`${cell} text-left font-medium`}>Igrač / trener</th>
                  <th className={`${cell} font-medium`}>Min.</th>
                  <th className={`${cell} text-left font-medium`}>Vrsta</th>
                </tr>
              </thead>
              <tbody>
                {report.technicals.map((t, i) => (
                  <tr key={i}>
                    <td className={cell}>{t.team === "home" ? homeName : awayName}</td>
                    <td className={cell}>{t.player}</td>
                    <td className={`${cell} tabular text-center`}>{t.minute ?? "—"}</td>
                    <td className={cell}>{FOUL_TYPE_LABEL[t.type]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
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

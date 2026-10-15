import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getMatchPage } from "@/lib/data/report";
import { matchNo } from "@/lib/format";
import { ChevronLeft } from "lucide-react";
import { ButtonSkeleton, Skeleton, TeamNameSkeleton, Text, times } from "@/components/skeleton";
import { PrintButton } from "./print-button";
import { cell, ReportBody } from "../report-sheet";

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

async function Bilten({ params }: { params: Params }) {
  const { id } = await params;
  const page = await getMatchPage(id);
  if (!page) notFound();
  const { match, crew, periods, report } = page;


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

        <ReportBody match={match} crew={crew} periods={periods} report={report} />
      </article>
    </div>
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

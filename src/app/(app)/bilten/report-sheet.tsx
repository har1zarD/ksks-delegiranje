import { TeamName, type TeamIdentity } from "@/components/team-name";
import { FOUL_TYPE_LABEL, foulTimeLabel, type TechnicalFoul } from "@/lib/data/report-selects";
import { formatDayMonth, formatTime, formatWeekday, matchNo, positionName, type AssignmentStatus, type Position } from "@/lib/format";
import { formatScore, usesQuarterPoints } from "@/lib/quarter-points";

// Tijelo biltena jedne utakmice (bez zaglavlja dokumenta): koristi ga bilten utakmice i bilten cijelog kola.

export type SheetMatch = {
  id: string;
  number: number;
  round: number | null;
  starts_at: string;
  digital_scoresheet: boolean;
  competition: { name: string; short_name: string | null; category: string } | null;
  home_score: number | null;
  away_score: number | null;
  home: TeamIdentity | null;
  away: TeamIdentity | null;
  hall: { name: string } | null;
};

export type SheetCrew = { id: string; position: Position; status: AssignmentStatus; profile: { full_name: string } | null }[];

export type SheetPeriods = { period: number; home_points: number; away_points: number }[];

export type SheetReport = {
  spectators: number | null;
  started_at: string | null;
  ended_at: string | null;
  technicals: TechnicalFoul[];
  incidents: string | null;
  remarks: string | null;
  submitted_at: string | null;
} | null;

export const cell = "border border-black/20 px-2 py-1 print:border-black/40";

/** Datum, rezultat, četvrtine, službena lica, podaci, greške, incidenti, napomene i potpis komesara */
export function ReportBody({ match, crew, periods, report }: { match: SheetMatch; crew: SheetCrew; periods: SheetPeriods; report: SheetReport }) {
  const homeName = match.home?.name ?? "Domaćin";
  const awayName = match.away?.name ?? "Gost";
  // Minibasket: ukupno su bodovi četvrtina (rezultat utakmice), ne zbir koševa
  const total = usesQuarterPoints(match.competition?.category)
    ? { h: match.home_score ?? 0, a: match.away_score ?? 0 }
    : periods.reduce((t, p) => ({ h: t.h + p.home_points, a: t.a + p.away_points }), { h: 0, a: 0 });
  const accepted = crew.filter((c) => c.status === "accepted" && c.profile);
  const commissioner = accepted.find((c) => c.position === "commissioner");

  return (
    <>
      <section className="py-5">
        <p className="tabular">
          <span className="capitalize">{formatWeekday(match.starts_at)}</span> {formatDayMonth(match.starts_at)} u {formatTime(match.starts_at)},{" "}
          {match.hall?.name ?? "dvorana nije upisana"}
        </p>
        {/* Na mobitelu grb iznad imena, da ekipe stanu uz rezultat */}
        <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 sm:gap-4">
          <TeamName name={homeName} logoUrl={match.home?.club?.logo_url} className="flex-col text-center text-[16px] font-semibold sm:flex-row sm:justify-end sm:text-left sm:text-[18px]" wrap eager />
          <div className="scoreboard whitespace-nowrap text-[28px] font-bold sm:text-[34px]">
            {formatScore(total.h)} : {formatScore(total.a)}
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
                <td className={`${cell} text-left`}>
                  <TeamName name={name} logoUrl={side === "home_points" ? match.home?.club?.logo_url : match.away?.club?.logo_url} wrap eager />
                </td>
                {periods.map((p) => (
                  <td key={p.period} className={cell}>
                    {p[side]}
                  </td>
                ))}
                <td className={`${cell} font-semibold`}>{formatScore(sum)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section className="mt-6 grid gap-x-8 gap-y-1 sm:grid-cols-2">
        <h2 className="pb-1 font-semibold sm:col-span-2">Službena lica</h2>
        {accepted.map((c) => (
          <div key={c.id} className="flex justify-between gap-4 border-b border-black/10 py-1">
            <span className="text-black/60 print:text-black">{positionName(c.position, match.digital_scoresheet)}</span>
            <span>{c.profile!.full_name}</span>
          </div>
        ))}
        {accepted.length === 0 && <p className="text-black/60 print:text-black">Nema prihvaćenih delegiranja.</p>}
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
                  <th className={`${cell} text-left font-medium`}>Razlog</th>
                </tr>
              </thead>
              <tbody>
                {report.technicals.map((t, i) => (
                  <tr key={i}>
                    <td className={cell}>
                      <TeamName name={t.team === "home" ? homeName : awayName} logoUrl={match[t.team]?.club?.logo_url} wrap eager />
                    </td>
                    <td className={cell}>{t.player}</td>
                    <td className={`${cell} whitespace-nowrap`}>{foulTimeLabel(t) || "—"}</td>
                    <td className={cell}>{FOUL_TYPE_LABEL[t.type]}</td>
                    <td className={cell}>{t.reason || "—"}</td>
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
          <div className="border-t border-black/50 pt-1">Komesar{commissioner ? `: ${commissioner.profile!.full_name}` : ""}</div>
        </div>
      </footer>
    </>
  );
}

/** Naslov jedne utakmice u biltenu kola: broj, takmičenje, kolo */
export function sheetTitle(match: SheetMatch) {
  return `${matchNo(match.number)}, ${match.competition?.name ?? ""}${match.round ? `, ${match.round}. kolo` : ""}`;
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

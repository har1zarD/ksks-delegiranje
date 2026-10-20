import Link from "next/link";
import { CalendarDays, ChevronDown } from "lucide-react";
import { A2_JUG_FIXTURES, A2_JUG_ID } from "@/lib/a2-jug-raspored";
import { getCompetitionMatches, getHalls } from "@/lib/data/admin";
import { getSocialSchedules } from "@/lib/data/social";
import { formatDate, formatTime, formatWeekday, isoToSarajevo, matchNo } from "@/lib/format";
import { SectionTitle } from "@/components/ui";
import { A2JugObjava } from "./a2-jug-objava";
import { DraftsProvider, FixtureForm, type Draft } from "./a2-jug-nacrti";

/**
 * Poseban slučaj A2 lige jug: parovi iz PDF rasporeda po kolima. Nenapravljena utakmica dobija termin, dvoranu i broj
 * i postaje prava utakmica; do tada se nigdje ne prikazuje. Desno se od napravljenih utakmica pravi slika za objavu.
 */
export async function A2JugRaspored({ teams }: { teams: { id: string; name: string; club: { logo_url: string | null } | null }[] }) {
  const [matches, halls, schedules] = await Promise.all([getCompetitionMatches(A2_JUG_ID), getHalls(), getSocialSchedules()]);
  const teamId = new Map(teams.map((t) => [t.name, t.id]));
  const hallName = new Map(halls.map((h) => [h.id, h.name]));
  const taken = new Set(matches.map((m) => m.number));
  const fixtures = A2_JUG_FIXTURES.map((f) => {
    const homeId = teamId.get(f.home);
    const awayId = teamId.get(f.away);
    return {
      ...f,
      homeId,
      awayId,
      hallId: halls.find((h) => h.name === f.hall)?.id ?? "",
      match: matches.find((m) => m.home_team_id === homeId && m.away_team_id === awayId),
    };
  });
  const rounds = [...new Set(fixtures.map((f) => f.round))].map((round) => fixtures.filter((f) => f.round === round));
  const made = fixtures.filter((f) => f.match).length;
  const open = fixtures.filter((f) => !f.match && f.homeId && f.awayId);
  const drafts: Record<number, Draft> = Object.fromEntries(open.map((f) => [f.number, { date: f.date, time: f.time, hallId: f.hallId }]));
  const logo = new Map(teams.map((t) => [t.name, t.club?.logo_url ?? null]));
  // Utakmica napravljena bez kola (npr. ručno) dobija kolo iz rasporeda, da je filter kola nađe
  const roundOf = new Map(fixtures.map((f) => [`${f.home}|${f.away}`, f.round]));
  const social = schedules.matches
    .filter((m) => m.competitionId === A2_JUG_ID)
    .map((m) => ({ ...m, round: m.round ?? roundOf.get(`${m.home}|${m.away}`) ?? null }));
  // Otvoreno je prvo kolo u kojem ima nenapravljenih utakmica
  const firstOpen = rounds.find((r) => r.some((f) => !f.match))?.[0].round;

  return (
    <section>
      <SectionTitle icon={<CalendarDays />} count={made}>
        Raspored A2 lige jug
      </SectionTitle>
      <p className="mb-4 max-w-prose text-[14px] text-fg-muted">
        Parovi iz rasporeda saveza ({fixtures.length} utakmica, 18 kola). Upiši datum, vrijeme i dvoranu i napravi utakmicu;
        do tada se ne vidi nigdje drugo. Na sliku za objavu možeš staviti i nenapravljene, s terminom iz forme.
      </p>
      <DraftsProvider initial={drafts}>
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="flex min-w-0 flex-col gap-3">
            {rounds.map((list) => {
              const round = list[0].round;
              const done = list.filter((f) => f.match).length;
              return (
                <details key={round} open={round === firstOpen} className="group overflow-hidden rounded-lg border border-line bg-panel px-4 shadow-panel sm:px-5">
                  <summary className="-mx-4 flex cursor-pointer list-none items-center gap-4 px-4 py-3.5 transition-colors hover:bg-panel-2 sm:-mx-5 sm:px-5 [&::-webkit-details-marker]:hidden">
                    <span className="min-w-0 flex-1">
                      <span className="block font-display text-[19px] font-semibold tracking-tight">{round}. kolo</span>
                      <span className="block text-[13px] text-fg-muted">
                        {formatDate(list[0].roundDate)} · napravljeno {done}/{list.length}
                      </span>
                    </span>
                    <ChevronDown className="size-5 shrink-0 text-fg-faint transition-transform group-open:rotate-180" />
                  </summary>
                  <ul className="divide-y divide-line border-t border-line">
                    {list.map((f) => (
                      <li key={f.number} className="py-4">
                        <p className="font-display text-[17px] font-semibold">
                          {f.home} – {f.away}
                        </p>
                        {f.match ? (
                          <p className="mt-1 text-[14px] text-fg-muted">
                            {matchNo(f.match.number)} · <span className="capitalize">{formatWeekday(f.match.starts_at)}</span>,{" "}
                            {formatDate(isoToSarajevo(f.match.starts_at).date)} u {formatTime(f.match.starts_at)} ·{" "}
                            {(f.match.hall_id && hallName.get(f.match.hall_id)) || "dvorana nije određena"} ·{" "}
                            <Link href={`/admin/utakmice/${f.match.id}`} className="font-semibold text-brand underline-offset-4 hover:underline">
                              Otvori
                            </Link>
                          </p>
                        ) : !f.homeId || !f.awayId ? (
                          <p className="mt-1 text-[14px] text-crest">Ekipa nije u takmičenju pod ovim nazivom.</p>
                        ) : (
                          <FixtureForm
                            number={f.number}
                            round={f.round}
                            homeId={f.homeId}
                            awayId={f.awayId}
                            suggestedNumber={taken.has(f.number) ? undefined : f.number}
                            halls={halls}
                          />
                        )}
                      </li>
                    ))}
                  </ul>
                </details>
              );
            })}
          </div>
          <A2JugObjava
            matches={social}
            fixtures={open.map((f) => ({ number: f.number, round: f.round, home: f.home, away: f.away, homeLogo: logo.get(f.home) ?? null, awayLogo: logo.get(f.away) ?? null }))}
            halls={halls}
            now={schedules.now}
          />
        </div>
      </DraftsProvider>
    </section>
  );
}

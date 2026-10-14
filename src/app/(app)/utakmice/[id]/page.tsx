import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CalendarDays, ChevronLeft, MapPin, Phone, Printer } from "lucide-react";
import { getMatchPage } from "@/lib/data/report";
import { formatDayMonth, formatTime, formatWeekday, MATCH_STATUS_LABEL, POSITION_LABEL, type MatchStatus } from "@/lib/format";
import { Button, buttonClass, Loading, SectionTitle, Status } from "@/components/ui";
import { setStatus } from "./actions";
import { BiltenForm } from "./bilten-form";
import { FinishButton } from "./finish-button";
import { ScoreBoard } from "./score-board";

export const metadata = { title: "Utakmica — KSKS" };

type Params = Promise<{ id: string }>;

const STATUS_TONE: Record<MatchStatus, "crest" | "mint" | "muted" | "orange"> = {
  scheduled: "muted",
  live: "crest",
  finished: "mint",
  postponed: "orange",
  cancelled: "orange",
};

export default function MatchPage({ params }: { params: Params }) {
  return (
    <>
      <Link
        href="/utakmice"
        className="-ml-2 mb-4 inline-flex h-10 items-center gap-1 rounded-md pl-1 pr-3 text-[15px] font-semibold text-fg-muted hover:bg-panel hover:text-fg"
      >
        <ChevronLeft className="size-5" /> Moje utakmice
      </Link>
      <Suspense fallback={<Loading />}>
        <Match params={params} />
      </Suspense>
    </>
  );
}

async function Match({ params }: { params: Params }) {
  const { id } = await params;
  const page = await getMatchPage(id);
  if (!page) notFound();
  const { match, crew, periods, report, isAdmin, isCommissioner } = page;

  const canScore = isCommissioner || isAdmin;
  const homeName = match.home?.name ?? "Domaćin";
  const awayName = match.away?.name ?? "Gost";

  return (
    <div className="flex flex-col gap-10">
      {/* Semafor */}
      <section className="rounded-lg border border-line bg-panel shadow-panel px-4 sm:px-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line py-3">
          <span className="text-[13px] font-semibold text-fg-muted">
            {match.competition?.name}
            {match.round ? `, ${match.round}. kolo` : ""}
          </span>
          <Status tone={STATUS_TONE[match.status]} pulse={match.status === "live"}>
            {match.status === "live" ? "Uživo" : MATCH_STATUS_LABEL[match.status]}
          </Status>
        </div>
        <div className="pb-5 pt-4 sm:pb-8 sm:pt-6">
          <ScoreBoard
            matchId={match.id}
            homeName={homeName}
            awayName={awayName}
            initial={periods}
            canEdit={isAdmin ? match.status !== "cancelled" && match.status !== "postponed" : isCommissioner && match.status === "live"}
          />
          {isCommissioner && !isAdmin && match.status === "scheduled" && (
            <p className="pt-3 text-[14px] text-fg-muted">Rezultat se unosi kad započneš utakmicu.</p>
          )}
          {isCommissioner && !isAdmin && match.status === "finished" && (
            <p className="pt-3 text-[14px] text-fg-muted">Utakmica je završena. Za ispravku rezultata javi se savezu.</p>
          )}
          {canScore && (match.status === "scheduled" || match.status === "live") && (
            <div className="mt-5 border-t border-line pt-5">
              {match.status === "scheduled" ? (
                <form action={setStatus}>
                  <input type="hidden" name="match_id" value={match.id} />
                  <input type="hidden" name="status" value="live" />
                  <Button type="submit" className="w-full sm:w-auto">
                    Počni utakmicu
                  </Button>
                </form>
              ) : (
                <FinishButton matchId={match.id} />
              )}
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-2 border-t border-line py-3 text-[14px] text-fg-muted">
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="size-4" />
            <span className="capitalize">{formatWeekday(match.starts_at)}</span> {formatDayMonth(match.starts_at)} u {formatTime(match.starts_at)}
          </span>
          {match.hall && (
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="size-4" /> {match.hall.name}
            </span>
          )}
        </div>
        {match.notes && <p className="border-t border-line py-3 text-[14px]">{match.notes}</p>}
      </section>

      <section>
        <SectionTitle count={crew.length}>Službena lica</SectionTitle>
        <ul className="divide-y divide-line rounded-lg border border-line bg-panel shadow-panel [&>*]:px-4 sm:[&>*]:px-6">
          {crew.map((c) => (
            <li key={c.id} className="flex min-h-16 items-center gap-3 py-2.5">
              <div className="min-w-0 flex-1">
                <div className="text-[12px] font-semibold text-fg-faint">{POSITION_LABEL[c.position]}</div>
                <div className="truncate text-[15px] font-semibold">
                  {c.profile!.full_name}
                  {c.status === "pending" && <span className="ml-2 text-[12px] font-medium text-fg-faint">čeka odgovor</span>}
                </div>
              </div>
              {c.profile!.phone && (
                <a
                  href={`tel:${c.profile!.phone}`}
                  className="grid size-11 shrink-0 place-items-center rounded-md text-brand hover:bg-panel-2"
                  aria-label={`Pozovi: ${c.profile!.full_name}`}
                  title={c.profile!.phone}
                >
                  <Phone className="size-5" strokeWidth={1.9} />
                </a>
              )}
            </li>
          ))}
        </ul>
      </section>

      {(isCommissioner || isAdmin || report?.submitted_at) && (
        <section>
          <SectionTitle
            action={
              report && (
                <Link href={`/bilten/${match.id}`} className={buttonClass("secondary")}>
                  <Printer className="size-4" /> Za štampu
                </Link>
              )
            }
          >
            Bilten
          </SectionTitle>
          {isCommissioner || isAdmin ? (
            <BiltenForm matchId={match.id} homeName={homeName} awayName={awayName} values={report} isAdmin={isAdmin} />
          ) : (
            <p className="rounded-lg border border-line bg-panel shadow-panel px-4 sm:px-5 py-6 text-[15px] text-fg-muted">
              Komesar je poslao bilten.
            </p>
          )}
        </section>
      )}
    </div>
  );
}

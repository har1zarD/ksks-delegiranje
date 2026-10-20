"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Images } from "lucide-react";
import { CARD, cx } from "@/components/ui";
import { Select } from "@/components/select";
import type { SocialMatch } from "@/lib/data/social";
import { A2_JUG_ID } from "@/lib/a2-jug-raspored";
import { formatDate, formatTime, sarajevoToISO } from "@/lib/format";
import type { SocialOptions } from "@/lib/social-image";
import { DEFAULT_SOCIAL_OPTIONS, SocialDesign, SocialPreview, SocialText } from "../../utakmice/objave/builder";
import { useDrafts } from "./a2-jug-nacrti";

/** Nenapravljena utakmica iz rasporeda (termin dolazi iz forme lijevo) */
type Fixture = { number: number; round: number; home: string; away: string; homeLogo: string | null; awayLogo: string | null };

const subtitleOf = (round: string) => (round ? `A2 liga jug · ${round}. kolo` : "A2 liga jug");

/**
 * Slika za objavu iz rasporeda A2 lige jug: biraš kolo i termine, ostalo kao u Slikama za objavu.
 * Uz napravljene utakmice tu su i nenapravljene, s terminom kako je upisan u formi rasporeda (bez vremena ne mogu na sliku).
 * Pamte se isključene utakmice, pa nova utakmica izabranog kola odmah ide na sliku.
 */
export function A2JugObjava({
  matches: initialMatches,
  fixtures,
  halls,
  now: initialNow,
}: {
  matches: SocialMatch[];
  fixtures: Fixture[];
  halls: { id: string; name: string }[];
  now: number;
}) {
  const [now, setNow] = useState(initialNow);
  const drafts = useDrafts();
  const planned = useMemo(
    () =>
      fixtures.map((f) => {
        const d = drafts[f.number];
        const startsAt = d.date && d.time ? sarajevoToISO(d.date, d.time) : null;
        const match: SocialMatch = {
          id: `nacrt-${f.number}`,
          startsAt: startsAt ?? "",
          status: "scheduled",
          date: d.date,
          round: f.round,
          competitionId: A2_JUG_ID,
          competition: "A2 liga jug",
          home: f.home,
          away: f.away,
          homeLogo: f.homeLogo,
          awayLogo: f.awayLogo,
          hall: halls.find((h) => h.id === d.hallId)?.name ?? null,
        };
        return { match, ready: startsAt !== null };
      }),
    [fixtures, drafts, halls],
  );
  const draftIds = useMemo(() => new Set(planned.map((p) => p.match.id)), [planned]);
  const notReady = useMemo(() => new Set(planned.filter((p) => !p.ready).map((p) => p.match.id)), [planned]);
  const matches = useMemo(
    () =>
      [...initialMatches, ...planned.map((p) => p.match)]
        .filter((m) => notReady.has(m.id) || m.status === "postponed" || new Date(m.startsAt).getTime() > now)
        .sort((a, b) => (a.round ?? 0) - (b.round ?? 0) || a.startsAt.localeCompare(b.startsAt)),
    [initialMatches, planned, notReady, now],
  );
  const rounds = [...new Set(matches.flatMap((m) => (m.round == null ? [] : [m.round])))].sort((a, b) => a - b);
  const [round, setRound] = useState(() => (rounds[0] == null ? "" : String(rounds[0])));
  const [excluded, setExcluded] = useState<Set<string>>(() => new Set());
  const [page, setPage] = useState(0);
  const [perPage, setPerPage] = useState(5);
  const [options, setOptions] = useState<SocialOptions>(() => ({ ...DEFAULT_SOCIAL_OPTIONS, subtitle: subtitleOf(round) }));
  const visible = useMemo(() => matches.filter((m) => !round || String(m.round) === round), [matches, round]);
  const chosen = useMemo(() => visible.filter((m) => !excluded.has(m.id) && !notReady.has(m.id)), [visible, excluded, notReady]);

  function change<K extends keyof SocialOptions>(key: K, value: SocialOptions[K]) {
    setOptions((old) => ({ ...old, [key]: value }));
    if (key === "format") setPage(0);
  }

  function pickRound(value: string) {
    setRound(value);
    setExcluded(new Set());
    setOptions((old) => ({ ...old, subtitle: subtitleOf(value) }));
    setPage(0);
  }

  function toggle(id: string) {
    setExcluded((old) => {
      const next = new Set(old);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setPage(0);
  }

  return (
    <div className="flex min-w-0 flex-col gap-4 lg:sticky lg:top-6 lg:max-h-[calc(100dvh-3rem)] lg:overflow-y-auto">
      <section className={cx(CARD, "flex flex-col gap-4 p-4")}>
        <div className="flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-[17px] font-semibold">
            <Images className="size-5 text-fg-muted" aria-hidden="true" /> Slika za objavu
          </h2>
          <span className="text-[12px] font-semibold text-fg-muted">{chosen.length} odabrano</span>
        </div>
        {matches.length === 0 ? (
          <p className="text-[14px] text-fg-muted">Kad napraviš utakmice, ovdje biraš termine za sliku.</p>
        ) : (
          <>
            <Select label="Kolo" value={round} onChange={(event) => pickRound(event.target.value)}>
              <option value="">Sva kola</option>
              {rounds.map((n) => (
                <option key={n} value={String(n)}>
                  {n}. kolo
                </option>
              ))}
            </Select>
            <div className="max-h-72 overflow-y-auto rounded-lg border border-line">
              {visible.map((m) => {
                const off = notReady.has(m.id);
                const on = !excluded.has(m.id) && !off;
                return (
                  <label key={m.id} className={cx("flex items-start gap-3 border-b border-line p-3 last:border-b-0", off ? "opacity-60" : "cursor-pointer hover:bg-panel-2", on && "bg-panel-2")}>
                    <input type="checkbox" checked={on} disabled={off} onChange={() => toggle(m.id)} className="mt-1 size-4 shrink-0 accent-brand" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[14px] font-semibold">
                        {m.home} <span className="font-normal text-fg-faint">–</span> {m.away}
                      </span>
                      <span className="mt-1 flex flex-wrap items-center gap-2 text-[12px] text-fg-muted">
                        {off ? (
                          "Upiši datum i vrijeme u rasporedu"
                        ) : m.status === "postponed" ? (
                          <span className="rounded bg-orange/10 px-1.5 py-0.5 font-semibold text-orange">ODGOĐENO</span>
                        ) : (
                          `${formatDate(m.date)} · ${formatTime(m.startsAt)} · ${m.hall ?? "Dvorana nije određena"}`
                        )}
                        {draftIds.has(m.id) && <span className="rounded border border-line px-1.5 py-0.5 font-semibold text-fg-faint">nije napravljena</span>}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
            <p className="text-[12px] text-fg-faint">Na sliku idu buduće i odgođene utakmice, i nenapravljene s upisanim terminom. Odznači termin koji ne želiš na slici.</p>
          </>
        )}
      </section>

      <SocialPreview matches={chosen} options={options} perPage={perPage} page={page} onPage={setPage} onStale={() => setNow(Date.now())} />

      <details className={cx(CARD, "group px-4")}>
        <summary className="-mx-4 flex cursor-pointer list-none items-center gap-3 px-4 py-3.5 transition-colors hover:bg-panel-2 [&::-webkit-details-marker]:hidden">
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-semibold">Izgled i tekst</span>
            <span className="block text-[12px] text-fg-muted">Predložak, format, naslov</span>
          </span>
          <ChevronDown className="size-5 shrink-0 text-fg-faint transition-transform group-open:rotate-180" />
        </summary>
        <div className="flex flex-col gap-4 border-t border-line py-4">
          <SocialDesign options={options} onChange={change} perPage={perPage} onPerPage={(value) => { setPerPage(value); setPage(0); }} />
          <SocialText options={options} onChange={change} />
        </div>
      </details>
    </div>
  );
}

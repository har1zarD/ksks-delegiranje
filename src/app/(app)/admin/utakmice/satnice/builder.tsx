"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Coffee, Download, ExternalLink, FileText } from "lucide-react";
import type { RoundSchedules, ScheduleMatch } from "@/lib/data/admin";
import { matchesLabel } from "@/lib/finance";
import { formatTime, formatWeekday, isoToSarajevo, MATCH_STATUS_LABEL, MONTHS_SHORT } from "@/lib/format";
import { buttonClass, CARD, cx, Field, Status, Textarea } from "@/components/ui";

const SIGNATURE = "Takmičarska komisija";

/** "sub 24. okt" */
function shortDate(iso: string) {
  const [, m, d] = isoToSarajevo(iso).date.split("-").map(Number);
  return `${formatWeekday(iso)} ${d}. ${MONTHS_SHORT[m - 1]}`;
}

/**
 * Satnice kola za klubove: takmičenje i kolo, utakmice koje idu u PDF, slobodna ekipa (ekipa bez utakmice u kolu)
 * i šta PDF prikazuje. Pregled desno je pravi PDF (ista adresa kao preuzimanje), osvježava se nakon izmjene.
 */
export function ScheduleBuilder({ competitions, matches, suggested }: RoundSchedules) {
  const [compIds, setCompIds] = useState<string[]>(() => (suggested ? [suggested] : competitions.slice(0, 1).map((c) => c.id)));
  const [round, setRound] = useState<number | null>(() => competitions.find((c) => c.id === suggested)?.nextRound ?? null);
  // Isključene utakmice i slobodne ekipe koje se ne ispisuju (sve ostalo ide u PDF)
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [hiddenFree, setHiddenFree] = useState<Set<string>>(new Set());
  const [title, setTitle] = useState("");
  const [cover, setCover] = useState(true);
  const [time, setTime] = useState(true);
  const [hall, setHall] = useState(true);
  const [note, setNote] = useState("");
  const [signature, setSignature] = useState(SIGNATURE);

  const selected = competitions.filter((c) => compIds.includes(c.id));
  const rounds = [...new Set(matches.filter((m) => compIds.includes(m.competitionId)).map((m) => m.round))].sort((a, b) => a - b);
  // Izabrano kolo, ili sljedeće kolo izabranih takmičenja kad izabrano ne postoji u njima
  const activeRound =
    round !== null && rounds.includes(round) ? round : (selected.map((c) => c.nextRound).filter((r) => rounds.includes(r)).sort((a, b) => a - b)[0] ?? rounds[0] ?? null);

  const groups = selected
    .map((c) => {
      const list = matches.filter((m) => m.competitionId === c.id && m.round === activeRound);
      const playing = new Set(list.flatMap((m) => [m.homeId, m.awayId]));
      return { competition: c, matches: list, resting: c.teams.filter((t) => !playing.has(t.id)) };
    })
    .filter((g) => g.matches.length > 0);

  const chosen = groups.flatMap((g) => g.matches.filter((m) => !excluded.has(m.id)));
  const free = groups.filter((g) => g.matches.some((m) => !excluded.has(m.id))).flatMap((g) => g.resting.filter((t) => !hiddenFree.has(t.id)));
  const labels = [...new Set(groups.filter((g) => g.matches.some((m) => !excluded.has(m.id))).map((g) => g.competition.label.toLocaleUpperCase("bs")))];
  const autoTitle = activeRound ? `${labels.join(" / ") || "SATNICE"} – ${activeRound}. KOLO` : "SATNICE";

  const query = (() => {
    if (chosen.length === 0) return null;
    const q = new URLSearchParams();
    q.set("m", chosen.map((m) => m.id).join(","));
    for (const t of free) q.append("s", t.id);
    q.set("naslov", title.trim() || autoTitle);
    if (!cover) q.set("naslovna", "0");
    if (!time) q.set("vrijeme", "0");
    if (!hall) q.set("dvorana", "0");
    if (note.trim()) q.set("napomena", note.trim());
    q.set("potpis", signature.trim());
    return q.toString();
  })();

  // Pregled se osvježava kad se izmjene smire (svaka nova adresa ponovo pravi PDF)
  const [preview, setPreview] = useState(query);
  useEffect(() => {
    const t = setTimeout(() => setPreview(query), 600);
    return () => clearTimeout(t);
  }, [query]);

  const pdf = query ? `/admin/utakmice/satnice/pdf?${query}` : null;

  const toggleComp = (id: string) => setCompIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  const toggleIn = (set: Set<string>, id: string) => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  };

  // Izabrano kolo vidljivo u traci kola
  const activeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [activeRound]);

  const roundDate = (r: number) => {
    const first = matches.find((m) => compIds.includes(m.competitionId) && m.round === r);
    if (!first) return "";
    const [, m, d] = isoToSarajevo(first.startsAt).date.split("-").map(Number);
    return `${d}. ${MONTHS_SHORT[m - 1]}`;
  };

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-8">
      <div className="flex min-w-0 flex-col gap-6">
        <Step n={1} title="Takmičenje i kolo">
          <div className="flex flex-wrap gap-2">
            {competitions.map((c) => (
              <Chip key={c.id} on={compIds.includes(c.id)} onClick={() => toggleComp(c.id)}>
                {c.shortName}
              </Chip>
            ))}
          </div>
          {rounds.length > 0 ? (
            <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0">
              <div className="inline-flex gap-0.5 rounded-lg bg-track p-[3px]">
                {rounds.map((r) => (
                  <button
                    key={r}
                    ref={r === activeRound ? activeRef : undefined}
                    type="button"
                    onClick={() => setRound(r)}
                    aria-pressed={r === activeRound}
                    className={cx(
                      "flex min-w-14 flex-col items-center rounded-md px-2.5 py-1.5 transition-colors",
                      r === activeRound ? "bg-panel-3 text-fg shadow-segment" : "text-fg-muted hover:bg-panel-3/60 hover:text-fg",
                    )}
                  >
                    <span className="scoreboard text-[17px] font-semibold leading-tight">{r}.</span>
                    <span className="whitespace-nowrap text-[11px] font-semibold">{roundDate(r)}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-[14px] text-fg-muted">Izaberi bar jedno takmičenje.</p>
          )}
        </Step>

        <Step n={2} title="Utakmice" aside={groups.length > 0 && <span className="text-[13px] font-semibold text-fg-faint">{`${chosen.length} od ${groups.reduce((s, g) => s + g.matches.length, 0)} u PDF-u`}</span>}>
          {groups.length === 0 ? (
            <p className="text-[14px] text-fg-muted">Nema utakmica za ovaj izbor.</p>
          ) : (
            groups.map((g) => {
              const all = g.matches.every((m) => !excluded.has(m.id));
              return (
                <section key={g.competition.id} className="overflow-hidden rounded-lg border border-line">
                  <header className="flex items-center justify-between gap-3 border-b border-line bg-panel-2 px-4 py-2.5">
                    <h3 className="min-w-0 truncate text-[14px] font-semibold">
                      {activeRound}. kolo · {g.competition.name}
                    </h3>
                    <button
                      type="button"
                      onClick={() =>
                        setExcluded((set) => {
                          const next = new Set(set);
                          for (const m of g.matches) {
                            if (all) next.add(m.id);
                            else next.delete(m.id);
                          }
                          return next;
                        })
                      }
                      className="shrink-0 text-[13px] font-semibold text-fg-muted underline-offset-4 hover:text-fg hover:underline"
                    >
                      {all ? "Isključi sve" : "Označi sve"}
                    </button>
                  </header>
                  <ul className="divide-y divide-line">
                    {g.matches.map((m) => (
                      <MatchOption key={m.id} match={m} on={!excluded.has(m.id)} onToggle={() => setExcluded((set) => toggleIn(set, m.id))} />
                    ))}
                  </ul>
                  <div className="flex flex-wrap items-center gap-2 border-t border-line px-4 py-3">
                    <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-fg-muted">
                      <Coffee className="size-4" aria-hidden="true" />
                      {g.resting.length > 1 ? "Slobodne ekipe" : "Slobodna ekipa"}
                    </span>
                    {g.resting.length === 0 ? (
                      <span className="text-[13px] text-fg-faint">Sve ekipe igraju ovo kolo</span>
                    ) : (
                      g.resting.map((t) => (
                        <Chip key={t.id} small on={!hiddenFree.has(t.id)} onClick={() => setHiddenFree((set) => toggleIn(set, t.id))}>
                          {t.name}
                        </Chip>
                      ))
                    )}
                  </div>
                </section>
              );
            })
          )}
        </Step>

        <Step n={3} title="Sadržaj PDF-a">
          <Field label="Naslov" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={autoTitle} hint="Prazno = automatski, po takmičenju i kolu" />
          <div className="grid gap-2 sm:grid-cols-3">
            <Toggle label="Naslovna strana" hint="Grb, sezona i naslov" checked={cover} onChange={setCover} />
            <Toggle label="Vrijeme početka" checked={time} onChange={setTime} />
            <Toggle label="Dvorana" checked={hall} onChange={setHall} />
          </div>
          <Textarea label="Napomena" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Npr. domaćin obezbjeđuje zapisnički sto." hint="Ispisuje se ispod utakmica" />
          <Field label="Potpis" value={signature} onChange={(e) => setSignature(e.target.value)} />
        </Step>
      </div>

      <aside className={cx(CARD, "flex flex-col gap-4 p-4 lg:sticky lg:top-6")}>
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-display text-[18px] font-semibold tracking-[-0.02em]">Pregled</h2>
          <span className="text-[13px] font-semibold text-fg-faint">{matchesLabel(chosen.length)}</span>
        </div>
        <div className="relative hidden aspect-[210/297] w-full overflow-hidden rounded-md border border-line bg-white lg:block">
          {preview ? (
            <iframe key={preview} src={`/admin/utakmice/satnice/pdf?${preview}#toolbar=0&navpanes=0&view=FitH`} title="Pregled PDF-a" className="size-full" />
          ) : (
            <div className="grid size-full place-items-center p-6 text-center text-[14px] text-black/50">
              <span className="flex flex-col items-center gap-3">
                <FileText className="size-8" strokeWidth={1.4} aria-hidden="true" />
                Označi bar jednu utakmicu.
              </span>
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <a href={pdf ?? undefined} target="_blank" rel="noopener" aria-disabled={!pdf} className={buttonClass("secondary", cx(!pdf && "pointer-events-none opacity-40"))}>
            <ExternalLink className="size-4" aria-hidden="true" /> Otvori
          </a>
          <a href={pdf ? `${pdf}&preuzmi` : undefined} download aria-disabled={!pdf} className={buttonClass("primary", cx(!pdf && "pointer-events-none opacity-40"))}>
            <Download className="size-4" aria-hidden="true" /> Preuzmi PDF
          </a>
        </div>
      </aside>
    </div>
  );
}

function Step({ n, title, aside, children }: { n: number; title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className={cx(CARD, "flex flex-col gap-4 p-4 sm:p-5")}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2.5 font-display text-[18px] font-semibold tracking-[-0.02em]">
          <span aria-hidden="true" className="scoreboard grid size-6 place-items-center rounded-full bg-brand text-[13px] font-semibold text-brand-ink">
            {n}
          </span>
          {title}
        </h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

function Chip({ on, onClick, small, children }: { on: boolean; onClick: () => void; small?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={cx(
        "inline-flex items-center rounded-full border font-semibold transition-colors",
        small ? "h-8 px-3 text-[13px]" : "h-10 px-4 text-[14px] sm:h-9",
        on ? "border-brand bg-brand text-brand-ink" : "border-line-strong bg-panel text-fg-muted hover:border-line-hover hover:text-fg",
      )}
    >
      {children}
    </button>
  );
}

function Toggle({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex min-h-12 items-center gap-3 rounded-md bg-panel-2 px-3.5 py-2.5 transition-colors hover:bg-brand-soft">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="size-5 shrink-0 accent-[var(--brand)]" />
      <span className="flex min-w-0 flex-col">
        <span className="text-[15px] font-medium sm:text-[14px]">{label}</span>
        {hint && <span className="text-[12px] text-fg-muted">{hint}</span>}
      </span>
    </label>
  );
}

/** Utakmica s kvačicom: ekipe, termin, dvorana i koliko sudija i komesara je delegirano */
function MatchOption({ match: m, on, onToggle }: { match: ScheduleMatch; on: boolean; onToggle: () => void }) {
  const delegated = m.officials.filter((o) => o.name).length;
  return (
    <li>
      <label className={cx("flex items-start gap-3 px-4 py-3 transition-colors hover:bg-panel-2", !on && "opacity-55")}>
        <input type="checkbox" checked={on} onChange={onToggle} className="mt-0.5 size-5 shrink-0 accent-[var(--brand)]" />
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
            <span className="min-w-0 text-[15px] font-semibold">
              {m.home} – {m.away}
            </span>
            <span className="tabular whitespace-nowrap text-[13px] font-medium text-fg-muted">
              {shortDate(m.startsAt)} · {formatTime(m.startsAt)}
            </span>
          </span>
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-fg-muted">
            <span>Utakmica {m.number}</span>
            {m.hall ? <span>{m.hall}</span> : <Status tone="orange">Bez dvorane</Status>}
            {m.officials.length > 0 && (
              <Status tone={delegated === m.officials.length ? "mint" : "gold"}>{`Sudije i komesar ${delegated}/${m.officials.length}`}</Status>
            )}
            {(m.status === "postponed" || m.status === "cancelled") && <Status tone="orange">{MATCH_STATUS_LABEL[m.status]}</Status>}
          </span>
        </span>
      </label>
    </li>
  );
}

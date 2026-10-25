"use client";

import { useEffect, useRef, useState } from "react";
import { Download, ExternalLink, FileText, LoaderCircle, RotateCcw } from "lucide-react";
import type { BulletinData, BulletinMatch } from "@/lib/data/admin";
import { BULLETIN_FIXTURES, defaultRemarks, delegatedOfficials, type BulletinOfficials, type BulletinRequest } from "@/lib/bulletin";
import { matchesLabel } from "@/lib/finance";
import { isoToSarajevo, MATCH_STATUS_LABEL, MONTHS_SHORT } from "@/lib/format";
import { Button, CARD, cx, Field, inputClass, Status, Textarea } from "@/components/ui";
import { Chip, Step, Toggle } from "../utakmice/satnice/builder";
import { getFibaOfficials, makeBulletinPdf } from "./actions";

const SIGNATURE = "Takmičarska komisija";
const DECISIONS = "Sve utakmice se registruju postignutim rezultatima.";

/**
 * Bilten: takmičenje i kolo, utakmice koje se registruju (s primjedbama iz biltena komesara, mogu se ispraviti)
 * i dijelovi biltena (odluke, tabela, nominacija narednog kola). Pregled desno je pravi PDF, osvježava se nakon izmjene.
 */
export function BulletinBuilder({ competitions, matches, suggested }: BulletinData) {
  const [compIds, setCompIds] = useState<string[]>(() => (suggested ? [suggested.competitionId] : competitions.slice(0, 1).map((c) => c.id)));
  const [round, setRound] = useState<number | null>(suggested?.round ?? null);
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  // Ispravljene primjedbe (id → tekst); bez zapisa = automatski iz biltena komesara
  const [remarks, setRemarks] = useState<Record<string, string>>({});
  // Komesar i sudije: ručni unos (id → imena) i FIBA statistika povezanih utakmica (FIBA id → imena)
  const [officialEdits, setOfficialEdits] = useState<Record<string, BulletinOfficials>>({});
  const [fibaOfficials, setFibaOfficials] = useState<Record<number, BulletinOfficials>>({});
  const [registration, setRegistration] = useState(true);
  const [decisionsOn, setDecisionsOn] = useState(true);
  const [decisions, setDecisions] = useState(DECISIONS);
  const [standings, setStandings] = useState(true);
  const [nominationsOn, setNominationsOn] = useState(true);
  const [names, setNames] = useState(true);
  const [number, setNumber] = useState("");
  const [title, setTitle] = useState("");
  const [cover, setCover] = useState(true);
  const [signature, setSignature] = useState(SIGNATURE);

  const selected = competitions.filter((c) => compIds.includes(c.id));
  const own = matches.filter((m) => compIds.includes(m.competitionId));
  const rounds = [...new Set(own.map((m) => m.round))].sort((a, b) => a - b);
  const activeRound = round !== null && rounds.includes(round) ? round : (rounds.findLast((r) => own.some((m) => m.round === r && m.status === "finished")) ?? rounds[0] ?? null);
  // Naredno kolo: iz utakmica u aplikaciji ili iz rasporeda saveza (A2 jug, A1 žene), kad kolo još nije napravljeno
  const fixturesOf = (competitionId: string) => BULLETIN_FIXTURES[competitionId] ?? [];
  const nextRound =
    [...new Set([...rounds, ...selected.flatMap((c) => fixturesOf(c.id).map((f) => f.round))])].sort((a, b) => a - b).find((r) => activeRound !== null && r > activeRound) ?? null;

  const groups = selected
    .map((c) => ({ competition: c, matches: own.filter((m) => m.competitionId === c.id && m.round === activeRound).sort((a, b) => (a.number ?? Infinity) - (b.number ?? Infinity) || 0) }))
    .filter((g) => g.matches.length > 0);
  const chosen = groups.flatMap((g) => g.matches.filter((m) => !excluded.has(m.id)));
  const nominated =
    nextRound === null
      ? 0
      : selected.reduce((n, c) => n + (own.filter((m) => m.competitionId === c.id && m.round === nextRound).length || fixturesOf(c.id).filter((f) => f.round === nextRound).length), 0);
  const autoTitle = [...new Set(selected.map((c) => c.label))].join(" / ") || "Bilten";

  // FIBA statistika utakmica u izboru (jednom po utakmici)
  const fibaIds = groups.flatMap((g) => g.matches.flatMap((m) => (m.fibaGameId ? [m.fibaGameId] : [])));
  const missingFiba = fibaIds.filter((id) => !(id in fibaOfficials)).join(",");
  useEffect(() => {
    if (!missingFiba) return;
    const ids = missingFiba.split(",").map(Number);
    let stale = false;
    getFibaOfficials(ids)
      .then((found) => {
        // I utakmica bez podataka se pamti (prazno), da se ne traži ponovo
        if (!stale) setFibaOfficials((old) => ({ ...old, ...Object.fromEntries(ids.map((id) => [id, found[id] ?? { commissioner: "", referees: "" }])) }));
      })
      .catch(() => {});
    return () => {
      stale = true;
    };
  }, [missingFiba]);

  /** Imena u biltenu: ručni unos, inače delegiranje, inače FIBA statistika (po polju) */
  const officialsOf = (m: BulletinMatch): BulletinOfficials & { source: string | null } => {
    const delegated = delegatedOfficials(m.officials);
    const fiba = m.fibaGameId ? fibaOfficials[m.fibaGameId] : undefined;
    const auto = {
      commissioner: delegated.commissioner || fiba?.commissioner || "",
      referees: delegated.referees || fiba?.referees || "",
    };
    const source = delegated.commissioner || delegated.referees ? "iz delegiranja" : fiba?.commissioner || fiba?.referees ? "iz FIBA statistike" : null;
    return { ...auto, ...officialEdits[m.id], source: officialEdits[m.id] ? "ručno" : source };
  };

  const request = ((): BulletinRequest | null => {
    const regIds = registration ? chosen.map((m) => m.id) : [];
    const decisionText = decisionsOn && decisions.trim() ? decisions : null;
    const nominations = nominationsOn && nextRound !== null && nominated > 0 ? { round: nextRound, names } : null;
    if (compIds.length === 0 || (regIds.length === 0 && !decisionText && !standings && !nominations)) return null;
    return {
      number,
      title: title.trim() || autoTitle,
      signature,
      cover,
      competitionIds: compIds,
      round: activeRound,
      matchIds: regIds,
      remarks: Object.fromEntries(regIds.filter((id) => id in remarks).map((id) => [id, remarks[id]])),
      officials: Object.fromEntries(
        (registration ? chosen : []).map((m) => {
          const { commissioner, referees } = officialsOf(m);
          return [m.id, { commissioner, referees }];
        }),
      ),
      decisions: decisionText,
      standings,
      nominations,
    };
  })();
  // Pregled se pravi ponovo samo kad se zahtjev stvarno promijeni (poređenje teksta)
  const body = request ? JSON.stringify(request) : null;

  // Pregled: PDF se pravi kad se izmjene smire (server action); stari blob se oslobađa. `pdf.body` = zahtjev od kojeg je napravljen
  const [pdf, setPdf] = useState<{ body: string; url: string; name: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  useEffect(() => {
    // Bez zahtjeva se pregled ne prikazuje (uslov `preview` u prikazu)
    if (!body) return;
    let stale = false;
    const t = setTimeout(async () => {
      setLoading(true);
      setError(undefined);
      try {
        const res = await makeBulletinPdf(JSON.parse(body) as BulletinRequest);
        if (stale) return;
        if ("error" in res) throw new Error(res.error);
        const bytes = Uint8Array.from(atob(res.pdf), (c) => c.charCodeAt(0));
        const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
        setPdf((old) => {
          if (old) URL.revokeObjectURL(old.url);
          return { body, url, name: res.name };
        });
      } catch (e) {
        if (!stale) setError(e instanceof Error && e.message ? e.message : "PDF se nije napravio.");
      } finally {
        if (!stale) setLoading(false);
      }
    }, 700);
    return () => {
      stale = true;
      clearTimeout(t);
    };
  }, [body]);
  // Pregled i preuzimanje samo za PDF trenutnog izbora
  const preview = pdf && pdf.body === body ? pdf.url : null;

  function download() {
    if (!pdf || !preview) return;
    const a = document.createElement("a");
    a.href = preview;
    a.download = pdf.name;
    a.click();
  }

  const toggleComp = (id: string) => setCompIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  const toggleMatch = (id: string) =>
    setExcluded((set) => {
      const next = new Set(set);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  // Izabrano kolo vidljivo u traci kola
  const activeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [activeRound]);

  const roundDate = (r: number) => {
    const first = own.find((m) => m.round === r);
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

        <Step
          n={2}
          title="Registracija utakmica"
          aside={
            <label className="flex items-center gap-2 text-[14px] font-medium">
              <input type="checkbox" checked={registration} onChange={(e) => setRegistration(e.target.checked)} className="size-5 accent-[var(--brand)]" />
              U biltenu
            </label>
          }
        >
          {!registration ? (
            <p className="text-[14px] text-fg-muted">Registracija utakmica se ne ispisuje.</p>
          ) : groups.length === 0 ? (
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
                      <MatchOption
                        key={m.id}
                        match={m}
                        on={!excluded.has(m.id)}
                        onToggle={() => toggleMatch(m.id)}
                        officials={officialsOf(m)}
                        onOfficials={(change) =>
                          setOfficialEdits((o) => {
                            const { commissioner, referees } = officialsOf(m);
                            return { ...o, [m.id]: { commissioner, referees, ...change } };
                          })
                        }
                        remarks={remarks[m.id]}
                        onRemarks={(text) => setRemarks((r) => ({ ...r, [m.id]: text }))}
                        onReset={() =>
                          setRemarks((r) => {
                            const next = { ...r };
                            delete next[m.id];
                            return next;
                          })
                        }
                      />
                    ))}
                  </ul>
                </section>
              );
            })
          )}
        </Step>

        <Step n={3} title="Ostali dijelovi">
          <div className="flex flex-col gap-3">
            <Toggle label="Tabela" hint={selected.length > 1 ? "Tabela svakog izabranog takmičenja" : "Iz rezultata u aplikaciji"} checked={standings} onChange={setStandings} />
            <Toggle label="Odluke" hint="Ispod tabele; svaki red je jedna odluka, brojevi se dodaju sami" checked={decisionsOn} onChange={setDecisionsOn} />
            {decisionsOn && (
              <Textarea
                label="Odluke"
                value={decisions}
                onChange={(e) => setDecisions(e.target.value)}
                rows={Math.max(4, decisions.split("\n").length + 1)}
                placeholder={"Sve utakmice se registruju postignutim rezultatima.\nKažnjava se ekipa … sa 100,00 KM po članu 55. C. 1. Propozicija takmičenja."}
              />
            )}
            <Toggle
              label={nextRound !== null ? `Nominacija ${nextRound}. kola` : "Nominacija narednog kola"}
              hint={nextRound !== null ? `${matchesLabel(nominated)}: datum, dvorana (ako je upisana), komesar i sudije` : "Nema narednog kola"}
              checked={nominationsOn && nextRound !== null}
              onChange={setNominationsOn}
            />
            {nominationsOn && nextRound !== null && (
              <div className="flex flex-wrap gap-2 pl-1">
                <Chip small on={names} onClick={() => setNames(true)}>
                  Imena delegiranih
                </Chip>
                <Chip small on={!names} onClick={() => setNames(false)}>
                  Prazna polja
                </Chip>
              </div>
            )}
          </div>
        </Step>

        <Step n={4} title="Zaglavlje">
          <div className="grid gap-3 sm:grid-cols-[140px_minmax(0,1fr)]">
            <Field label="Broj biltena" value={number} onChange={(e) => setNumber(e.target.value)} inputMode="numeric" placeholder="npr. 3" />
            <Field label="Naslov" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={autoTitle} hint="Prazno = naziv takmičenja" />
          </div>
          <Toggle label="Naslovna strana" hint="Grb, broj biltena i sadržaj" checked={cover} onChange={setCover} />
          <Field label="Potpis" value={signature} onChange={(e) => setSignature(e.target.value)} />
        </Step>
      </div>

      <aside className={cx(CARD, "flex flex-col gap-4 p-4 lg:sticky lg:top-6")}>
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-display text-[18px] font-semibold tracking-[-0.02em]">Pregled</h2>
          <span className="flex items-center gap-1.5 text-[13px] font-semibold text-fg-faint">
            {loading && <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" />}
            {registration ? matchesLabel(chosen.length) : ""}
          </span>
        </div>
        <div className="relative hidden aspect-[210/297] w-full overflow-hidden rounded-md border border-line bg-white lg:block">
          {preview ? (
            <iframe key={preview} src={`${preview}#toolbar=0&navpanes=0&view=FitH`} title="Pregled PDF-a" className="size-full" />
          ) : (
            <div className="grid size-full place-items-center p-6 text-center text-[14px] text-black/50">
              <span className="flex flex-col items-center gap-3">
                <FileText className="size-8" strokeWidth={1.4} aria-hidden="true" />
                {body ? "Pravim PDF…" : "Izaberi takmičenje i bar jedan dio biltena."}
              </span>
            </div>
          )}
        </div>
        {error && <p className="text-[13px] font-medium text-crest">{error}</p>}
        <div className="grid grid-cols-2 gap-2">
          <Button variant="secondary" disabled={!preview} onClick={() => preview && window.open(preview, "_blank", "noopener")}>
            <ExternalLink className="size-4" aria-hidden="true" /> Otvori
          </Button>
          <Button disabled={!preview} onClick={download}>
            <Download className="size-4" aria-hidden="true" /> Preuzmi PDF
          </Button>
        </div>
      </aside>
    </div>
  );
}

/** Utakmica s kvačicom: ekipe, rezultat, stanje biltena komesara; komesar, sudije i primjedbe koje idu u bilten (mogu se ispraviti) */
function MatchOption({
  match: m,
  on,
  onToggle,
  officials,
  onOfficials,
  remarks,
  onRemarks,
  onReset,
}: {
  match: BulletinMatch;
  on: boolean;
  onToggle: () => void;
  officials: BulletinOfficials & { source: string | null };
  onOfficials: (change: Partial<BulletinOfficials>) => void;
  remarks: string | undefined;
  onRemarks: (text: string) => void;
  onReset: () => void;
}) {
  const auto = defaultRemarks(m);
  const text = remarks ?? auto;
  return (
    <li className={cx("flex flex-col gap-3 px-4 py-3", !on && "opacity-55")}>
      <label className="flex cursor-pointer items-start gap-3">
        <input type="checkbox" checked={on} onChange={onToggle} className="mt-0.5 size-5 shrink-0 accent-[var(--brand)]" />
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
            <span className="min-w-0 text-[15px] font-semibold">
              {m.home} – {m.away}
            </span>
            <span className="scoreboard whitespace-nowrap text-[17px] font-semibold">
              {m.score ? `${m.score.home} : ${m.score.away}` : <span className="text-[13px] text-fg-muted">{MATCH_STATUS_LABEL[m.status]}</span>}
            </span>
          </span>
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-fg-muted">
            {m.number != null && <span>Utakmica {m.number}</span>}
            {m.fibaGameId && <span>FIBA statistika</span>}
            {m.report ? (
              <Status tone={m.report.submitted ? "mint" : "gold"}>{m.report.submitted ? "Bilten komesara poslan" : "Bilten komesara u nacrtu"}</Status>
            ) : (
              m.status === "finished" && <Status tone="orange">Komesar nije upisao bilten</Status>
            )}
          </span>
        </span>
      </label>
      {on && (
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] sm:pl-8">
          <Field
            label="Komesar"
            value={officials.commissioner}
            onChange={(e) => onOfficials({ commissioner: e.target.value })}
            placeholder="Ime i prezime"
            hint={officials.source ?? "Nije delegiran ni u FIBA statistici"}
          />
          <Field label="Sudije" value={officials.referees} onChange={(e) => onOfficials({ referees: e.target.value })} placeholder="Imena, razdvojena zarezom" />
        </div>
      )}
      {on && (
        <div className="flex flex-col gap-1.5 sm:pl-8">
          <span className="flex items-center justify-between gap-3 text-[13px] font-medium text-fg-muted">
            Primjedbe
            {remarks !== undefined && remarks !== auto && (
              <button type="button" onClick={onReset} className="inline-flex items-center gap-1 text-[12px] font-semibold underline-offset-4 hover:text-fg hover:underline">
                <RotateCcw className="size-3" aria-hidden="true" /> Vrati iz biltena komesara
              </button>
            )}
          </span>
          <textarea
            aria-label={`Primjedbe, ${m.home} – ${m.away}`}
            value={text}
            onChange={(e) => onRemarks(e.target.value)}
            rows={Math.max(2, text.split("\n").length)}
            className={cx(inputClass, "h-auto py-2.5 text-[14px] sm:text-[13px]")}
          />
        </div>
      )}
    </li>
  );
}

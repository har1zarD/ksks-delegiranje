"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Download, ExternalLink, FileText, LoaderCircle, Plus, RotateCcw, Save, X } from "lucide-react";
import type { BulletinData, BulletinMatch } from "@/lib/data/admin";
import {
  BULLETIN_FIXTURES,
  DECISIONS,
  defaultRemarks,
  delegatedOfficials,
  type BulletinDraft,
  type BulletinManualMatch,
  type BulletinOfficials,
  type BulletinRequest,
  type BulletinScore,
} from "@/lib/bulletin";
import { matchesLabel } from "@/lib/finance";
import { formatDate, formatTime, isoToSarajevo, MATCH_STATUS_LABEL, MONTHS_SHORT } from "@/lib/format";
import { Button, CARD, cx, Field, inputClass, Status, Textarea } from "@/components/ui";
import { Chip, Step, Toggle } from "../utakmice/satnice/builder";
import { getFibaOfficials, makeBulletinDocx, makeBulletinPdf, saveBulletin } from "./actions";

const SIGNATURE = "Takmičarska komisija";
const manualId = () => `manual-${crypto.randomUUID()}`;

/**
 * Bilten: takmičenje i kolo, utakmice koje se registruju (s primjedbama iz biltena komesara, mogu se ispraviti)
 * i dijelovi biltena (odluke, tabela, nominacija narednog kola). Pregled desno je pravi PDF, osvježava se nakon izmjene.
 */
/** Sačuvan bilten koji se otvara (id null = novi, draft null = prazan bilder) i predloženi broj novog biltena */
export type BulletinInitial = { id: string | null; draft: BulletinDraft | null; updatedAt: string | null; number: string };

export function BulletinBuilder({ competitions, matches, suggested, initial }: BulletinData & { initial: BulletinInitial }) {
  const d = initial.draft;
  const [compIds, setCompIds] = useState<string[]>(() => d?.competitionIds ?? (suggested ? [suggested.competitionId] : competitions.slice(0, 1).map((c) => c.id)));
  const [round, setRound] = useState<number | null>(d ? d.round : (suggested?.round ?? null));
  const [excluded, setExcluded] = useState<Set<string>>(() => new Set(d?.excluded ?? []));
  // Ispravljene primjedbe (id → tekst); bez zapisa = automatski iz biltena komesara
  const [remarks, setRemarks] = useState<Record<string, string>>(d?.remarks ?? {});
  // Komesar i sudije: ručni unos (id → imena) i FIBA statistika povezanih utakmica (FIBA id → imena)
  const [officialEdits, setOfficialEdits] = useState<Record<string, BulletinOfficials>>(d?.officials ?? {});
  const [fibaOfficials, setFibaOfficials] = useState<Record<number, BulletinOfficials>>({});
  // Rezultat i četvrtine ispravljeni ručno (npr. kad je FIBA statistika pala tokom utakmice) i utakmice dopisane ručno
  const [scoreEdits, setScoreEdits] = useState<Record<string, BulletinScore>>(d?.scores ?? {});
  const [manual, setManual] = useState<BulletinManualMatch[]>(d?.manual ?? []);
  const [registration, setRegistration] = useState(d?.registration ?? true);
  const [decisionsOn, setDecisionsOn] = useState(d?.decisionsOn ?? true);
  const [decisions, setDecisions] = useState(d?.decisions ?? DECISIONS);
  const [standings, setStandings] = useState(d?.standings ?? true);
  const [nominationsOn, setNominationsOn] = useState(d?.nominationsOn ?? true);
  const [names, setNames] = useState(d?.names ?? true);
  const [number, setNumber] = useState(d?.number ?? initial.number);
  const [title, setTitle] = useState(d?.title ?? "");
  const [cover, setCover] = useState(d?.cover ?? true);
  const [signature, setSignature] = useState(d?.signature ?? SIGNATURE);

  const selected = competitions.filter((c) => compIds.includes(c.id));
  const own = matches.filter((m) => compIds.includes(m.competitionId));
  const rounds = [...new Set(own.map((m) => m.round))].sort((a, b) => a - b);
  const activeRound = round !== null && rounds.includes(round) ? round : (rounds.findLast((r) => own.some((m) => m.round === r && m.status === "finished")) ?? rounds[0] ?? null);
  // Naredno kolo: iz utakmica u aplikaciji ili iz rasporeda saveza (A2 jug, A1 žene), kad kolo još nije napravljeno
  const fixturesOf = (competitionId: string) => BULLETIN_FIXTURES[competitionId] ?? [];
  const nextRound =
    [...new Set([...rounds, ...selected.flatMap((c) => fixturesOf(c.id).map((f) => f.round))])].sort((a, b) => a - b).find((r) => activeRound !== null && r > activeRound) ?? null;

  // Takmičenja bez utakmica ovog kola ostaju vidljiva (ručno dopisana utakmica se moze dodati i bez ičega drugog)
  const groups = selected.map((c) => ({
    competition: c,
    matches: own.filter((m) => m.competitionId === c.id && m.round === activeRound).sort((a, b) => (a.number ?? Infinity) - (b.number ?? Infinity) || 0),
    manual: manual.filter((x) => x.competitionId === c.id && x.round === activeRound),
  }));
  const chosen = groups.flatMap((g) => g.matches.filter((m) => !excluded.has(m.id)));
  const chosenManual = groups.flatMap((g) => g.manual);
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

  /** Rezultat i četvrtine: ručno ispravljeni, inače iz aplikacije (FIBA statistika ili upisan rezultat) */
  const scoreOf = (m: BulletinMatch): BulletinScore & { source: string | null } => {
    const edit = scoreEdits[m.id];
    if (edit) return { ...edit, source: "ručno" };
    return { home: m.score?.home ?? 0, away: m.score?.away ?? 0, periods: m.periods, source: null };
  };

  const request = ((): BulletinRequest | null => {
    const regIds = registration ? chosen.map((m) => m.id) : [];
    const regManual = registration ? chosenManual : [];
    const decisionText = decisionsOn && decisions.trim() ? decisions : null;
    const nominations = nominationsOn && nextRound !== null && nominated > 0 ? { round: nextRound, names } : null;
    if (compIds.length === 0 || (regIds.length === 0 && regManual.length === 0 && !decisionText && !standings && !nominations)) return null;
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
      scores: Object.fromEntries(regIds.filter((id) => id in scoreEdits).map((id) => [id, scoreEdits[id]])),
      manual: regManual,
      decisions: decisionText,
      standings,
      nominations,
    };
  })();
  // Pregled se pravi ponovo samo kad se zahtjev stvarno promijeni (poređenje teksta)
  const body = request ? JSON.stringify(request) : null;

  // Čuvanje: stanje bildera (kolo konkretno), poređenjem teksta se zna ima li nesačuvanih izmjena
  const draft: BulletinDraft = {
    competitionIds: compIds,
    round: activeRound,
    excluded: [...excluded],
    remarks,
    officials: officialEdits,
    scores: scoreEdits,
    manual,
    registration,
    decisionsOn,
    decisions,
    standings,
    nominationsOn,
    names,
    number,
    title,
    cover,
    signature,
  };
  const draftJson = JSON.stringify(draft);
  const [saved, setSaved] = useState<{ id: string | null; json: string | null; at: string | null }>({ id: initial.id, json: initial.id ? draftJson : null, at: initial.updatedAt });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string>();
  const dirty = saved.json !== draftJson;

  async function save() {
    if (saving || compIds.length === 0) return;
    setSaving(true);
    setSaveError(undefined);
    const json = draftJson;
    try {
      const res = await saveBulletin(saved.id, JSON.parse(json) as BulletinDraft, title.trim() || autoTitle);
      if ("error" in res) throw new Error(res.error);
      setSaved({ id: res.id, json, at: res.updatedAt });
      // Novi bilten dobija svoj link (bez ponovnog učitavanja stranice)
      if (!saved.id) window.history.replaceState(null, "", `/admin/bilteni?b=${res.id}`);
    } catch (e) {
      setSaveError(e instanceof Error && e.message ? e.message : "Bilten nije sačuvan.");
    } finally {
      setSaving(false);
    }
  }
  // Cmd/Ctrl+S čuva; upozorenje prije zatvaranja s nesačuvanim izmjenama
  const saveRef = useRef(save);
  useEffect(() => {
    saveRef.current = save;
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void saveRef.current();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  useEffect(() => {
    if (!dirty) return;
    const onLeave = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, [dirty]);

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

  // Word istog biltena: pravi se tek na klik (pregled je PDF)
  const [word, setWord] = useState(false);
  async function downloadWord() {
    if (!body) return;
    setWord(true);
    setError(undefined);
    try {
      const res = await makeBulletinDocx(JSON.parse(body) as BulletinRequest);
      if ("error" in res) throw new Error(res.error);
      const bytes = Uint8Array.from(atob(res.docx), (c) => c.charCodeAt(0));
      const url = URL.createObjectURL(new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = res.name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "Word se nije napravio.");
    } finally {
      setWord(false);
    }
  }

  const toggleComp = (id: string) => setCompIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  const toggleMatch = (id: string) =>
    setExcluded((set) => {
      const next = new Set(set);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const addManualMatch = (competitionId: string, input: { home: string; away: string; score: BulletinScore | null }) => {
    const match: BulletinManualMatch = {
      id: manualId(),
      competitionId,
      round: activeRound,
      number: null,
      home: input.home,
      away: input.away,
      score: input.score,
      officials: { commissioner: "", referees: "" },
      remarks: "",
    };
    setManual((old) => [...old, match]);
  };
  const updateManualMatch = (id: string, patch: Partial<BulletinManualMatch>) => setManual((old) => old.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  const removeManualMatch = (id: string) => setManual((old) => old.filter((x) => x.id !== id));

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

  const savedLabel = saved.at ? `Sačuvano ${formatDate(isoToSarajevo(saved.at).date)} u ${formatTime(saved.at)}` : null;

  return (
    <div className="flex flex-col gap-6">
      <div className={cx(CARD, "sticky top-2 z-10 flex flex-wrap items-center justify-between gap-3 px-4 py-3")}>
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href="/admin/bilteni"
            onClick={(e) => {
              if (dirty && !window.confirm("Bilten ima nesačuvane izmjene. Izaći bez čuvanja?")) e.preventDefault();
            }}
            className="grid size-9 shrink-0 place-items-center rounded-md text-fg-muted hover:bg-panel-2 hover:text-fg"
            aria-label="Svi bilteni"
          >
            <ArrowLeft className="size-5" aria-hidden="true" />
          </Link>
          <div className="min-w-0">
            <p className="truncate text-[15px] font-semibold">
              {number.trim() ? `Bilten br. ${number.trim()}` : "Bilten"} · {title.trim() || autoTitle}
            </p>
            <p className="text-[13px] text-fg-muted">
              {saveError ? (
                <span className="font-medium text-crest">{saveError}</span>
              ) : saving ? (
                "Čuvam…"
              ) : !saved.id ? (
                "Novi bilten, još nije sačuvan"
              ) : dirty ? (
                <span className="font-medium text-orange">Nesačuvane izmjene</span>
              ) : (
                savedLabel
              )}
            </p>
          </div>
        </div>
        <Button onClick={save} disabled={saving || compIds.length === 0 || (!dirty && saved.id !== null)}>
          {saving ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : !dirty && saved.id ? <Check className="size-4" aria-hidden="true" /> : <Save className="size-4" aria-hidden="true" />}
          {!dirty && saved.id ? "Sačuvano" : "Sačuvaj"}
        </Button>
      </div>
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
                    {g.matches.length > 0 && (
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
                    )}
                  </header>
                  {g.matches.length === 0 && g.manual.length === 0 && <p className="px-4 py-3 text-[14px] text-fg-muted">Nema prijavljenih utakmica za ovo kolo.</p>}
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
                        score={scoreOf(m)}
                        onScore={(next) => setScoreEdits((s) => ({ ...s, [m.id]: next }))}
                        onScoreReset={() =>
                          setScoreEdits((s) => {
                            const next = { ...s };
                            delete next[m.id];
                            return next;
                          })
                        }
                      />
                    ))}
                    {g.manual.map((x) => (
                      <ManualMatchOption key={x.id} match={x} onChange={(patch) => updateManualMatch(x.id, patch)} onRemove={() => removeManualMatch(x.id)} />
                    ))}
                    <AddManualMatch onAdd={(input) => addManualMatch(g.competition.id, input)} />
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
            {registration ? matchesLabel(chosen.length + chosenManual.length) : ""}
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
          <Button variant="secondary" className="col-span-2" disabled={!body || word} onClick={downloadWord}>
            {word ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <FileText className="size-4" aria-hidden="true" />} Preuzmi Word
          </Button>
        </div>
      </aside>
    </div>
    </div>
  );
}

/** Utakmica s kvačicom: ekipe, rezultat, stanje biltena komesara; komesar, sudije, rezultat i primjedbe koje idu u bilten (mogu se ispraviti) */
function MatchOption({
  match: m,
  on,
  onToggle,
  officials,
  onOfficials,
  remarks,
  onRemarks,
  onReset,
  score,
  onScore,
  onScoreReset,
}: {
  match: BulletinMatch;
  on: boolean;
  onToggle: () => void;
  officials: BulletinOfficials & { source: string | null };
  onOfficials: (change: Partial<BulletinOfficials>) => void;
  remarks: string | undefined;
  onRemarks: (text: string) => void;
  onReset: () => void;
  score: BulletinScore & { source: string | null };
  onScore: (next: BulletinScore) => void;
  onScoreReset: () => void;
}) {
  const auto = defaultRemarks(m);
  const text = remarks ?? auto;
  const [editingScore, setEditingScore] = useState(score.source !== null);
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
              {score.source || m.score ? `${score.home} : ${score.away}` : <span className="text-[13px] text-fg-muted">{MATCH_STATUS_LABEL[m.status]}</span>}
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
        <div className="flex flex-col gap-1.5 sm:pl-8">
          <span className="flex items-center justify-between gap-3 text-[13px] font-medium text-fg-muted">
            Rezultat
            <button type="button" onClick={() => setEditingScore((v) => !v)} className="inline-flex items-center gap-1 text-[12px] font-semibold underline-offset-4 hover:text-fg hover:underline">
              {editingScore ? "Sakrij" : "Ispravi rezultat"}
            </button>
          </span>
          {editingScore && (
            <ScoreEditor
              score={{ home: score.home, away: score.away, periods: score.periods }}
              onChange={onScore}
              onReset={score.source ? onScoreReset : undefined}
              hint={score.source ? "Ručno ispravljen" : m.fibaGameId ? "Iz FIBA statistike" : "Zbir iz aplikacije"}
            />
          )}
        </div>
      )}
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

/** Rezultat i, kad su upisane, četvrtine: upisan zbir kad nema četvrtina, inače se zbir računa iz njih */
function ScoreEditor({
  score,
  onChange,
  onReset,
  hint,
}: {
  score: BulletinScore;
  onChange: (next: BulletinScore) => void;
  onReset?: () => void;
  hint?: string;
}) {
  const [open, setOpen] = useState(score.periods.length > 0);
  const sumOf = (periods: BulletinScore["periods"]) => periods.reduce((t, p) => ({ home: t.home + p.home, away: t.away + p.away }), { home: 0, away: 0 });
  const setPeriod = (i: number, side: "home" | "away", v: number) => {
    const periods = score.periods.map((p, idx) => (idx === i ? { ...p, [side]: v } : p));
    onChange({ ...sumOf(periods), periods });
  };
  const addPeriod = () => onChange({ ...score, periods: [...score.periods, { home: 0, away: 0 }] });
  const removePeriod = () => {
    const periods = score.periods.slice(0, -1);
    onChange(periods.length > 0 ? { ...sumOf(periods), periods } : { ...score, periods });
  };
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="number"
          min={0}
          max={300}
          value={score.home}
          disabled={score.periods.length > 0}
          onChange={(e) => onChange({ ...score, home: Number(e.target.value) || 0 })}
          aria-label="Poeni domaćina"
          className={cx(inputClass, "h-9 w-16 px-2 text-center")}
        />
        <span className="text-fg-muted">:</span>
        <input
          type="number"
          min={0}
          max={300}
          value={score.away}
          disabled={score.periods.length > 0}
          onChange={(e) => onChange({ ...score, away: Number(e.target.value) || 0 })}
          aria-label="Poeni gosta"
          className={cx(inputClass, "h-9 w-16 px-2 text-center")}
        />
        <button type="button" onClick={() => setOpen((v) => !v)} className="text-[12px] font-semibold text-fg-muted underline-offset-4 hover:text-fg hover:underline">
          {open ? "Sakrij četvrtine" : "Po četvrtinama"}
        </button>
        {onReset && (
          <button type="button" onClick={onReset} className="inline-flex items-center gap-1 text-[12px] font-semibold underline-offset-4 hover:text-fg hover:underline">
            <RotateCcw className="size-3" aria-hidden="true" /> Vrati originalni rezultat
          </button>
        )}
        {hint && <span className="text-[12px] text-fg-faint">{hint}</span>}
      </div>
      {open && (
        <div className="flex flex-wrap items-center gap-2 pl-1">
          {score.periods.map((p, i) => (
            <div key={i} className="flex items-center gap-1">
              <span className="text-[11px] text-fg-faint">{i + 1}.</span>
              <input
                type="number"
                min={0}
                max={200}
                value={p.home}
                onChange={(e) => setPeriod(i, "home", Number(e.target.value) || 0)}
                aria-label={`${i + 1}. četvrtina, domaćin`}
                className={cx(inputClass, "h-8 w-12 px-1 text-center text-[13px]")}
              />
              <span className="text-fg-faint">:</span>
              <input
                type="number"
                min={0}
                max={200}
                value={p.away}
                onChange={(e) => setPeriod(i, "away", Number(e.target.value) || 0)}
                aria-label={`${i + 1}. četvrtina, gost`}
                className={cx(inputClass, "h-8 w-12 px-1 text-center text-[13px]")}
              />
            </div>
          ))}
          <button type="button" onClick={addPeriod} className="text-[12px] font-semibold text-brand hover:underline">
            + Dodaj
          </button>
          {score.periods.length > 0 && (
            <button type="button" onClick={removePeriod} className="text-[12px] font-semibold text-fg-muted hover:underline">
              Ukloni zadnju
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/** Utakmica ručno dopisana u registraciju: ekipe, rezultat, komesar, sudije i primjedbe se upisuju direktno (nema izvora iz aplikacije) */
function ManualMatchOption({ match: x, onChange, onRemove }: { match: BulletinManualMatch; onChange: (patch: Partial<BulletinManualMatch>) => void; onRemove: () => void }) {
  return (
    <li className="flex flex-col gap-3 bg-brand-soft/40 px-4 py-3">
      <div className="flex items-start gap-3">
        <span className="mt-1.5 shrink-0 rounded bg-brand-soft px-1.5 py-0.5 text-[11px] font-semibold text-brand">RUČNO</span>
        <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-2">
          <input value={x.home} onChange={(e) => onChange({ home: e.target.value })} placeholder="Domaćin" aria-label="Domaćin" className={inputClass} />
          <input value={x.away} onChange={(e) => onChange({ away: e.target.value })} placeholder="Gost" aria-label="Gost" className={inputClass} />
        </div>
        <button type="button" aria-label="Ukloni ručno dodanu utakmicu" title="Ukloni" onClick={onRemove} className="mt-1 shrink-0 rounded-md p-1 text-fg-faint hover:bg-panel-3 hover:text-crest">
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>
      <div className="flex flex-col gap-1.5 sm:pl-8">
        <span className="text-[13px] font-medium text-fg-muted">Rezultat</span>
        <ScoreEditor score={x.score ?? { home: 0, away: 0, periods: [] }} onChange={(score) => onChange({ score })} />
      </div>
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] sm:pl-8">
        <Field label="Komesar" value={x.officials.commissioner} onChange={(e) => onChange({ officials: { ...x.officials, commissioner: e.target.value } })} placeholder="Ime i prezime" />
        <Field label="Sudije" value={x.officials.referees} onChange={(e) => onChange({ officials: { ...x.officials, referees: e.target.value } })} placeholder="Imena, razdvojena zarezom" />
      </div>
      <div className="flex flex-col gap-1.5 sm:pl-8">
        <span className="text-[13px] font-medium text-fg-muted">Primjedbe</span>
        <textarea
          aria-label={`Primjedbe, ${x.home} – ${x.away}`}
          value={x.remarks}
          onChange={(e) => onChange({ remarks: e.target.value })}
          rows={Math.max(2, x.remarks.split("\n").length)}
          className={cx(inputClass, "h-auto py-2.5 text-[14px] sm:text-[13px]")}
        />
      </div>
    </li>
  );
}

/** Dugme i forma za dopisivanje utakmice koja nije u rasporedu (npr. prijateljska ili bez upisa u aplikaciju) */
function AddManualMatch({ onAdd }: { onAdd: (input: { home: string; away: string; score: BulletinScore | null }) => void }) {
  const [open, setOpen] = useState(false);
  const [home, setHome] = useState("");
  const [away, setAway] = useState("");
  const [homeScore, setHomeScore] = useState("");
  const [awayScore, setAwayScore] = useState("");

  if (!open) {
    return (
      <li>
        <button type="button" onClick={() => setOpen(true)} className="flex w-full items-center gap-2 px-4 py-3 text-left text-[14px] font-semibold text-brand hover:bg-panel-2">
          <Plus className="size-4 shrink-0" aria-hidden="true" /> Dodaj utakmicu ručno
        </button>
      </li>
    );
  }
  const submit = () => {
    if (!home.trim() || !away.trim()) return;
    const h = Number(homeScore);
    const a = Number(awayScore);
    const score = homeScore.trim() && awayScore.trim() && Number.isInteger(h) && Number.isInteger(a) ? { home: h, away: a, periods: [] } : null;
    onAdd({ home: home.trim(), away: away.trim(), score });
    setHome("");
    setAway("");
    setHomeScore("");
    setAwayScore("");
    setOpen(false);
  };
  return (
    <li className="flex flex-col gap-3 border-t border-line px-4 py-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <input value={home} onChange={(e) => setHome(e.target.value)} placeholder="Domaćin" aria-label="Domaćin" className={inputClass} autoFocus />
        <input value={away} onChange={(e) => setAway(e.target.value)} placeholder="Gost" aria-label="Gost" className={inputClass} />
      </div>
      <div className="flex items-center gap-2">
        <input value={homeScore} onChange={(e) => setHomeScore(e.target.value)} type="number" min={0} max={300} placeholder="0" aria-label="Poeni domaćina" className={cx(inputClass, "h-9 w-16 px-2 text-center")} />
        <span className="text-fg-muted">:</span>
        <input value={awayScore} onChange={(e) => setAwayScore(e.target.value)} type="number" min={0} max={300} placeholder="0" aria-label="Poeni gosta" className={cx(inputClass, "h-9 w-16 px-2 text-center")} />
        <span className="text-[12px] text-fg-faint">Rezultat (prazno = nije odigrana)</span>
      </div>
      <div className="flex gap-2">
        <Button type="button" onClick={submit} disabled={!home.trim() || !away.trim()}>
          <Plus className="size-4" aria-hidden="true" /> Dodaj
        </Button>
        <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
          Odustani
        </Button>
      </div>
    </li>
  );
}

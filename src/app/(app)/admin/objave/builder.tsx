"use client";

import { useEffect, useId, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, Award, CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, ClipboardCheck, Download, Images, ListChecks, LoaderCircle, Pencil, Plus, Save, Search, Shield, Trophy, UserRound, X } from "lucide-react";
import { Button, ButtonLink, CARD, cx, Empty, Field, inputClass } from "@/components/ui";
import { Select } from "@/components/select";
import { Popover } from "@/components/popover";
import { DateField, TimeField } from "@/components/date-picker";
import type { SocialMatch, SocialStatsData } from "@/lib/data/social";
import type { SocialTable } from "@/lib/data/results";
import type { SavedSocialSchedule } from "@/lib/data/admin";
import type { Fixture } from "@/lib/a2-jug-raspored";
import { FIBA_RESULT_PREFIX } from "@/lib/league-fiba";
import { addDays, formatDate, formatTime, isoToSarajevo, sarajevoToISO, slug } from "@/lib/format";
import { formatScore } from "@/lib/quarter-points";
import {
  brandOf, contentSize, isPlayed, renderSocialImage, SOCIAL_ACCENTS, SOCIAL_BRANDS, SOCIAL_FORMATS, SOCIAL_LAYOUTS, SOCIAL_STATS, SOCIAL_TEMPLATES, SOCIAL_YEARS,
  statName, statText, statValue, templateOf,
  type ScheduleDraft, type SocialContent, type SocialDesignOptions, type SocialKind, type SocialOptions, type SocialStatKey, type SocialStatPlayer,
  type SocialTextOptions, type SocialYear,
} from "@/lib/social-image";
import { SocialPreviewSkeleton } from "./skeleton";
import { SOCIAL_KINDS } from "./kinds";
import { SavedSchedules } from "./saved-schedules";
import { saveSocialSchedule } from "./actions";

const DEFAULT_DESIGN: SocialDesignOptions = {
  format: "portrait", template: "fire", accent: "", statehoodDay: false,
  showBrand: true, showLogos: true, crestTiles: false, showHall: true, showCompetition: true, year: "full",
};

const KIND_ICONS = { schedule: CalendarDays, results: ClipboardCheck, round: ListChecks, standings: Trophy, clubs: Shield, stats: Award };

type DesignChange = <K extends keyof SocialDesignOptions>(key: K, value: SocialDesignOptions[K]) => void;
type Shared = { design: SocialDesignOptions; onDesign: DesignChange; font: string };

/**
 * Slike za objavu: raspored, rezultati, tabela i klubovi. Izgled (predložak, format, akcent) je zajednički,
 * tekst i izbor ima svaka vrsta svoj; sve ostaju otvorene, pa prelazak između njih ništa ne briše.
 */
export function SocialStudio({ matches, results, round, today, now, competition, kind: initialKind, tables, font, fixturesByCompetition, knownPairings, schedule, stats }: {
  matches: SocialMatch[];
  results: SocialMatch[];
  round: SocialMatch[];
  today: string;
  now: number;
  competition?: string;
  kind: SocialKind;
  tables: SocialTable[];
  font: string;
  /** Zvanični raspored saveza po takmičenju, za prijedlog cijelog kola (samo kartica Raspored) */
  fixturesByCompetition: Record<string, Fixture[]>;
  /** Parovi koji već postoje kao prava utakmica (bilo kog statusa osim otkazane) */
  knownPairings: string[];
  schedule: { view: "list" | "builder" | "missing"; saved: SavedSocialSchedule[]; initial: { id: string; draft: ScheduleDraft; updatedAt: string } | null };
  /** Statistika liga saveza s FIBA LiveStats (MVP, petorka, lideri) */
  stats: SocialStatsData;
}) {
  const [kind, setKind] = useState<SocialKind>(initialKind);
  const [design, setDesign] = useState<SocialDesignOptions>(() => {
    const initial = { ...DEFAULT_DESIGN, ...schedule.initial?.draft.design };
    return { ...initial, template: SOCIAL_TEMPLATES.find((template) => template.id === initial.template)?.id ?? "arena" };
  });
  const onDesign: DesignChange = (key, value) => setDesign((old) => ({ ...old, [key]: value }));
  const shared = { design, onDesign, font };

  function pick(next: SocialKind) {
    setKind(next);
    // Link vodi na istu vrstu slike (bez ponovnog učitavanja stranice)
    const url = new URL(window.location.href);
    url.searchParams.set("vrsta", SOCIAL_KINDS.find((k) => k.id === next)!.param);
    window.history.replaceState(null, "", url);
  }

  return (
    <div className="flex flex-col gap-6">
      <div role="tablist" aria-label="Vrsta slike" className="grid w-full grid-cols-3 gap-0.5 rounded-lg bg-track p-[3px] sm:flex sm:w-auto sm:self-start">
        {SOCIAL_KINDS.map(({ id, label }) => { const Icon = KIND_ICONS[id]; return (
          <button key={id} type="button" role="tab" aria-selected={kind === id} onClick={() => pick(id)} className={cx("flex min-w-0 flex-col items-center justify-center gap-1 whitespace-nowrap rounded-md px-0.5 py-2 text-[12px] font-semibold transition-colors sm:flex-row sm:gap-2 sm:px-4 sm:py-1.5 sm:text-[14px]", kind === id ? "bg-panel-3 text-fg shadow-segment" : "text-fg-muted hover:bg-panel-3/60 hover:text-fg")}>
            <Icon className="size-4 shrink-0" aria-hidden="true" />{label}
          </button>
        ); })}
      </div>
      <div role="tabpanel" hidden={kind !== "schedule"}>
        {schedule.view === "list" ? <SavedSchedules saved={schedule.saved} /> : schedule.view === "missing" ? (
          <Empty icon={<CalendarDays />} title="Raspored ne postoji" action={<ButtonLink href="/admin/objave?vrsta=raspored&r=lista">Svi rasporedi</ButtonLink>}>Možda je obrisan.</Empty>
        ) : (
          <ScheduleBuilder
            {...shared} matches={matches} today={today} now={now} competition={competition} tables={tables}
            fixturesByCompetition={fixturesByCompetition} knownPairings={knownPairings}
            initial={schedule.initial} />
        )}
      </div>
      <div role="tabpanel" hidden={kind !== "results"}><ResultsBuilder {...shared} matches={results} today={today} competition={competition} tables={tables} /></div>
      <div role="tabpanel" hidden={kind !== "round"}><RoundBuilder {...shared} matches={round} today={today} competition={competition} /></div>
      <div role="tabpanel" hidden={kind !== "standings"}><StandingsBuilder {...shared} tables={tables} competition={competition} /></div>
      <div role="tabpanel" hidden={kind !== "clubs"}><ClubsBuilder {...shared} tables={tables} competition={competition} /></div>
      <div role="tabpanel" hidden={kind !== "stats"}><StatsBuilder {...shared} stats={stats} competition={competition} /></div>
    </div>
  );
}

// ───────────────────────── Raspored ─────────────────────────

/** `competition` iz linka (`?takmicenje=`): filter na to takmičenje i njegovo prvo naredno kolo */
function ScheduleBuilder({ matches: initialMatches, today, now: initialNow, competition: initialCompetition, design, onDesign, font, tables, fixturesByCompetition, knownPairings, initial }: Shared & {
  matches: SocialMatch[]; today: string; now: number; competition?: string; tables: SocialTable[];
  fixturesByCompetition: Record<string, Fixture[]>;
  knownPairings: string[];
  /** Prethodno sačuvan raspored (nastavljamo ga), ili null za nov */
  initial: { id: string; draft: ScheduleDraft; updatedAt: string } | null;
}) {
  const [now, setNow] = useState(initialNow);
  const [manual, setManual] = useState<SocialMatch[]>(() => initial?.draft.manual ?? []);
  const known = useMemo(() => new Set(knownPairings), [knownPairings]);
  // Parovi iz zvaničnog rasporeda saveza koji još nisu prava ni ručno potvrđena utakmica — prijedlog za cijelo kolo
  const virtual = useMemo(() => {
    const manualKeys = new Set(manual.map((m) => `${m.competitionId}|${m.home}|${m.away}`));
    return Object.entries(fixturesByCompetition).flatMap(([competitionId, list]) => {
      const table = tables.find((t) => t.id === competitionId);
      const roster = table?.standings ?? [];
      return list
        .filter((f) => f.roundDate && !known.has(`${competitionId}|${f.home}|${f.away}`) && !manualKeys.has(`${competitionId}|${f.home}|${f.away}`))
        .map((f): SocialMatch => ({
          id: `${FIXTURE_PREFIX}${competitionId}-${f.number}`,
          startsAt: sarajevoToISO(f.roundDate!, f.time || "00:00"),
          status: "scheduled",
          date: f.roundDate!,
          round: f.round,
          competitionId,
          competition: table?.name ?? "",
          home: f.home,
          away: f.away,
          homeLogo: roster.find((r) => r.name === f.home)?.logoUrl ?? null,
          awayLogo: roster.find((r) => r.name === f.away)?.logoUrl ?? null,
          hall: f.hall,
          homeScore: null,
          awayScore: null,
        }));
    });
  }, [fixturesByCompetition, tables, known, manual]);
  const matches = useMemo(
    () => [...initialMatches.filter((m) => m.status === "postponed" || new Date(m.startsAt).getTime() > now), ...manual, ...virtual],
    [initialMatches, now, manual, virtual],
  );
  // Sačuvan raspored nosi svoj filter/tekst/izbor; inače: takmičenje iz linka i njegovo prvo naredno kolo,
  // a inače narednih 7 dana (ili 7 dana od prve naredne, ako tada nema utakmica)
  const picker = useMatchPicker(matches, "Raspored utakmica", () => {
    const own = matches.filter((m) => m.competitionId === initialCompetition);
    if (own.length) {
      const rounds = own.flatMap((m) => (m.round == null ? [] : [m.round]));
      return { ...NO_FILTERS, competition: own[0].competitionId, round: rounds.length ? String(Math.min(...rounds)) : "" };
    }
    const first = matches.find((m) => m.status === "scheduled")?.date;
    const start = !first || matches.some((m) => m.date >= today && m.date <= addDays(today, 6)) ? today : first;
    return { ...NO_FILTERS, from: start, to: addDays(start, 6) };
  }, "rows", initial ? { filters: initial.draft.filters, texts: initial.draft.texts, selected: initial.draft.selected } : undefined);
  const { chosen, page, setPage, texts, setTexts } = picker;
  const [perPage, setPerPage] = useState(initial?.draft.perPage ?? 7);
  const pages = useMemo<SocialContent[]>(() => chunk(chosen, perPage).map((list) => ({ kind: "schedule", matches: list })), [chosen, perPage]);

  function addManual(input: ManualMatchInput) {
    const match = buildManualMatch(manualId(), input);
    setManual((old) => [...old, match]);
    picker.select(new Set([...picker.selected, match.id]));
  }

  function updateManual(id: string, input: ManualMatchInput) {
    setManual((old) => old.map((m) => (m.id === id ? buildManualMatch(id, input) : m)));
  }

  function removeManual(id: string) {
    setManual((old) => old.filter((m) => m.id !== id));
  }

  useEffect(() => {
    const refreshTime = () => setNow(Date.now());
    // Prijedlozi iz rasporeda (isSelectable) imaju samo placeholder vrijeme dok se ne potvrde — ne računaju se ovdje
    const nextScheduled = matches.find((match) => match.status === "scheduled" && isSelectable(match.id));
    const nextStart = nextScheduled ? new Date(nextScheduled.startsAt).getTime() : null;
    const timer = nextStart == null ? undefined : window.setTimeout(refreshTime, Math.min(2_147_483_647, Math.max(0, nextStart - Date.now() + 20)));
    window.addEventListener("focus", refreshTime);
    document.addEventListener("visibilitychange", refreshTime);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("focus", refreshTime);
      document.removeEventListener("visibilitychange", refreshTime);
    };
  }, [matches]);

  // Čuvanje: dovoljno stanje da se raspored nastavi kasnije, i sa drugog uređaja
  const draft: ScheduleDraft = { manual, selected: [...picker.selected], filters: picker.filters, texts, perPage, design };
  const draftJson = JSON.stringify(draft);
  const [saved, setSaved] = useState<{ id: string | null; json: string | null; at: string | null }>({ id: initial?.id ?? null, json: initial ? draftJson : null, at: initial?.updatedAt ?? null });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string>();
  const dirty = saved.json !== draftJson;

  async function save() {
    if (saving) return;
    setSaving(true);
    setSaveError(undefined);
    const json = draftJson;
    try {
      const res = await saveSocialSchedule(saved.id, JSON.parse(json) as ScheduleDraft, texts.title.trim() || "Raspored utakmica");
      if ("error" in res) throw new Error(res.error);
      setSaved({ id: res.id, json, at: res.updatedAt });
      if (!saved.id) window.history.replaceState(null, "", `/admin/objave?vrsta=raspored&r=${res.id}`);
    } catch (e) {
      setSaveError(e instanceof Error && e.message ? e.message : "Raspored nije sačuvan.");
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
  const savedLabel = saved.at ? `Sačuvano ${formatDate(isoToSarajevo(saved.at).date)} u ${formatTime(saved.at)}` : null;

  return (
    <div className="flex flex-col gap-6">
      <div className={cx(CARD, "sticky top-2 z-10 flex flex-wrap items-center justify-between gap-3 px-4 py-3")}>
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href="/admin/objave?vrsta=raspored&r=lista"
            onClick={(event) => {
              if (dirty && !window.confirm("Raspored ima nesačuvane izmjene. Izaći bez čuvanja?")) event.preventDefault();
            }}
            className="grid size-9 shrink-0 place-items-center rounded-md text-fg-muted hover:bg-panel-2 hover:text-fg"
            aria-label="Sačuvani rasporedi"
            title="Sačuvani rasporedi"
          >
            <ArrowLeft className="size-5" aria-hidden="true" />
          </Link>
          <div className="min-w-0 border-l border-line pl-3">
            <p className="truncate text-[15px] font-semibold">{texts.title.trim() || "Raspored utakmica"}</p>
            <p className="text-[13px] text-fg-muted">
              {saveError ? (
                <span className="font-medium text-crest">{saveError}</span>
              ) : saving ? (
                "Čuvam…"
              ) : !saved.id ? (
                "Novi raspored, još nije sačuvan"
              ) : dirty ? (
                <span className="font-medium text-orange">Nesačuvane izmjene</span>
              ) : (
                savedLabel
              )}
            </p>
          </div>
        </div>
        <Button onClick={save} disabled={saving || (!dirty && saved.id !== null)}>
          {saving ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : !dirty && saved.id ? <Check className="size-4" aria-hidden="true" /> : <Save className="size-4" aria-hidden="true" />}
          {!dirty && saved.id ? "Sačuvano" : "Sačuvaj"}
        </Button>
      </div>
      <Layout preview={
        <SocialPreview
          kind="schedule" pages={pages} options={{ ...design, ...texts }} font={font} page={page} onPage={setPage}
          empty="Označi utakmice za pregled slike."
          stale={(content) => content.kind === "schedule" && content.matches.some((m) => m.status !== "postponed" && new Date(m.startsAt).getTime() <= Date.now())}
          onStale={() => setNow(Date.now())}
        />
      }>
        <Step number={1} title="Izaberi utakmice" aside={`${chosen.length} odabrano`}>
          {!matches.length ? <p className="text-[14px] text-fg-muted">Nema budućih ni odgođenih utakmica tekuće sezone.</p> : null}
          <MatchPicker
            matches={matches}
            picker={picker}
            range={{ label: "Narednih 7 dana", from: today, to: addDays(today, 6) }}
            note="Buduće zakazane i sve odgođene utakmice tekuće sezone, plus prijedlozi cijelog kola iz zvaničnog rasporeda saveza (badge „IZ RASPOREDA“) — uredi ih da potvrdiš termin."
            manualAdd={{ today, tables, defaultCompetitionId: picker.filters.competition || initialCompetition || tables[0]?.id || "", onAdd: addManual, onUpdate: updateManual, onRemove: removeManual }}
          />
        </Step>
        <Step number={2} title="Izgled">
          <LayoutPicker kind="schedule" value={texts.layout} onChange={(layout) => setTexts((old) => ({ ...old, layout }))} />
          <SocialDesign design={design} onDesign={onDesign} brand={texts.brand} />
          <PerPage value={perPage} onChange={(count) => { setPerPage(count); setPage(0); }} />
        </Step>
        <Step number={3} title="Tekst i detalji">
          <SocialText texts={texts} onText={(patch) => setTexts((old) => ({ ...old, ...patch }))} design={design} onDesign={onDesign} schedule placeholder="Raspored utakmica" />
        </Step>
      </Layout>
    </div>
  );
}

// ───────────────────────── Rezultati ─────────────────────────

/** `competition` iz linka (`?takmicenje=`): filter na to takmičenje i njegovo zadnje odigrano kolo */
function ResultsBuilder({ matches: initialMatches, today, competition: initialCompetition, design, onDesign, font, tables }: Shared & { matches: SocialMatch[]; today: string; competition?: string; tables: SocialTable[] }) {
  // Utakmice dopisane ručno (rezultat koji nije stigao sa statistike ili utakmica koje nema u aplikaciji), po terminu uz ostale
  const [manual, setManual] = useState<SocialMatch[]>([]);
  const matches = useMemo(() => (manual.length ? [...initialMatches, ...manual].sort((a, b) => a.startsAt.localeCompare(b.startsAt)) : initialMatches), [initialMatches, manual]);
  // Početni filter: takmičenje iz linka i njegovo zadnje kolo; inače zadnjih 7 dana, a ako tada nema utakmica, 7 dana do zadnje odigrane
  const picker = useMatchPicker(matches, "Rezultati", () => {
    const own = matches.filter((m) => m.competitionId === initialCompetition);
    if (own.length) {
      const rounds = own.flatMap((m) => (m.round == null ? [] : [m.round]));
      return { ...NO_FILTERS, competition: own[0].competitionId, round: rounds.length ? String(Math.max(...rounds)) : "" };
    }
    const last = matches[matches.length - 1]?.date;
    const end = !last || matches.some((m) => m.date >= addDays(today, -6)) ? today : last;
    return { ...NO_FILTERS, from: addDays(end, -6), to: end };
  });
  const { chosen, page, setPage, texts, setTexts } = picker;
  const [perPage, setPerPage] = useState(7);
  const pages = useMemo<SocialContent[]>(() => chunk(chosen, perPage).map((list) => ({ kind: "results", matches: list })), [chosen, perPage]);

  function addManual(input: ManualMatchInput) {
    const match = buildManualMatch(manualId(), input);
    setManual((old) => [...old, match]);
    picker.select(new Set([...picker.selected, match.id]));
  }

  return (
    <Layout preview={<SocialPreview kind="results" pages={pages} options={{ ...design, ...texts }} font={font} page={page} onPage={setPage} empty="Označi utakmice za pregled slike." />}>
      <Step number={1} title="Izaberi utakmice" aside={`${chosen.length} odabrano`}>
        <MatchPicker
          matches={matches} picker={picker} range={{ label: "Zadnjih 7 dana", from: addDays(today, -6), to: today }}
          note="Završene utakmice tekuće sezone s upisanim rezultatom. Utakmice liga saveza kojih nema u aplikaciji dolaze s FIBA statistike; ako rezultat nije stigao, dodaj utakmicu ručno."
          manualAdd={{
            today, tables, scores: true, defaultCompetitionId: picker.filters.competition || initialCompetition || tables[0]?.id || "",
            onAdd: addManual,
            onUpdate: (id, input) => setManual((old) => old.map((m) => (m.id === id ? buildManualMatch(id, input) : m))),
            onRemove: (id) => setManual((old) => old.filter((m) => m.id !== id)),
          }}
        />
      </Step>
      <Step number={2} title="Izgled">
        <LayoutPicker kind="results" value={texts.layout} onChange={(layout) => setTexts((old) => ({ ...old, layout }))} />
        <SocialDesign design={design} onDesign={onDesign} brand={texts.brand} />
        <PerPage value={perPage} onChange={(count) => { setPerPage(count); setPage(0); }} />
      </Step>
      <Step number={3} title="Tekst i detalji">
        <SocialText texts={texts} onText={(patch) => setTexts((old) => ({ ...old, ...patch }))} design={design} onDesign={onDesign} schedule placeholder="Rezultati" />
      </Step>
    </Layout>
  );
}

// ───────────────────────── Kolo: odigrano i slijedi ─────────────────────────

/** Odigrane utakmice prvo pa ostale, svaka grupa po terminu; odgođene na kraju */
function roundOrder(list: SocialMatch[]) {
  const rank = (m: SocialMatch) => (isPlayed(m) ? 0 : m.status === "postponed" ? 2 : 1);
  return [...list].sort((a, b) => rank(a) - rank(b) || a.startsAt.localeCompare(b.startsAt));
}

/**
 * Kolo na jednoj slici: npr. tri odigrane utakmice s rezultatom i jedna u srijedu. Početno kolo je ono u kojem
 * je nešto odigrano, a nešto još nije; inače zadnje kolo s rezultatom. `competition` iz linka bira takmičenje.
 */
function RoundBuilder({ matches, today, competition: initialCompetition, design, onDesign, font }: Shared & { matches: SocialMatch[]; today: string; competition?: string }) {
  const picker = useMatchPicker(matches, "Rezultati i raspored", () => {
    const lastPlayed = matches.filter(isPlayed).at(-1);
    const competition = matches.some((m) => m.competitionId === initialCompetition) ? initialCompetition! : lastPlayed?.competitionId ?? matches[0]?.competitionId ?? "";
    const own = matches.filter((m) => m.competitionId === competition && m.round != null);
    const rounds = [...new Set(own.map((m) => m.round!))].sort((a, b) => a - b);
    const open = rounds.find((n) => own.some((m) => m.round === n && isPlayed(m)) && own.some((m) => m.round === n && !isPlayed(m)));
    const lastWithResult = rounds.filter((n) => own.some((m) => m.round === n && isPlayed(m))).at(-1);
    const round = open ?? lastWithResult ?? rounds.find((n) => own.some((m) => m.round === n && m.date >= today));
    if (round != null) return { ...NO_FILTERS, competition, round: String(round) };
    return { ...NO_FILTERS, competition, from: addDays(today, -6), to: addDays(today, 6) };
  }, "split");
  const { chosen, page, setPage, texts, setTexts } = picker;
  const [perPage, setPerPage] = useState(8);
  const ordered = useMemo(() => roundOrder(chosen), [chosen]);
  const pages = useMemo<SocialContent[]>(() => chunk(ordered, perPage).map((list) => ({ kind: "round", matches: list })), [ordered, perPage]);
  const played = chosen.filter(isPlayed).length;

  return (
    <Layout preview={<SocialPreview kind="round" pages={pages} options={{ ...design, ...texts }} font={font} page={page} onPage={setPage} empty="Označi utakmice za pregled slike." />}>
      <Step number={1} title="Izaberi utakmice" aside={`${played} odigrano · ${chosen.length - played} slijedi`}>
        {!matches.length ? <p className="text-[14px] text-fg-muted">Nema utakmica u tekućoj sezoni.</p> : (
          <MatchPicker matches={matches} picker={picker} range={{ label: "Ova i iduća sedmica", from: addDays(today, -6), to: addDays(today, 6) }} note="Sve utakmice tekuće sezone: odigrane s rezultatom, zakazane i odgođene. Za cijelo kolo izaberi takmičenje i kolo." />
        )}
      </Step>
      <Step number={2} title="Izgled">
        <LayoutPicker kind="round" value={texts.layout} onChange={(layout) => setTexts((old) => ({ ...old, layout }))} />
        <SocialDesign design={design} onDesign={onDesign} brand={texts.brand} />
        <PerPage value={perPage} onChange={(count) => { setPerPage(count); setPage(0); }} />
      </Step>
      <Step number={3} title="Tekst i detalji">
        <SocialText texts={texts} onText={(patch) => setTexts((old) => ({ ...old, ...patch }))} design={design} onDesign={onDesign} schedule placeholder="Rezultati i raspored" />
      </Step>
    </Layout>
  );
}

// ───────────────────────── Izbor utakmica (raspored, rezultati i kolo) ─────────────────────────

/** Utakmica koju admin ručno dopiše (nije u rasporedu) — nosi se u listi i na slici kao i svaka druga */
const MANUAL_PREFIX = "manual-";
const MANUAL_COMPETITION_ID = "manual";
const manualId = () => `${MANUAL_PREFIX}${crypto.randomUUID()}`;

/** Prijedlog iz zvaničnog rasporeda saveza (još nije prava utakmica) — nije selektabilan dok se ne potvrdi kroz "Uredi" */
const FIXTURE_PREFIX = "fixture-";
const isSelectable = (id: string) => !id.startsWith(FIXTURE_PREFIX);

type ManualMatchInput = {
  home: string; away: string; homeLogo: string | null; awayLogo: string | null;
  date: string; time: string; hall: string; competitionId: string; competition: string; round: number | null;
  postponed: boolean;
  /** Rezultat (samo slike rezultata); s njim je utakmica završena */
  homeScore: number | null; awayScore: number | null;
};
type ManualAdd = {
  today: string; tables: SocialTable[]; defaultCompetitionId: string;
  /** Forma traži rezultat umjesto termina (slike rezultata) */
  scores?: boolean;
  onAdd: (input: ManualMatchInput) => void;
  onUpdate: (id: string, input: ManualMatchInput) => void;
  onRemove: (id: string) => void;
};

/** Napravi/osvježi ručno dodanu utakmicu; odgođena ne mora imati vrijeme (nikad se ne prikazuje) */
function buildManualMatch(id: string, input: ManualMatchInput): SocialMatch {
  return {
    id,
    startsAt: sarajevoToISO(input.date, input.time || "00:00"),
    status: input.postponed ? "postponed" : input.homeScore != null && input.awayScore != null ? "finished" : "scheduled",
    date: input.date,
    round: input.round,
    competitionId: input.competitionId || MANUAL_COMPETITION_ID,
    competition: input.competition || "Prijateljska utakmica",
    home: input.home,
    away: input.away,
    homeLogo: input.homeLogo,
    awayLogo: input.awayLogo,
    hall: input.hall || null,
    homeScore: input.homeScore,
    awayScore: input.awayScore,
  };
}

/** Postojeća (ručna ili iz rasporeda) stavka → početne vrijednosti forme za izmjenu */
function matchToInput(m: SocialMatch): ManualMatchInput {
  const fixture = m.id.startsWith(FIXTURE_PREFIX);
  return {
    home: m.home, away: m.away, homeLogo: m.homeLogo, awayLogo: m.awayLogo,
    date: m.date, time: fixture ? "" : isoToSarajevo(m.startsAt).time,
    hall: m.hall ?? "", competitionId: m.competitionId === MANUAL_COMPETITION_ID ? "" : m.competitionId,
    competition: m.competition, round: m.round, postponed: m.status === "postponed",
    homeScore: m.homeScore, awayScore: m.awayScore,
  };
}

/** Filteri i izbor: svaka promjena filtera označi upravo prikazane utakmice, pa se i pregled odmah mijenja; podnaslov prati takmičenje i kolo */
function useMatchPicker(
  matches: SocialMatch[], title: string, initialFilters: () => Filters, layout = "rows",
  /** Sačuvano stanje (umjesto izračunatih podrazumijevanih vrijednosti) */
  preset?: { filters: Filters; texts: SocialTextOptions; selected: string[] },
) {
  // Filter i izbor koje je korisnik sam napravio ili ih nosi sačuvan raspored. Dok ih nema, važi podrazumijevani filter
  // nad svježim podacima: stranica koja ostane otvorena poslije novog kola pokaže nove utakmice, a ne izbor iz trenutka
  // kad je otvorena.
  const [own, setOwn] = useState<{ filters: Filters; selected: Set<string> } | null>(() => (preset ? { filters: preset.filters, selected: new Set(preset.selected) } : null));
  const autoKey = JSON.stringify(initialFilters());
  const auto = useMemo(() => {
    const filters = JSON.parse(autoKey) as Filters;
    return { filters, selected: new Set(filterMatches(matches, filters).map((m) => m.id)) };
  }, [matches, autoKey]);
  const { filters, selected } = own ?? auto;
  const [page, setPage] = useState(0);
  const [texts, setTexts] = useState<SocialTextOptions>(() => preset?.texts ?? follow(defaultTexts(title, layout), "", filters.competition, headline(matches, filters)));
  // Podrazumijevani filter se promijenio sa svježim podacima (npr. novo kolo): podnaslov ga prati kao kod ručne promjene
  const [followed, setFollowed] = useState(autoKey);
  if (!own && followed !== autoKey) {
    const before = JSON.parse(followed) as Filters;
    setFollowed(autoKey);
    setTexts((old) => follow(old, headline(matches, before), auto.filters.competition, headline(matches, auto.filters)));
    setPage(0);
  }
  const chosen = useMemo(() => matches.filter((m) => selected.has(m.id)), [matches, selected]);

  function filter(patch: Partial<Filters>) {
    const next = { ...filters, ...patch };
    setTexts((old) => follow(old, headline(matches, filters), next.competition, headline(matches, next)));
    setOwn({ filters: next, selected: new Set(filterMatches(matches, next).map((m) => m.id).filter(isSelectable)) });
    setPage(0);
  }

  function select(ids: Set<string>) {
    setOwn({ filters, selected: ids });
    setPage(0);
  }

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setOwn({ filters, selected: next });
    setPage(0);
  }

  return { filters, filter, selected, select, toggle, chosen, page, setPage, texts, setTexts };
}

function MatchPicker({ matches, picker: { filters, filter, selected, select, toggle, chosen }, range, note, manualAdd }: {
  matches: SocialMatch[];
  picker: ReturnType<typeof useMatchPicker>;
  /** Brzi filter datuma (npr. narednih ili zadnjih 7 dana) */
  range: { label: string; from: string; to: string };
  note: string;
  /** Dopušta ručno dopisivanje utakmice na dnu liste (npr. Raspored) */
  manualAdd?: ManualAdd;
}) {
  const [form, setForm] = useState<{ kind: "closed" } | { kind: "add" } | { kind: "edit"; id: string | null; seed: ManualMatchInput }>({ kind: "closed" });
  const { competition, round, search, from, to } = filters;
  const competitions = [...new Map(matches.map((m) => [m.competitionId, m.competition])).entries()];
  const rounds = [...new Set(matches.filter((m) => !competition || m.competitionId === competition).flatMap((m) => m.round == null ? [] : [m.round]))].sort((a, b) => a - b);
  const visible = filterMatches(matches, filters);
  const hiddenSelected = chosen.length - visible.filter((m) => selected.has(m.id)).length;

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <Select label="Takmičenje" value={competition} onChange={(event) => filter({ competition: event.target.value, round: "", from: "", to: "" })}>
          <option value="">Sva takmičenja</option>
          {competitions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
        </Select>
        <Select label="Kolo" value={round} onChange={(event) => filter({ round: event.target.value, from: "", to: "" })}>
          <option value="">Sva kola</option>
          <option value="none">Bez kola</option>
          {rounds.map((n) => <option key={n} value={String(n)}>{n}. kolo</option>)}
        </Select>
        <Field label="Od datuma" type="date" value={from} max={to || undefined} onChange={(event) => filter({ from: event.target.value })} />
        <Field label="Do datuma" type="date" value={to} min={from || undefined} onChange={(event) => filter({ to: event.target.value })} />
      </div>
      <Field label="Pretraži utakmice" placeholder="Ekipa, takmičenje ili dvorana…" icon={<Search className="size-4" />} value={search} onChange={(event) => filter({ search: event.target.value })} />
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px]">
        <button type="button" className="font-semibold hover:underline" onClick={() => filter({ from: range.from, to: range.to })}>{range.label}</button>
        <button type="button" className="text-fg-muted hover:underline" onClick={() => filter(NO_FILTERS)}>Očisti filtere</button>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3 text-[13px]">
        <button type="button" disabled={!visible.length} className="font-semibold hover:underline disabled:opacity-40" onClick={() => select(new Set([...selected, ...visible.map((m) => m.id).filter(isSelectable)]))}>Označi prikazane ({visible.length})</button>
        <button type="button" disabled={!chosen.length} className="text-fg-muted hover:underline disabled:opacity-40" onClick={() => select(new Set())}>Poništi izbor</button>
      </div>
      {hiddenSelected > 0 && <p className="text-[12px] text-fg-muted">Odabrano izvan trenutnog filtera: {hiddenSelected}. Te utakmice ostaju na slikama.</p>}
      {from && to && from > to && <p role="alert" className="text-[13px] text-crest">Početni datum mora biti prije završnog.</p>}
      <div className="max-h-[420px] overflow-y-auto rounded-lg border border-line">
        {visible.length ? visible.map((m) => {
          const manual = m.id.startsWith(MANUAL_PREFIX);
          const fixture = m.id.startsWith(FIXTURE_PREFIX);
          const info = (
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-2 text-[11px] text-fg-muted">
                {m.competition}{m.round == null ? "" : ` · ${m.round}. kolo`}
                {m.status === "postponed" && <span className="rounded bg-orange/10 px-1.5 py-0.5 font-semibold text-orange">ODGOĐENO</span>}
                {manual && <span className="rounded bg-brand-soft px-1.5 py-0.5 font-semibold text-brand">RUČNO</span>}
                {m.id.startsWith(FIBA_RESULT_PREFIX) && <span className="rounded bg-panel-3 px-1.5 py-0.5 font-semibold text-fg-muted">FIBA STATISTIKA</span>}
                {fixture && <span className="rounded bg-panel-3 px-1.5 py-0.5 font-semibold text-fg-muted">IZ RASPOREDA</span>}
              </span>
              <span className="mt-0.5 block text-[14px] font-semibold">{m.home} {m.status === "finished" ? <span className="scoreboard px-1">{scoreText(m)}</span> : <span className="font-normal text-fg-faint">–</span>} {m.away}</span>
              <span className="mt-1 block text-[12px] text-fg-muted">
                {fixture ? `${formatDate(m.date)} · vrijeme nije određeno` : m.status === "postponed" ? `Prvobitno: ${formatDate(m.date)} · Novi termin naknadno` : manualAdd?.scores && manual ? [formatDate(m.date), m.hall].filter(Boolean).join(" · ") : `${formatDate(m.date)} · ${formatTime(m.startsAt)} · ${m.hall ?? "Dvorana nije određena"}`}
              </span>
            </span>
          );
          return (
            <div key={m.id} className={cx("flex items-start gap-2 border-b border-line p-3 last:border-b-0", selected.has(m.id) && "bg-panel-2", fixture && "opacity-80")}>
              {fixture ? info : (
                <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-3 hover:text-fg">
                  <input type="checkbox" checked={selected.has(m.id)} onChange={() => toggle(m.id)} className="mt-1 size-4 shrink-0 accent-brand" />
                  {info}
                </label>
              )}
              {manualAdd && (manual || fixture) && (
                <div className="mt-1 flex shrink-0 items-center gap-1">
                  <button type="button" aria-label="Uredi utakmicu" title="Uredi" className="rounded-md p-1 text-fg-faint hover:bg-panel-3 hover:text-fg" onClick={() => setForm({ kind: "edit", id: manual ? m.id : null, seed: matchToInput(m) })}>
                    <Pencil className="size-4" aria-hidden="true" />
                  </button>
                  {manual && (
                    <button type="button" aria-label="Ukloni ručno dodanu utakmicu" title="Ukloni" className="rounded-md p-1 text-fg-faint hover:bg-panel-3 hover:text-crest" onClick={() => manualAdd.onRemove(m.id)}>
                      <X className="size-4" aria-hidden="true" />
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        }) : <p className="p-6 text-center text-[14px] text-fg-muted">Nema utakmica za ove filtere.</p>}
        {manualAdd && (form.kind !== "closed" ? (
          <ManualMatchFields
            key={form.kind === "edit" ? form.id ?? `${form.seed.competitionId}-${form.seed.round}-${form.seed.home}-${form.seed.away}` : "add"}
            today={manualAdd.today}
            tables={manualAdd.tables}
            scores={manualAdd.scores}
            defaultCompetitionId={(form.kind === "edit" && form.seed.competitionId) || manualAdd.defaultCompetitionId}
            initial={form.kind === "edit" ? form.seed : undefined}
            onCancel={() => setForm({ kind: "closed" })}
            onSubmit={(input) => {
              if (form.kind === "edit" && form.id) manualAdd.onUpdate(form.id, input);
              else manualAdd.onAdd(input);
              setForm({ kind: "closed" });
            }}
          />
        ) : (
          <button type="button" onClick={() => setForm({ kind: "add" })} className="flex w-full items-center gap-2 border-t border-line p-3 text-left text-[14px] font-semibold text-brand hover:bg-panel-2">
            <Plus className="size-4 shrink-0" aria-hidden="true" /> Dodaj utakmicu ručno
          </button>
        ))}
      </div>
      <p className="text-[12px] text-fg-faint">{note}</p>
    </>
  );
}

/** Sentinel za "nije iz postojeće liste ekipa" u TeamPick */
const OTHER_TEAM = "__other__";

/** Domaćin/gost: biraj iz ekipa takmičenja (vec imaju raspored i grb), ili upiši drugi naziv */
function TeamPick({ label, roster, value, other, onPick, onOther }: {
  label: string;
  roster: { teamId: string; name: string }[];
  value: string;
  other: string;
  onPick: (teamId: string) => void;
  onOther: (name: string) => void;
}) {
  if (value === OTHER_TEAM || roster.length === 0) {
    return (
      <div className="flex flex-col gap-1.5">
        <Field label={label} value={other} onChange={(event) => onOther(event.target.value)} placeholder="Naziv ekipe" />
        {roster.length > 0 && (
          <button type="button" className="self-start text-[12px] text-fg-muted hover:underline" onClick={() => onPick("")}>Izaberi iz takmičenja</button>
        )}
      </div>
    );
  }
  return (
    <Select label={label} value={value} onChange={(event) => onPick(event.target.value)}>
      <option value="">Izaberi ekipu</option>
      {roster.map((t) => <option key={t.teamId} value={t.teamId}>{t.name}</option>)}
      <option value={OTHER_TEAM}>Drugi naziv…</option>
    </Select>
  );
}

/** Forma za ručno dopisanu utakmicu na dnu liste: ekipe biraš iz takmičenja (već imaju raspored, grb i sve), termin je obavezan */
function ManualMatchFields({ today, tables, scores, defaultCompetitionId, initial, onCancel, onSubmit }: {
  today: string;
  tables: SocialTable[];
  /** Slike rezultata: obavezan je rezultat, a vrijeme i oznaka odgođene se ne traže */
  scores?: boolean;
  defaultCompetitionId: string;
  /** Postojeća stavka (ručna ili prijedlog iz rasporeda) koja se uređuje; izostavljeno = nova utakmica */
  initial?: ManualMatchInput;
  onCancel: () => void;
  onSubmit: (input: ManualMatchInput) => void;
}) {
  const [competitionId, setCompetitionId] = useState(initial?.competitionId || defaultCompetitionId);
  const table = tables.find((t) => t.id === competitionId);
  const roster = useMemo(() => [...(table?.standings ?? [])].sort((a, b) => a.name.localeCompare(b.name, "bs")), [table]);
  const findTeam = (name: string) => roster.find((t) => t.name === name)?.teamId;
  const [homeTeamId, setHomeTeamId] = useState(() => (initial ? findTeam(initial.home) ?? (initial.home ? OTHER_TEAM : "") : ""));
  const [homeOther, setHomeOther] = useState(() => (initial && !findTeam(initial.home) ? initial.home : ""));
  const [awayTeamId, setAwayTeamId] = useState(() => (initial ? findTeam(initial.away) ?? (initial.away ? OTHER_TEAM : "") : ""));
  const [awayOther, setAwayOther] = useState(() => (initial && !findTeam(initial.away) ? initial.away : ""));
  const [date, setDate] = useState(initial?.date || today);
  const [time, setTime] = useState(initial?.time || "");
  const [hall, setHall] = useState(initial?.hall || "");
  const [round, setRound] = useState(initial?.round != null ? String(initial.round) : "");
  const [postponed, setPostponed] = useState(initial?.postponed ?? false);
  const [homeScore, setHomeScore] = useState(initial?.homeScore != null ? String(initial.homeScore) : "");
  const [awayScore, setAwayScore] = useState(initial?.awayScore != null ? String(initial.awayScore) : "");
  const points = (value: string) => (/^\d{1,3}$/.test(value.trim()) ? Number(value) : null);

  function pickCompetition(id: string) {
    setCompetitionId(id);
    setHomeTeamId("");
    setAwayTeamId("");
  }

  const homeTeam = roster.find((t) => t.teamId === homeTeamId);
  const awayTeam = roster.find((t) => t.teamId === awayTeamId);
  const home = homeTeamId === OTHER_TEAM ? homeOther.trim() : (homeTeam?.name ?? "");
  const away = awayTeamId === OTHER_TEAM ? awayOther.trim() : (awayTeam?.name ?? "");
  const valid = Boolean(home && away && date && (scores ? points(homeScore) != null && points(awayScore) != null : postponed || time));

  function submit() {
    onSubmit({
      home, away,
      homeLogo: homeTeamId === OTHER_TEAM ? null : (homeTeam?.logoUrl ?? initial?.homeLogo ?? null),
      awayLogo: awayTeamId === OTHER_TEAM ? null : (awayTeam?.logoUrl ?? initial?.awayLogo ?? null),
      date, time,
      hall: hall.trim(),
      competitionId: competitionId || "",
      competition: table?.name ?? "",
      round: round.trim() ? Number(round) : null,
      postponed: scores ? false : postponed,
      homeScore: scores ? points(homeScore) : null,
      awayScore: scores ? points(awayScore) : null,
    });
  }

  return (
    <div className="flex flex-col gap-3 border-t border-line bg-panel-2 p-3">
      {initial && <p className="text-[13px] font-semibold">Uređuješ utakmicu</p>}
      {tables.length > 0 && (
        <Select label="Takmičenje" value={competitionId} onChange={(event) => pickCompetition(event.target.value)}>
          {tables.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </Select>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <TeamPick label="Domaćin" roster={roster} value={homeTeamId} other={homeOther} onPick={setHomeTeamId} onOther={setHomeOther} />
        <TeamPick label="Gost" roster={roster} value={awayTeamId} other={awayOther} onPick={setAwayTeamId} onOther={setAwayOther} />
      </div>
      {scores && (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Koševi domaćina" inputMode="numeric" value={homeScore} onChange={(event) => setHomeScore(event.target.value)} placeholder="npr. 84" />
          <Field label="Koševi gosta" inputMode="numeric" value={awayScore} onChange={(event) => setAwayScore(event.target.value)} placeholder="npr. 76" />
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <DateField label="Datum" name="manual-date" defaultValue={date} onChange={setDate} required />
        {!scores && <TimeField label="Vrijeme" name="manual-time" defaultValue={time} onChange={setTime} required={!postponed} hint={postponed ? "Nije obavezno za odgođenu utakmicu" : undefined} />}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Dvorana" value={hall} onChange={(event) => setHall(event.target.value)} placeholder="Nije obavezno" />
        <Field label="Kolo" type="number" min={1} value={round} onChange={(event) => setRound(event.target.value)} placeholder="Nije obavezno" />
      </div>
      {!scores && (
        <label className="flex items-center gap-2 text-[13px]">
          <input type="checkbox" checked={postponed} onChange={(event) => setPostponed(event.target.checked)} className="size-4 accent-brand" />
          Utakmica je odgođena
        </label>
      )}
      <div className="flex items-center gap-3">
        <Button type="button" disabled={!valid} onClick={submit} className="h-9! px-3! text-[13px]!">
          {initial ? <Check className="size-4" aria-hidden="true" /> : <Plus className="size-4" aria-hidden="true" />} {initial ? "Sačuvaj izmjenu" : "Dodaj"}
        </Button>
        <button type="button" onClick={onCancel} className="text-[13px] font-semibold text-fg-muted hover:underline">Otkaži</button>
      </div>
    </div>
  );
}

function PerPage({ value, onChange }: { value: number; onChange: (count: number) => void }) {
  return (
    <Select label="Utakmica po slici" value={value} onChange={(event) => onChange(Number(event.target.value))} hint="Više utakmica daje gušći raspored; za veće grbove izaberi manji broj ili Story format.">
      {Array.from({ length: 12 }, (_, index) => index + 1).map((count) => <option key={count} value={count}>{count} po slici</option>)}
    </Select>
  );
}

// ───────────────────────── Tabela ─────────────────────────

/** Podnaslov tabele: takmičenje i broj odigranih kola (najviše odigranih utakmica neke ekipe) */
function tableHeadline(table: SocialTable | undefined) {
  if (!table) return "";
  const played = Math.max(0, ...table.standings.map((s) => s.played));
  return played ? `${table.name} · nakon ${played}. kola` : table.name;
}

function initialTable(tables: SocialTable[], competition?: string) {
  return (tables.find((t) => t.id === competition) ?? tables.find((t) => t.standings.some((s) => s.played > 0)) ?? tables[0])?.id ?? "";
}

function StandingsBuilder({ tables, competition: initialCompetition, design, onDesign, font }: Shared & { tables: SocialTable[]; competition?: string }) {
  const [competition, setCompetition] = useState(() => initialTable(tables, initialCompetition));
  const table = tables.find((t) => t.id === competition);
  const [texts, setTexts] = useState<SocialTextOptions>(() => follow(defaultTexts("Tabela", "bars"), "", competition, tableHeadline(table)));
  const [split, setSplit] = useState(0);
  const rows = useMemo(() => table?.standings ?? [], [table]);
  const [page, setPage] = useState(0);
  const pages = useMemo<SocialContent[]>(() => (split ? chunk(rows, split) : [rows]).filter((list) => list.length).map((list, index) => ({ kind: "standings", rows: list, firstRank: index * (split || 0) + 1 })), [rows, split]);

  function pick(id: string) {
    setTexts((old) => follow(old, tableHeadline(table), id, tableHeadline(tables.find((t) => t.id === id))));
    setCompetition(id);
    setPage(0);
  }

  return (
    <Layout preview={<SocialPreview kind="standings" pages={pages} options={{ ...design, ...texts }} font={font} page={page} onPage={setPage} empty="Izaberi takmičenje za tabelu." />}>
      <Step number={1} title="Izaberi tabelu" aside={table ? `${rows.length} ekipa` : undefined}>
        {!tables.length ? <p className="text-[14px] text-fg-muted">Nema takmičenja s ekipama u tekućoj sezoni.</p> : <>
          <Select label="Takmičenje" value={competition} onChange={(event) => pick(event.target.value)}>
            {tables.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </Select>
          <div className="overflow-hidden rounded-lg border border-line">
            <table className="w-full text-[13px]">
              <thead className="text-[11px] text-fg-muted"><tr className="border-b border-line"><th className="w-10 py-2 pl-3 text-left font-semibold">#</th><th className="py-2 text-left font-semibold">Ekipa</th><th className="w-10 py-2 text-center font-semibold">UT</th><th className="w-12 py-2 text-center font-semibold">+/-</th><th className="w-12 py-2 pr-3 text-right font-semibold">Bod</th></tr></thead>
              <tbody className="scoreboard">
                {rows.map((r, i) => (
                  <tr key={r.teamId} className="border-b border-line last:border-b-0">
                    <td className="py-2 pl-3 text-fg-muted">{i + 1}.</td>
                    <td className="truncate py-2 font-semibold">{r.name}</td>
                    <td className="py-2 text-center text-fg-muted">{r.played}</td>
                    <td className="py-2 text-center text-fg-muted">{r.diff > 0 ? `+${r.diff}` : r.diff}</td>
                    <td className="py-2 pr-3 text-right font-semibold">{r.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[12px] text-fg-faint">Tabela po FIBA pravilima, iz završenih utakmica u aplikaciji.</p>
        </>}
      </Step>
      <Step number={2} title="Izgled">
        <LayoutPicker kind="standings" value={texts.layout} onChange={(layout) => setTexts((old) => ({ ...old, layout }))} />
        <SocialDesign design={design} onDesign={onDesign} brand={texts.brand} />
        {rows.length > 8 && (
          <Select label="Ekipa po slici" value={split} onChange={(event) => { setSplit(Number(event.target.value)); setPage(0); }} hint="Duga tabela može na dvije slike (carousel).">
            <option value={0}>Sve na jednoj slici</option>
            {[6, 7, 8, 9, 10].filter((n) => n < rows.length).map((n) => <option key={n} value={n}>{n} po slici</option>)}
          </Select>
        )}
      </Step>
      <Step number={3} title="Tekst i detalji">
        <SocialText texts={texts} onText={(patch) => setTexts((old) => ({ ...old, ...patch }))} design={design} onDesign={onDesign} placeholder="Tabela" />
      </Step>
    </Layout>
  );
}

// ───────────────────────── Klubovi ─────────────────────────

function ClubsBuilder({ tables, competition: initialCompetition, design, onDesign, font }: Shared & { tables: SocialTable[]; competition?: string }) {
  const [competition, setCompetition] = useState(() => (tables.find((t) => t.id === initialCompetition) ?? tables[0])?.id ?? "");
  const table = tables.find((t) => t.id === competition);
  const [texts, setTexts] = useState<SocialTextOptions>(() => follow(defaultTexts("Ekipe", "grid"), "", competition, table?.name ?? ""));
  const [excluded, setExcluded] = useState<Set<string>>(() => new Set());
  const clubs = useMemo(() => [...(table?.standings ?? [])].sort((a, b) => a.name.localeCompare(b.name, "bs")).map((s) => ({ id: s.teamId, name: s.name, logoUrl: s.logoUrl })), [table]);
  const chosen = useMemo(() => clubs.filter((c) => !excluded.has(c.id)), [clubs, excluded]);
  const pages = useMemo<SocialContent[]>(() => (chosen.length ? [{ kind: "clubs", clubs: chosen }] : []), [chosen]);
  const [page, setPage] = useState(0);

  function pick(id: string) {
    setTexts((old) => follow(old, table?.name ?? "", id, tables.find((t) => t.id === id)?.name ?? ""));
    setCompetition(id);
    setExcluded(new Set());
  }

  function toggle(id: string) {
    setExcluded((old) => {
      const next = new Set(old);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <Layout preview={<SocialPreview kind="clubs" pages={pages} options={{ ...design, ...texts }} font={font} page={page} onPage={setPage} empty="Označi ekipe za sliku." />}>
      <Step number={1} title="Izaberi ekipe" aside={`${chosen.length} odabrano`}>
        {!tables.length ? <p className="text-[14px] text-fg-muted">Nema takmičenja s ekipama u tekućoj sezoni.</p> : <>
          <Select label="Takmičenje" value={competition} onChange={(event) => pick(event.target.value)}>
            {tables.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </Select>
          <div className="grid max-h-[420px] overflow-y-auto rounded-lg border border-line sm:grid-cols-2">
            {clubs.map((c) => (
              <label key={c.id} className="flex cursor-pointer items-center gap-3 border-b border-line p-3 hover:bg-panel-2 sm:odd:border-r">
                <input type="checkbox" checked={!excluded.has(c.id)} onChange={() => toggle(c.id)} className="size-4 shrink-0 accent-brand" />
                <span className="grid size-7 shrink-0 place-items-center">
                  {/* eslint-disable-next-line @next/next/no-img-element -- Grb kluba iz Supabase Storagea, isti koji ide na sliku. */}
                  {c.logoUrl ? <img src={c.logoUrl} alt="" className="size-7 object-contain" /> : <Shield className="size-4 text-fg-faint" aria-hidden="true" />}
                </span>
                <span className="min-w-0 truncate text-[14px] font-semibold">{c.name}</span>
              </label>
            ))}
          </div>
        </>}
      </Step>
      <Step number={2} title="Izgled">
        <LayoutPicker kind="clubs" value={texts.layout} onChange={(layout) => setTexts((old) => ({ ...old, layout }))} />
        <SocialDesign design={design} onDesign={onDesign} brand={texts.brand} />
      </Step>
      <Step number={3} title="Tekst i detalji">
        <SocialText texts={texts} onText={(patch) => setTexts((old) => ({ ...old, ...patch }))} design={design} onDesign={onDesign} placeholder="Ekipe" />
      </Step>
    </Layout>
  );
}

// ───────────────────────── Statistika: MVP, petorka, lideri, top lista ─────────────────────────

type StatsMode = "mvp" | "five" | "leaders" | "top";
/** Kolo ("5") ili cijela sezona */
const SEASON = "sezona";
const DEFAULT_LEADERS: SocialStatKey[] = ["pts", "reb", "ast", "eff", "stl", "blk"];

/** Igrači takmičenja u kolu (jedna utakmica) ili sezoni (zbir), najkorisniji prvi */
function statPlayersOf(stats: SocialStatsData, competitionId: string, round: string): SocialStatPlayer[] {
  const season = round === SEASON;
  const lines = stats.lines.filter((l) => l.competitionId === competitionId && (season || String(l.round) === round));
  const byPlayer = new Map<string, SocialStatPlayer>();
  // Po terminu: ime, broj i ekipa ostaju sa zadnje utakmice
  for (const l of [...lines].sort((a, b) => a.date.localeCompare(b.date))) {
    const photo = l.licenseId ? stats.photos[l.licenseId] : undefined;
    const old = byPlayer.get(l.playerId);
    const sum = (key: "seconds" | "pts" | "reb" | "ast" | "stl" | "blk" | "tov" | "fgm" | "fga" | "tpm" | "tpa" | "ftm" | "fta" | "eff") => (old?.[key] ?? 0) + l[key];
    byPlayer.set(l.playerId, {
      id: l.playerId, first: l.first, last: l.last, number: l.number ?? old?.number ?? null, team: l.team, teamLogo: l.teamLogo,
      photo: photo?.photo ?? old?.photo ?? null, cutout: photo?.cutout ?? old?.cutout ?? null,
      games: (old?.games ?? 0) + 1,
      seconds: sum("seconds"), pts: sum("pts"), reb: sum("reb"), ast: sum("ast"), stl: sum("stl"), blk: sum("blk"), tov: sum("tov"),
      fgm: sum("fgm"), fga: sum("fga"), tpm: sum("tpm"), tpa: sum("tpa"), ftm: sum("ftm"), fta: sum("fta"), eff: sum("eff"),
      game: season ? null : { opponent: l.opponent, opponentLogo: l.opponentLogo, teamScore: l.teamScore, opponentScore: l.opponentScore, won: l.won },
    });
  }
  const players = [...byPlayer.values()];
  // Sezona: samo igrači s bar pola utakmica najaktivnijeg igrača (kao lideri na FIBA stranici)
  const most = Math.max(0, ...players.map((p) => p.games));
  const pool = season ? players.filter((p) => p.games >= Math.max(1, Math.ceil(most / 2))) : players;
  return pool.sort((a, b) => statValue(b, "eff", season) - statValue(a, "eff", season) || Number(Boolean(b.game?.won)) - Number(Boolean(a.game?.won)) || statValue(b, "pts", season) - statValue(a, "pts", season));
}

/** Najbolji po jednoj statistici (izjednačeni: korisniji prvi) */
function rankBy(players: SocialStatPlayer[], key: SocialStatKey, season: boolean) {
  return [...players].sort((a, b) => statValue(b, key, season) - statValue(a, key, season) || statValue(b, "eff", season) - statValue(a, "eff", season));
}

function statsTitle(mode: StatsMode, season: boolean, key: SocialStatKey) {
  if (mode === "top") return SOCIAL_STATS.find((s) => s.id === key)!.top;
  const what = { mvp: "MVP", five: "Petorka", leaders: "Lideri" }[mode];
  return `${what} ${season ? "sezone" : "kola"}`;
}

function statsHeadline(league: SocialStatsData["leagues"][number] | undefined, round: string) {
  if (!league) return "";
  if (round === SEASON) return league.rounds.length ? `${league.name} · nakon ${Math.max(...league.rounds)}. kola` : league.name;
  return round ? `${league.name} · ${round}. kolo` : league.name;
}

/** Kratka linija brojki igrača u listi izbora */
const statLine = (p: SocialStatPlayer, season: boolean) =>
  (["pts", "reb", "ast", "eff"] as const).map((key) => `${statText(p, key, season)} ${SOCIAL_STATS.find((s) => s.id === key)!.short}`).join(" · ");

/**
 * Slike statistike liga saveza s FIBA LiveStats (A2 jug, A1 žene): MVP kola, petorka kola, lideri i top lista, za kolo
 * ili cijelu sezonu. Igrači imaju ime i fotografiju s licence (bez pozadine kad je izrezana).
 */
function StatsBuilder({ stats, competition: initialCompetition, design, onDesign, font }: Shared & { stats: SocialStatsData; competition?: string }) {
  const { leagues } = stats;
  const [league, setLeague] = useState(() => (leagues.find((l) => l.id === initialCompetition) ?? leagues[0])?.id ?? "");
  const current = leagues.find((l) => l.id === league);
  const [round, setRound] = useState(() => (current?.rounds.length ? String(Math.max(...current.rounds)) : SEASON));
  const season = round === SEASON;
  const [statKey, setStatKey] = useState<SocialStatKey>("pts");
  const [count, setCount] = useState(10);
  const [categories, setCategories] = useState<SocialStatKey[]>(DEFAULT_LEADERS);
  // Ručni izbor MVP-a i petorke (null = najkorisniji); briše se s promjenom takmičenja ili kola
  const [mvp, setMvp] = useState<string | null>(null);
  const [five, setFive] = useState<string[] | null>(null);
  const [texts, setTexts] = useState<SocialTextOptions>(() => follow({ ...defaultTexts(statsTitle("mvp", season, "pts"), "mvp") }, "", league, statsHeadline(current, round)));
  const mode = texts.layout as StatsMode;
  const [page, setPage] = useState(0);

  const players = useMemo(() => (league ? statPlayersOf(stats, league, round) : []), [stats, league, round]);
  const mvpPlayer = players.find((p) => p.id === mvp) ?? players[0];
  const fivePlayers = useMemo(() => {
    const picked = five ? players.filter((p) => five.includes(p.id)) : players.slice(0, 5);
    return picked.slice(0, 5);
  }, [players, five]);

  const pages = useMemo<SocialContent[]>(() => {
    if (!players.length) return [];
    if (mode === "mvp") return mvpPlayer ? [{ kind: "stats", mode: "mvp", player: mvpPlayer, season }] : [];
    if (mode === "five") return fivePlayers.length ? [{ kind: "stats", mode: "five", players: fivePlayers, season }] : [];
    if (mode === "leaders") {
      const list = SOCIAL_STATS.filter((s) => categories.includes(s.id)).map((s) => ({ key: s.id, players: rankBy(players, s.id, season).filter((p) => statValue(p, s.id, season) > 0).slice(0, 3) }));
      return list.some((c) => c.players.length) ? [{ kind: "stats", mode: "leaders", categories: list, season }] : [];
    }
    const top = rankBy(players, statKey, season).filter((p) => statValue(p, statKey, season) > 0).slice(0, count);
    return top.length ? [{ kind: "stats", mode: "top", key: statKey, players: top, firstRank: 1, season }] : [];
  }, [players, mode, mvpPlayer, fivePlayers, categories, statKey, count, season]);

  /** Naslov i podnaslov prate izbor dok ih korisnik ne promijeni */
  function retitle(next: { league?: string; round?: string; mode?: StatsMode; statKey?: SocialStatKey }) {
    const before = { league, round, mode, statKey };
    const after = { ...before, ...next };
    const beforeLeague = leagues.find((l) => l.id === before.league);
    const afterLeague = leagues.find((l) => l.id === after.league);
    setTexts((old) => {
      const followed = follow(old, statsHeadline(beforeLeague, before.round), after.league, statsHeadline(afterLeague, after.round));
      const title = old.title === statsTitle(before.mode, before.round === SEASON, before.statKey) ? statsTitle(after.mode, after.round === SEASON, after.statKey) : old.title;
      return { ...followed, title, layout: after.mode };
    });
    setPage(0);
  }

  function pickLeague(id: string) {
    const next = leagues.find((l) => l.id === id);
    const nextRound = next?.rounds.length ? String(Math.max(...next.rounds)) : SEASON;
    retitle({ league: id, round: nextRound });
    setLeague(id);
    setRound(nextRound);
    setMvp(null);
    setFive(null);
  }

  function pickRound(value: string) {
    retitle({ round: value });
    setRound(value);
    setMvp(null);
    setFive(null);
  }

  function toggleFive(id: string) {
    const base = five ?? fivePlayers.map((p) => p.id);
    setFive(base.includes(id) ? base.filter((x) => x !== id) : base.length >= 5 ? base : [...base, id]);
  }

  if (!leagues.length) {
    return <Empty icon={<Award />} title="Nema statistike">Statistika igrača dolazi s FIBA LiveStats za A2 ligu jug i A1 ligu žena, čim se odigra prva utakmica sezone.</Empty>;
  }

  const fiveIds = new Set(fivePlayers.map((p) => p.id));
  const preview = <SocialPreview kind="stats" pages={pages} options={{ ...design, ...texts }} font={font} page={page} onPage={setPage} empty="Nema igrača s odigranim minutama za ovaj izbor." />;

  return (
    <Layout preview={preview}>
      <Step number={1} title="Izaberi statistiku" aside={`${players.length} igrača`}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Select label="Takmičenje" value={league} onChange={(event) => pickLeague(event.target.value)}>
            {leagues.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </Select>
          <Select label="Kolo" value={round} onChange={(event) => pickRound(event.target.value)}>
            {[...(current?.rounds ?? [])].reverse().map((n) => <option key={n} value={String(n)}>{n}. kolo</option>)}
            <option value={SEASON}>Cijela sezona (prosjek po utakmici)</option>
          </Select>
        </div>
        <LayoutPicker kind="stats" value={mode} onChange={(layout) => retitle({ mode: layout as StatsMode })} />

        {mode === "mvp" && (
          <PlayerChoice
            label={season ? "Igrač sezone" : "MVP kola"} hint="Podrazumijevano najkorisniji igrač (indeks korisnosti); izaberi drugog po želji."
            players={players} season={season} type="radio" checked={(p) => p.id === mvpPlayer?.id} onToggle={(id) => setMvp(id)}
          />
        )}
        {mode === "five" && (
          <PlayerChoice
            label={`Petorka (${fivePlayers.length}/5)`} hint="Podrazumijevano pet najkorisnijih igrača; označi tačno koje želiš (najviše pet)."
            players={players} season={season} type="checkbox" checked={(p) => fiveIds.has(p.id)} disabled={(p) => !fiveIds.has(p.id) && fivePlayers.length >= 5}
            onToggle={toggleFive} onReset={five ? () => setFive(null) : undefined}
          />
        )}
        {mode === "leaders" && (
          <div className="flex flex-col gap-2.5">
            <h3 className="text-[14px] font-semibold">Kategorije</h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
              {SOCIAL_STATS.map((stat) => (
                <label key={stat.id} className="flex items-center gap-2 text-[13px]">
                  <input
                    type="checkbox" className="size-4 accent-brand" checked={categories.includes(stat.id)}
                    onChange={() => setCategories((old) => (old.includes(stat.id) ? old.filter((k) => k !== stat.id) : [...old, stat.id]))}
                  />
                  {stat.label}
                </label>
              ))}
            </div>
            <p className="text-[12px] text-fg-faint">Na slici je najbolji igrač svake kategorije s fotografijom, pa drugi i treći. Šest kategorija najljepše stoji na objavi 4:5.</p>
          </div>
        )}
        {mode === "top" && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Select label="Statistika" value={statKey} onChange={(event) => { retitle({ statKey: event.target.value as SocialStatKey }); setStatKey(event.target.value as SocialStatKey); }}>
              {SOCIAL_STATS.map((stat) => <option key={stat.id} value={stat.id}>{stat.label}</option>)}
            </Select>
            <Select label="Broj igrača" value={count} onChange={(event) => setCount(Number(event.target.value))}>
              {[3, 5, 8, 10].map((n) => <option key={n} value={n}>{n} igrača</option>)}
            </Select>
          </div>
        )}
        <p className="text-[12px] text-fg-faint">
          Box score s FIBA LiveStats; imena i fotografije s licence (fotografija bez pozadine kad je izrezana). {season ? "Sezona: prosjek po utakmici, igrači s bar pola odigranih utakmica." : "Kolo: brojke s utakmice tog kola."}
        </p>
      </Step>
      <Step number={2} title="Izgled">
        <SocialDesign design={design} onDesign={onDesign} brand={texts.brand} />
      </Step>
      <Step number={3} title="Tekst i detalji">
        <SocialText texts={texts} onText={(patch) => setTexts((old) => ({ ...old, ...patch }))} design={design} onDesign={onDesign} placeholder={statsTitle(mode, season, statKey)} />
      </Step>
    </Layout>
  );
}

/** Lista igrača s fotografijom i brojkama, za izbor MVP-a (radio) ili petorke (checkbox) */
function PlayerChoice({ label, hint, players, season, type, checked, disabled, onToggle, onReset }: {
  label: string;
  hint: string;
  players: SocialStatPlayer[];
  season: boolean;
  type: "radio" | "checkbox";
  checked: (p: SocialStatPlayer) => boolean;
  disabled?: (p: SocialStatPlayer) => boolean;
  onToggle: (id: string) => void;
  onReset?: () => void;
}) {
  const name = useId();
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-[14px] font-semibold">{label}</h3>
        {onReset && <button type="button" className="text-[13px] font-semibold text-fg-muted hover:underline" onClick={onReset}>Najkorisniji</button>}
      </div>
      <div className="max-h-[420px] overflow-y-auto rounded-lg border border-line">
        {players.map((p, i) => (
          <label key={p.id} className={cx("flex cursor-pointer items-center gap-3 border-b border-line p-2.5 last:border-b-0 hover:bg-panel-2", checked(p) && "bg-panel-2", disabled?.(p) && "cursor-not-allowed opacity-50")}>
            <input type={type} name={name} checked={checked(p)} disabled={disabled?.(p)} onChange={() => onToggle(p.id)} className="size-4 shrink-0 accent-brand" />
            <span className="scoreboard w-5 shrink-0 text-right text-[12px] font-semibold text-fg-faint">{i + 1}</span>
            {p.photo || p.cutout ? (
              // eslint-disable-next-line @next/next/no-img-element -- privremeni link fotografije s licence, ista ide na sliku
              <img src={p.photo ?? p.cutout!} alt="" loading="lazy" className="size-9 shrink-0 rounded-full bg-panel-2 object-cover object-[50%_20%]" />
            ) : (
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-panel-2 text-fg-faint"><UserRound className="size-4" aria-hidden="true" /></span>
            )}
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[14px] font-semibold">{statName(p)}</span>
              <span className="block truncate text-[12px] text-fg-muted">
                {p.team}
                {p.game ? ` · ${p.game.won ? "P" : "I"} ${p.game.teamScore}:${p.game.opponentScore}` : ` · ${p.games} ut.`}
              </span>
            </span>
            <span className="scoreboard shrink-0 text-right text-[12px] text-fg-muted">{statLine(p, season)}</span>
          </label>
        ))}
      </div>
      <p className="text-[12px] text-fg-faint">{hint}</p>
    </div>
  );
}

// ───────────────────────── Zajedničko ─────────────────────────

/** Raspored elemenata na slici (npr. trake, kartice, lista) */
function LayoutPicker({ kind, value, onChange }: { kind: SocialKind; value: string; onChange: (layout: string) => void }) {
  return (
    <div className="flex flex-col gap-2.5">
      <h3 className="text-[14px] font-semibold">Raspored</h3>
      <div className={cx("grid gap-2", SOCIAL_LAYOUTS[kind].length > 3 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-3")} role="group" aria-label="Raspored elemenata">
        {SOCIAL_LAYOUTS[kind].map((layout) => (
          <button key={layout.id} type="button" aria-pressed={value === layout.id} title={layout.description} onClick={() => onChange(layout.id)} className={cx("min-w-0 rounded-lg border p-2 text-left transition-colors sm:p-3", value === layout.id ? "border-brand bg-brand-soft ring-1 ring-brand" : "border-line hover:bg-panel-2")}>
            <LayoutGlyph kind={kind} id={layout.id} />
            <span className="mt-1.5 block truncate text-center text-[12px] font-semibold sm:text-[13px]">{layout.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/** Mala skica rasporeda (sivi oblici, bez boja predloška) */
function LayoutGlyph({ kind, id }: { kind: SocialKind; id: string }) {
  const bar = "rounded-[2px] bg-fg-faint/40";
  const dot = "size-2.5 shrink-0 rounded-[2px] bg-fg-faint/70";
  if (kind === "schedule" && id === "cards") return <span aria-hidden="true" className="flex h-12 flex-col justify-center gap-1">{[0, 1].map((n) => <span key={n} className="overflow-hidden rounded-[4px] bg-fg-faint/15"><span className="flex h-3.5 items-center justify-between gap-1 px-1"><span className={dot} /><span className={cx(bar, "h-1 flex-1")} /><span className="h-2 w-4 rounded-[2px] bg-fg-faint/70" /><span className={cx(bar, "h-1 flex-1")} /><span className={dot} /></span><span className="mx-auto mb-0.5 block h-0.5 w-1/2 rounded-[2px] bg-fg-faint/40" /></span>)}</span>;
  if (kind === "round" && id === "split") return <span aria-hidden="true" className="flex h-12 flex-col justify-center gap-[3px]">{[0, 1].map((n) => <span key={n} className="flex flex-col gap-[3px]"><span className="h-0.5 w-1/3 rounded-[2px] bg-fg-faint/70" />{Array.from({ length: n ? 1 : 2 }, (_, k) => <span key={k} className="flex h-2.5 items-center justify-between rounded-[3px] bg-fg-faint/20 px-1"><span className="size-1.5 rounded-[2px] bg-fg-faint/70" /><span className={cx(bar, "h-1 w-1/4")} /><span className="size-1.5 rounded-[2px] bg-fg-faint/70" /></span>)}</span>)}</span>;
  if ((kind === "schedule" || kind === "results" || kind === "round") && id === "list") return <span aria-hidden="true" className="flex h-12 flex-col justify-center gap-1"><span className="h-0.5 w-1/3 rounded-[2px] bg-fg-faint/70" />{[0, 1, 2].map((n) => <span key={n} className="flex items-center gap-1"><span className="h-1.5 w-3 rounded-[2px] bg-fg-faint/70" /><span className={cx(bar, "h-1 flex-1")} /></span>)}</span>;
  if (kind === "standings" && id === "board") return <span aria-hidden="true" className="flex h-12 flex-col justify-center gap-0 rounded-[4px] bg-fg-faint/15 p-1">{[0, 1, 2, 3].map((n) => <span key={n} className="flex items-center gap-1 border-b border-fg-faint/30 py-0.5 last:border-0"><span className={cx(bar, "h-1 w-1/2")} /><span className="ml-auto h-1 w-3 rounded-[2px] bg-fg-faint/60" /></span>)}</span>;
  if (kind === "clubs" && id === "grid") return <span aria-hidden="true" className="grid h-12 grid-cols-4 content-center gap-1">{Array.from({ length: 8 }, (_, n) => <span key={n} className="aspect-square rounded-[3px] bg-fg-faint/30" />)}</span>;
  if (kind === "clubs" && id === "list") return <span aria-hidden="true" className="grid h-12 grid-cols-2 content-center gap-x-2 gap-y-1">{Array.from({ length: 6 }, (_, n) => <span key={n} className="flex items-center gap-1"><span className={dot} /><span className={cx(bar, "h-1 flex-1")} /></span>)}</span>;
  if (kind === "stats" && id === "mvp") return <span aria-hidden="true" className="relative flex h-12 items-end justify-between gap-1 overflow-hidden rounded-[4px] bg-fg-faint/15 p-1"><span className="flex flex-1 flex-col gap-0.5"><span className="h-0.5 w-1/2 rounded-[2px] bg-fg-faint/50" /><span className="h-1.5 w-full rounded-[2px] bg-fg-faint/70" /><span className="mt-0.5 flex gap-0.5">{[0, 1, 2].map((n) => <span key={n} className="h-2 flex-1 rounded-[2px] bg-fg-faint/40" />)}</span></span><span className="h-10 w-5 rounded-t-full bg-fg-faint/60" /></span>;
  if (kind === "stats" && id === "five") return <span aria-hidden="true" className="flex h-12 flex-col justify-center gap-0.5">{[3, 2].map((count) => <span key={count} className="flex justify-center gap-0.5">{Array.from({ length: count }, (_, n) => <span key={n} className="flex h-[22px] w-4 flex-col items-center justify-end rounded-[2px] bg-fg-faint/20"><span className="h-3 w-2.5 rounded-t-full bg-fg-faint/60" /></span>)}</span>)}</span>;
  if (kind === "stats" && id === "leaders") return <span aria-hidden="true" className="grid h-12 grid-cols-2 content-center gap-0.5">{Array.from({ length: 6 }, (_, n) => <span key={n} className="flex h-3.5 items-end justify-between rounded-[2px] bg-fg-faint/20 px-0.5"><span className="mb-0.5 h-1 w-2 rounded-[1px] bg-fg-faint/70" /><span className="h-2.5 w-1.5 rounded-t-full bg-fg-faint/60" /></span>)}</span>;
  if (kind === "stats" && id === "top") return <span aria-hidden="true" className="flex h-12 flex-col justify-center gap-0.5">{[0, 1, 2, 3].map((n) => <span key={n} className="flex items-center gap-1"><span className="size-2 rounded-full bg-fg-faint/60" /><span className={cx(bar, "h-1 flex-1")} /><span className="h-1.5 w-2.5 rounded-[1px] bg-fg-faint/70" /></span>)}</span>;
  // Trake (raspored i tabela)
  return <span aria-hidden="true" className="flex h-12 flex-col justify-center gap-1">{[0, 1, 2].map((n) => <span key={n} className="flex h-3 items-center justify-between rounded-[3px] bg-fg-faint/20 px-1"><span className={dot} /><span className={cx(bar, "h-1 w-1/3")} /><span className={dot} /></span>)}</span>;
}

/** Tema, boja akcenta i format */
function SocialDesign({ design, onDesign: change, brand }: { design: SocialDesignOptions; onDesign: DesignChange; brand: SocialTextOptions["brand"] }) {
  return (
    <>
      <label className={cx("flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors", design.statehoodDay ? "border-brand bg-brand-soft ring-1 ring-brand" : "border-line hover:bg-panel-2")}>
        {/* eslint-disable-next-line @next/next/no-img-element -- mala statična sličica */}
        <img src="/social/bih-statehood-thumb-v1.png" alt="" aria-hidden="true" width={40} height={40} className="size-10 shrink-0 rounded-md object-cover" />
        <span className="min-w-0 flex-1 text-[14px] font-semibold">Dan državnosti BiH</span>
        <input type="checkbox" role="switch" aria-label="Dan državnosti BiH" checked={design.statehoodDay} onChange={(event) => change("statehoodDay", event.target.checked)} className="size-5 shrink-0 accent-brand" />
      </label>
      {!design.statehoodDay && <div className="flex flex-col gap-2.5">
        <h3 className="text-[14px] font-semibold">Tema</h3>
        <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4" role="group" aria-label="Tema">
          {SOCIAL_TEMPLATES.map((template) => <TemplateThumb key={template.id} id={template.id} brand={brand} accent={design.accent} active={design.template === template.id} onPick={() => change("template", template.id)} />)}
        </div>
      </div>}
      <AccentPicker value={design.accent} templateAccent={templateOf(design.template, design.statehoodDay).accent} onChange={(accent) => change("accent", accent)} />
      <div className="grid grid-cols-2 gap-2" role="group" aria-label="Format slike">
        {SOCIAL_FORMATS.map((item) => <button key={item.id} type="button" aria-pressed={design.format === item.id} onClick={() => change("format", item.id)} className={cx("rounded-lg border p-3 text-left", design.format === item.id ? "border-brand bg-brand-soft ring-1 ring-brand" : "border-line hover:bg-panel-2")}><span className="block text-[13px] font-semibold">{item.name}</span><span className="mt-1 block text-[11px] text-fg-muted">{item.detail} · {item.width} × {item.height}</span></button>)}
      </div>
    </>
  );
}

/** Svijetle boje traže tamnu kvačicu */
function isLight(hex: string) {
  const n = Number.parseInt(hex.slice(1), 16);
  return 0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255) > 170;
}

/** Boja akcenta: polje s trenutnom bojom, izbor u plutajućem prozoru */
function AccentPicker({ value, templateAccent, onChange }: { value: string; templateAccent: string; onChange: (accent: string) => void }) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const id = useId();
  const current = SOCIAL_ACCENTS.find((accent) => accent.id === value) ?? SOCIAL_ACCENTS[0];
  const close = (refocus = true) => {
    setOpen(false);
    if (refocus) trigger.current?.focus();
  };
  return (
    <div className="flex flex-col gap-2.5">
      <h3 className="text-[14px] font-semibold">Boja akcenta</h3>
      <button ref={trigger} type="button" aria-haspopup="dialog" aria-expanded={open} aria-controls={open ? id : undefined} onClick={() => setOpen((o) => !o)} className={cx(inputClass, "flex items-center gap-2.5 text-left", open && "border-fg-muted ring-4 ring-fg/8")}>
        <span aria-hidden="true" className="size-5 shrink-0 rounded-full shadow-[inset_0_0_0_1px_rgb(0_0_0/0.12)]" style={{ backgroundColor: value || templateAccent }} />
        <span className="min-w-0 flex-1 truncate">{current.name}</span>
        <ChevronDown aria-hidden="true" className={cx("size-4 shrink-0 text-fg-muted transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <Popover id={id} anchor={trigger} label="Boja akcenta" width={264} onClose={close}>
          <div className="grid grid-cols-4 gap-x-1 gap-y-3" role="group" aria-label="Boja akcenta">
            {SOCIAL_ACCENTS.map((accent) => {
              const active = value === accent.id;
              const color = accent.id || templateAccent;
              return (
                <button key={accent.id || "template"} type="button" aria-pressed={active} onClick={() => { onChange(accent.id); close(); }} className="group flex min-w-0 flex-col items-center gap-1.5 rounded-md py-1 hover:bg-panel-2">
                  <span aria-hidden="true" className={cx("flex size-9 items-center justify-center rounded-full shadow-[inset_0_0_0_1px_rgb(0_0_0/0.12)] transition-transform group-hover:scale-105", active && "ring-2 ring-brand ring-offset-2 ring-offset-panel")} style={{ backgroundColor: color }}>
                    {active && <Check className={cx("size-4", isLight(color) ? "text-black/70" : "text-white")} strokeWidth={3} />}
                  </span>
                  <span className={cx("w-full truncate text-center text-[11px]", active ? "font-semibold text-fg" : "text-fg-muted")}>{accent.name}</span>
                </button>
              );
            })}
          </div>
        </Popover>
      )}
    </div>
  );
}

/** Minijatura predloška: kako izgledaju naslov i dva reda */
function TemplateThumb({ id, brand, accent: accentOverride, active, onPick }: { id: SocialOptions["template"]; brand: SocialTextOptions["brand"]; accent: string; active: boolean; onPick: () => void }) {
  const t = templateOf(id);
  const accent = accentOverride || t.accent;
  const surface: CSSProperties = { backgroundColor: t.bg, backgroundImage: t.background ? `linear-gradient(${t.overlay}, ${t.overlay}), url("${t.background}")` : undefined, backgroundSize: "cover", backgroundPosition: "center" };
  const panel = t.panel !== "transparent";
  return (
    <button type="button" aria-pressed={active} title={t.description} onClick={onPick} className={cx("min-w-0 rounded-lg border p-1.5 text-left transition-colors", active ? "border-brand ring-1 ring-brand" : "border-line hover:border-line-hover")}>
      <span aria-hidden="true" className="relative flex aspect-[4/5] flex-col gap-[6%] overflow-hidden rounded-md p-[9%]" style={surface}>
        <span className="flex items-center gap-1"><span className="h-[3px] w-1.5 rounded-sm" style={{ backgroundColor: accent }} /><span className="text-[7px] font-bold tracking-wider" style={{ color: t.headerMuted }}>{SOCIAL_BRANDS[brand].name}</span></span>
        <span className="text-center text-[11px] font-bold leading-none tracking-tight" style={{ color: t.headerInk }}>RASPORED</span>
        <span className="mx-auto -mt-[3%] h-[2px] w-1/3 rounded-sm" style={{ backgroundColor: accent }} />
        {[0, 1, 2].map((n) => (
          <span key={n} className="flex flex-1 items-center justify-between gap-1 rounded-[3px] px-[6%]" style={{ backgroundColor: panel ? t.panel : undefined, borderBottom: panel || n === 2 ? undefined : `1px solid ${t.line}` }}>
            <span className="size-2.5 rounded-sm opacity-90" style={{ backgroundColor: t.muted }} />
            <span className="flex flex-col items-center leading-none"><span className="text-[7px] font-bold" style={{ color: t.ink }}>24.10.</span><span className="text-[5px] font-bold" style={{ color: accent }}>18:00</span></span>
            <span className="size-2.5 rounded-sm opacity-90" style={{ backgroundColor: t.muted }} />
          </span>
        ))}
        {active && <span className="absolute right-1 top-1 rounded-sm bg-white p-0.5 text-black shadow-sm"><Check className="size-2.5" strokeWidth={3} /></span>}
      </span>
      <span className="mt-1.5 block truncate px-0.5 text-[12px] font-semibold">{t.name}</span>
    </button>
  );
}

/** Naslov, podnaslov, tekst u dnu i šta se prikazuje */
function SocialText({ texts, onText, design, onDesign, schedule, placeholder }: {
  texts: SocialTextOptions;
  onText: (patch: Partial<SocialTextOptions>) => void;
  design: SocialDesignOptions;
  onDesign: DesignChange;
  schedule?: boolean;
  placeholder: string;
}) {
  const toggles = [
    { key: "showBrand", label: `Logo ${SOCIAL_BRANDS[texts.brand].name}` },
    { key: "showLogos", label: "Grbovi ekipa" },
    { key: "crestTiles", label: "Bijela podloga iza grba" },
    ...(schedule ? [{ key: "showCompetition", label: "Takmičenje i kolo" }, { key: "showHall", label: "Dvorana" }] as const : []),
  ] as const;
  return (
    <>
      <Field label="Naslov" value={texts.title} maxLength={40} placeholder={placeholder} onChange={(event) => onText({ title: event.target.value })} />
      <Field label="Podnaslov" value={texts.subtitle} maxLength={80} placeholder="A2 liga jug · 4. kolo" onChange={(event) => onText({ subtitle: event.target.value })} />
      <Field label="Tekst u dnu slike" value={texts.footer} maxLength={80} placeholder="Prazno = bez teksta" onChange={(event) => onText({ footer: event.target.value })} />
      {schedule && (
        <Select label="Godina uz datum" value={design.year} onChange={(event) => onDesign("year", event.target.value as SocialYear)} hint="Kratka godina ostavlja više mjesta imenima ekipa.">
          {SOCIAL_YEARS.map((item) => <option key={item.id} value={item.id}>{item.name} ({item.example})</option>)}
        </Select>
      )}
      <div className="flex flex-wrap gap-x-5 gap-y-3">
        {toggles.map(({ key, label }) => <label key={key} className="flex items-center gap-2 text-[13px]"><input type="checkbox" checked={design[key]} onChange={(event) => onDesign(key, event.target.checked)} className="size-4 accent-brand" />{label}</label>)}
      </div>
      <p className="text-[12px] text-fg-faint">Tekst na slici je velikim slovima. Bijela podloga pomaže grbovima koji imaju bijelu pozadinu.</p>
    </>
  );
}

/** Pregled i preuzimanje; `stale` provjeri prije preuzimanja da neka utakmica nije u međuvremenu počela */
function SocialPreview({ kind, pages, options, font, page, onPage: setPage, empty, stale, onStale }: {
  kind: SocialKind;
  pages: SocialContent[];
  options: SocialOptions;
  font: string;
  page: number;
  onPage: (page: number) => void;
  empty: string;
  stale?: (content: SocialContent) => boolean;
  onStale?: () => void;
}) {
  const [preview, setPreview] = useState<{ key: string; url: string; missingLogos: number } | null>(null);
  const [failure, setFailure] = useState<{ key: string; message: string } | null>(null);
  const format = SOCIAL_FORMATS.find((f) => f.id === options.format)!;
  const currentPage = Math.min(page, Math.max(0, pages.length - 1));
  const content = pages[currentPage];
  const renderKey = JSON.stringify([content, options, currentPage, pages.length]);
  const ready = Boolean(content) && preview?.key === renderKey;
  const error = failure?.key === renderKey ? failure.message : null;

  useEffect(() => {
    if (!content) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      renderSocialImage(content, options, currentPage, pages.length, font).then(({ blob, missingLogos }) => {
        if (cancelled) return;
        setPreview({ key: renderKey, url: URL.createObjectURL(blob), missingLogos });
        setFailure(null);
      }).catch((cause: unknown) => {
        if (!cancelled) setFailure({ key: renderKey, message: cause instanceof Error ? cause.message : "Izrada slike nije uspjela." });
      });
    }, 160);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [content, options, currentPage, pages.length, font, renderKey]);

  useEffect(() => {
    return () => { if (preview) URL.revokeObjectURL(preview.url); };
  }, [preview]);

  function download() {
    if (!ready || !preview || !content) return;
    if (stale?.(content)) { onStale?.(); return; }
    const link = document.createElement("a");
    link.href = preview.url;
    link.download = `${slug(options.title) || SOCIAL_KINDS.find((k) => k.id === kind)!.param}-${options.format}${pages.length > 1 ? `-${currentPage + 1}` : ""}.png`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  return (
    <section aria-label="Pregled slike" className={cx(CARD, "flex min-w-0 flex-col gap-4 p-4 lg:sticky lg:top-6")}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[18px] font-semibold tracking-tight">Pregled</h2>
        <span className="text-[12px] text-fg-faint">PNG · {format.width} × {format.height}</span>
      </div>
      <div className="grid min-h-52 place-items-center overflow-hidden rounded-lg border border-line bg-panel-2 p-3" aria-busy={Boolean(content) && !ready && !error}>
        {!content ? <div className="px-5 py-16 text-center text-fg-muted"><Images className="mx-auto mb-3 size-8" aria-hidden="true" /><p className="text-[14px]">{empty}</p></div>
          : error ? <p role="alert" className="p-6 text-[14px] text-crest">{error}</p>
          : ready ? (
            // eslint-disable-next-line @next/next/no-img-element -- Lokalni PNG blob je tačno slika koja se preuzima.
            <img src={preview.url} alt={describe(content, options)} width={format.width} height={format.height} className="block h-auto max-h-[66vh] w-auto max-w-full shadow-panel" />
          ) : <SocialPreviewSkeleton width={format.width} height={format.height} rows={Math.min(contentSize(content), 12)} />}
      </div>
      {pages.length > 1 && <div className="flex items-center justify-between gap-2">
        <Button variant="secondary" aria-label="Prethodna slika" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)} className="px-3"><ChevronLeft className="size-4" /></Button>
        <label className="flex items-center gap-2 text-[13px]">Slika <select aria-label="Broj slike" className={cx(inputClass, "w-auto!")} value={currentPage} onChange={(event) => setPage(Number(event.target.value))}>{pages.map((_, n) => <option key={n} value={n}>{n + 1} / {pages.length}</option>)}</select></label>
        <Button variant="secondary" aria-label="Sljedeća slika" disabled={currentPage >= pages.length - 1} onClick={() => setPage(currentPage + 1)} className="px-3"><ChevronRight className="size-4" /></Button>
      </div>}
      {ready && preview.missingLogos > 0 && <p role="status" className="text-[12px] text-orange">Nisu učitani svi grbovi ({preview.missingLogos}). Na njihovom mjestu su inicijali.</p>}
      <Button disabled={!ready} onClick={download}><Download className="size-4" aria-hidden="true" />{pages.length > 1 ? `Preuzmi sliku ${currentPage + 1} (PNG)` : "Preuzmi sliku (PNG)"}</Button>
    </section>
  );
}

/** Rezultat „78 : 65“; bodovi četvrtina s decimalnim zarezom */
function scoreText(m: SocialMatch) {
  const points = (n: number | null) => (n == null ? "" : formatScore(n));
  return `${points(m.homeScore)} : ${points(m.awayScore)}`;
}

function describe(content: SocialContent, options: SocialOptions) {
  const title = `${options.title || "Slika za objavu"}${options.statehoodDay ? " · 25. novembar, Dan državnosti BiH" : ""}`;
  if (content.kind === "schedule") return `${title}: ${content.matches.map((m) => `${m.home} – ${m.away}, ${m.status === "postponed" ? "odgođeno" : `${formatDate(m.date)} u ${formatTime(m.startsAt)}`}`).join("; ")}`;
  if (content.kind === "results") return `${title}: ${content.matches.map((m) => `${m.home} ${scoreText(m)} ${m.away}, ${formatDate(m.date)}`).join("; ")}`;
  if (content.kind === "round") return `${title}: ${content.matches.map((m) => isPlayed(m) ? `${m.home} ${scoreText(m)} ${m.away}` : `${m.home} – ${m.away}, ${m.status === "postponed" ? "odgođeno" : `${formatDate(m.date)} u ${formatTime(m.startsAt)}`}`).join("; ")}`;
  if (content.kind === "standings") return `${title}: ${content.rows.map((r, i) => `${content.firstRank + i}. ${r.name} ${formatScore(r.points)} bodova`).join("; ")}`;
  if (content.kind === "stats") {
    const line = (p: SocialStatPlayer) => `${statName(p)} (${p.team}): ${(["pts", "reb", "ast", "eff"] as const).map((key) => `${statText(p, key, content.season)} ${SOCIAL_STATS.find((s) => s.id === key)!.short}`).join(", ")}`;
    if (content.mode === "mvp") return `${title}: ${line(content.player)}`;
    if (content.mode === "leaders") return `${title}: ${content.categories.map((c) => `${SOCIAL_STATS.find((s) => s.id === c.key)!.label}: ${c.players.map((p) => `${statName(p)} ${statText(p, c.key, content.season)}`).join(", ")}`).join("; ")}`;
    if (content.mode === "top") return `${title}: ${content.players.map((p, i) => `${content.firstRank + i}. ${statName(p)} ${statText(p, content.key, content.season)}`).join("; ")}`;
    return `${title}: ${content.players.map(line).join("; ")}`;
  }
  return `${title}: ${content.clubs.map((c) => c.name).join(", ")}`;
}

function Layout({ preview, children }: { preview: ReactNode; children: ReactNode }) {
  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(340px,440px)] lg:gap-8">
      <div className="flex min-w-0 flex-col gap-6">{children}</div>
      {preview}
    </div>
  );
}

function Step({ number, title, aside, children }: { number: number; title: string; aside?: string; children: ReactNode }) {
  return <section className={cx(CARD, "flex flex-col gap-4 p-4 sm:p-5")}><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="flex items-center gap-2.5 text-[17px] font-semibold"><span className="grid size-7 place-items-center rounded-full bg-panel-2 text-[12px] text-fg-muted">{number}</span>{title}</h2>{aside && <span className="text-[12px] font-semibold text-fg-muted">{aside}</span>}</div>{children}</section>;
}

function chunk<T>(list: T[], size: number) {
  return Array.from({ length: Math.ceil(list.length / size) }, (_, i) => list.slice(i * size, (i + 1) * size));
}

function defaultTexts(title: string, layout: string): SocialTextOptions {
  return { brand: "ksks", title, subtitle: "", footer: SOCIAL_BRANDS.ksks.footer, layout };
}

/**
 * Savez u zaglavlju prati takmičenje (KSBIH lige s logom KSBIH). Tekst u dnu i podnaslov se mijenjaju
 * samo dok su kakvi su bili podrazumijevano, pa ručno upisan tekst ostaje.
 */
function follow(old: SocialTextOptions, oldHeadline: string, competition: string, nextHeadline: string): SocialTextOptions {
  const brand = brandOf(competition);
  return {
    ...old,
    brand,
    footer: old.footer === SOCIAL_BRANDS[old.brand].footer ? SOCIAL_BRANDS[brand].footer : old.footer,
    subtitle: old.subtitle === oldHeadline ? nextHeadline : old.subtitle,
  };
}

type Filters = { competition: string; round: string; search: string; from: string; to: string };
const NO_FILTERS: Filters = { competition: "", round: "", search: "", from: "", to: "" };

function filterMatches(matches: SocialMatch[], { competition, round, search, from, to }: Filters) {
  const query = fold(search.trim());
  return matches.filter((m) =>
    (!competition || m.competitionId === competition) &&
    (!round || (round === "none" ? m.round == null : String(m.round) === round)) &&
    (!from || m.date >= from) && (!to || m.date <= to) &&
    (!query || fold(`${m.home} ${m.away} ${m.competition} ${m.hall ?? ""} ${m.status === "postponed" ? "Odgođeno" : ""}`).includes(query)),
  );
}

/** Podnaslov po filteru: takmičenje i kolo (npr. „A1 žene · 3. kolo“) */
function headline(matches: SocialMatch[], { competition, round }: Filters) {
  const name = competition && matches.find((m) => m.competitionId === competition)?.competition;
  if (!name) return "";
  return round && round !== "none" ? `${name} · ${round}. kolo` : name;
}

function fold(value: string) {
  return value.toLowerCase().replace(/đ/g, "d").normalize("NFD").replace(/\p{M}/gu, "");
}

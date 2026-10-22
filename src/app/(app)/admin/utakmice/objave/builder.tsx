"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Image from "next/image";
import { Check, ChevronLeft, ChevronRight, Download, Images, Search } from "lucide-react";
import { Button, CARD, cx, Field, inputClass } from "@/components/ui";
import { Select } from "@/components/select";
import type { SocialMatch } from "@/lib/data/social";
import { addDays, formatDate, formatTime, slug } from "@/lib/format";
import { renderSocialImage, SOCIAL_BRANDS, SOCIAL_FORMATS, SOCIAL_TEMPLATES, type SocialOptions } from "@/lib/social-image";
import { SocialPreviewSkeleton } from "./skeleton";

export const DEFAULT_SOCIAL_OPTIONS: SocialOptions = {
  brand: "ksks", template: "arena", format: "portrait", title: "Raspored utakmica",
  subtitle: "", footer: "Košarkaški savez Kantona Sarajevo",
  showHall: true, showCompetition: true, showLogos: true,
};

/** `initialOptions` npr. podnaslov s nazivom takmičenja kad se builder otvara na stranici takmičenja */
export function SocialBuilder({ matches: initialMatches, today, now: initialNow, initialOptions }: { matches: SocialMatch[]; today: string; now: number; initialOptions?: Partial<SocialOptions> }) {
  const [now, setNow] = useState(initialNow);
  const matches = useMemo(() => initialMatches.filter((m) => m.status === "postponed" || new Date(m.startsAt).getTime() > now), [initialMatches, now]);
  // Početni izbor: narednih 7 dana; ako tada nema utakmica (npr. na stranici takmičenja), 7 dana od prve naredne
  const [selected, setSelected] = useState(() => {
    const week = (start: string) => matches.filter((m) => m.date >= start && m.date <= addDays(start, 6)).map((m) => m.id);
    const first = matches.find((m) => m.status === "scheduled")?.date;
    const ids = week(today);
    return new Set(ids.length || !first ? ids : week(first));
  });
  const [competition, setCompetition] = useState("");
  const [round, setRound] = useState("");
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(0);
  const [perPage, setPerPage] = useState(7);
  const [options, setOptions] = useState<SocialOptions>(() => ({ ...DEFAULT_SOCIAL_OPTIONS, ...initialOptions }));
  const chosen = useMemo(() => matches.filter((m) => selected.has(m.id)), [matches, selected]);
  const competitions = [...new Map(matches.map((m) => [m.competitionId, m.competition])).entries()];
  const rounds = [...new Set(matches.filter((m) => !competition || m.competitionId === competition).flatMap((m) => m.round == null ? [] : [m.round]))].sort((a, b) => a - b);
  const query = fold(search.trim());
  const visible = matches.filter((m) =>
    (!competition || m.competitionId === competition) &&
    (!round || (round === "none" ? m.round == null : String(m.round) === round)) &&
    (!from || m.date >= from) && (!to || m.date <= to) &&
    (!query || fold(`${m.home} ${m.away} ${m.competition} ${m.hall ?? ""} ${m.status === "postponed" ? "Odgođeno" : ""}`).includes(query)),
  );
  const hiddenSelected = chosen.length - visible.filter((m) => selected.has(m.id)).length;

  useEffect(() => {
    const refreshTime = () => setNow(Date.now());
    const nextScheduled = matches.find((match) => match.status === "scheduled");
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

  function change<K extends keyof SocialOptions>(key: K, value: SocialOptions[K]) {
    setOptions((old) => ({ ...old, [key]: value }));
    if (key === "format") setPage(0);
  }

  function toggle(id: string) {
    setSelected((old) => {
      const next = new Set(old);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setPage(0);
  }

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(340px,440px)] lg:gap-8">
      <div className="flex min-w-0 flex-col gap-6">
        <Step number={1} title="Izaberi utakmice" aside={`${chosen.length} odabrano`}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Select label="Takmičenje" value={competition} onChange={(event) => { setCompetition(event.target.value); setRound(""); }}>
              <option value="">Sva takmičenja</option>
              {competitions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
            </Select>
            <Select label="Kolo" value={round} onChange={(event) => setRound(event.target.value)}>
              <option value="">Sva kola</option>
              <option value="none">Bez kola</option>
              {rounds.map((n) => <option key={n} value={String(n)}>{n}. kolo</option>)}
            </Select>
            <Field label="Od datuma" type="date" value={from} max={to || undefined} onChange={(event) => setFrom(event.target.value)} />
            <Field label="Do datuma" type="date" value={to} min={from || undefined} onChange={(event) => setTo(event.target.value)} />
          </div>
          <Field label="Pretraži utakmice" placeholder="Ekipa, takmičenje ili dvorana…" icon={<Search className="size-4" />} value={search} onChange={(event) => setSearch(event.target.value)} />
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px]">
            <button type="button" className="font-semibold hover:underline" onClick={() => { setFrom(today); setTo(addDays(today, 6)); }}>Narednih 7 dana</button>
            <button type="button" className="text-fg-muted hover:underline" onClick={() => { setCompetition(""); setRound(""); setFrom(""); setTo(""); setSearch(""); }}>Očisti filtere</button>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3 text-[13px]">
            <button type="button" disabled={!visible.length} className="font-semibold hover:underline disabled:opacity-40" onClick={() => { setSelected((old) => new Set([...old, ...visible.map((m) => m.id)])); setPage(0); }}>Označi prikazane ({visible.length})</button>
            <button type="button" disabled={!chosen.length} className="text-fg-muted hover:underline disabled:opacity-40" onClick={() => { setSelected(new Set()); setPage(0); }}>Poništi izbor</button>
          </div>
          {hiddenSelected > 0 && <p className="text-[12px] text-fg-muted">Odabrano izvan trenutnog filtera: {hiddenSelected}. Te utakmice ostaju na slikama.</p>}
          {from && to && from > to && <p role="alert" className="text-[13px] text-crest">Početni datum mora biti prije završnog.</p>}
          <div className="max-h-[420px] overflow-y-auto rounded-lg border border-line">
            {visible.length ? visible.map((m) => (
              <label key={m.id} className={cx("flex cursor-pointer items-start gap-3 border-b border-line p-3 last:border-b-0 hover:bg-panel-2", selected.has(m.id) && "bg-panel-2")}>
                <input type="checkbox" checked={selected.has(m.id)} onChange={() => toggle(m.id)} className="mt-1 size-4 shrink-0 accent-brand" />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2 text-[11px] text-fg-muted">{m.competition}{m.round == null ? "" : ` · ${m.round}. kolo`}{m.status === "postponed" && <span className="rounded bg-orange/10 px-1.5 py-0.5 font-semibold text-orange">ODGOĐENO</span>}</span>
                  <span className="mt-0.5 block text-[14px] font-semibold">{m.home} <span className="font-normal text-fg-faint">–</span> {m.away}</span>
                  <span className="mt-1 block text-[12px] text-fg-muted">{m.status === "postponed" ? `Prvobitno: ${formatDate(m.date)} · Novi termin naknadno` : `${formatDate(m.date)} · ${formatTime(m.startsAt)} · ${m.hall ?? "Dvorana nije određena"}`}</span>
                </span>
              </label>
            )) : <p className="p-6 text-center text-[14px] text-fg-muted">Nema utakmica za ove filtere.</p>}
          </div>
          <p className="text-[12px] text-fg-faint">Buduće zakazane i sve odgođene utakmice tekuće sezone. Datumski filter za odgođene koristi prvobitni datum. Početni izbor: narednih 7 dana.</p>
        </Step>

        <Step number={2} title="Predložak i format">
          <SocialDesign options={options} onChange={change} perPage={perPage} onPerPage={(value) => { setPerPage(value); setPage(0); }} />
        </Step>

        <Step number={3} title="Tekst i detalji">
          <SocialText options={options} onChange={change} />
        </Step>
      </div>

      <SocialPreview matches={chosen} options={options} perPage={perPage} page={page} onPage={setPage} onStale={() => setNow(Date.now())} className="lg:sticky lg:top-6" />
    </div>
  );
}

type OptionChange = <K extends keyof SocialOptions>(key: K, value: SocialOptions[K]) => void;

/** Predložak, format i broj utakmica po slici */
export function SocialDesign({ options, onChange: change, perPage, onPerPage }: { options: SocialOptions; onChange: OptionChange; perPage: number; onPerPage: (value: number) => void }) {
  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3" role="group" aria-label="Predložak slike">
        {SOCIAL_TEMPLATES.map((template) => (
          <button key={template.id} type="button" aria-pressed={options.template === template.id} title={template.description} onClick={() => change("template", template.id)} className={cx("min-w-0 rounded-lg border p-2 text-left transition-colors", options.template === template.id ? "border-brand ring-1 ring-brand" : "border-line hover:border-line-hover")}>
            <span aria-hidden="true" className="relative mb-2 flex aspect-[4/5] flex-col gap-2 overflow-hidden rounded-md bg-cover bg-center p-2.5 sm:p-3" style={{ backgroundColor: template.bg, backgroundImage: template.background ? `linear-gradient(${template.overlay}, ${template.overlay}), url("${template.background}")` : undefined }}>
              <span className="flex items-center gap-1.5"><span className="overflow-hidden rounded bg-white p-0.5"><Image src={SOCIAL_BRANDS[options.brand].logo} alt="" width={20} height={20} className={cx("size-5 object-contain", options.brand === "ksbih" && "scale-[1.6]")} /></span><span className="text-[9px] font-extrabold" style={{ color: template.headerInk }}>{SOCIAL_BRANDS[options.brand].name}</span></span>
              <span className="text-[9px] font-extrabold leading-tight sm:text-[12px]" style={{ color: template.headerInk }}>RASPORED<br />UTAKMICA</span>
              {[0, 1].map((n) => <span key={n} className="flex flex-1 items-center justify-around gap-1 rounded p-1.5" style={{ backgroundColor: template.panel }}><span className="size-5 rounded bg-white/95" /><span className="text-[8px] font-extrabold" style={{ color: template.accent }}>{["12:30", "18:00"][n]}</span><span className="size-5 rounded bg-white/95" /></span>)}
              {options.template === template.id && <span className="absolute right-1.5 top-1.5 rounded-full bg-white p-0.5 text-black"><Check className="size-3" /></span>}
            </span>
            <span className="block text-[12px] font-semibold leading-snug">{template.name}</span>
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2" role="group" aria-label="Format slike">
        {SOCIAL_FORMATS.map((item) => <button key={item.id} type="button" aria-pressed={options.format === item.id} onClick={() => change("format", item.id)} className={cx("rounded-lg border p-3 text-left", options.format === item.id ? "border-brand bg-brand-soft ring-1 ring-brand" : "border-line hover:bg-panel-2")}><span className="block text-[13px] font-semibold">{item.name}</span><span className="mt-1 block text-[11px] text-fg-muted">{item.detail}<br />{item.width} × {item.height} px</span></button>)}
      </div>
      <Select label="Utakmica po slici" value={perPage} onChange={(event) => onPerPage(Number(event.target.value))} hint="Jedna utakmica uključuje obje ekipe. Više utakmica daje gušći raspored; za veće grbove izaberi manji broj ili Story format.">
        {Array.from({ length: 12 }, (_, index) => index + 1).map((count) => <option key={count} value={count}>{count} po slici</option>)}
      </Select>
    </>
  );
}

/** Naslov, podnaslov, tekst u dnu i šta se prikazuje */
export function SocialText({ options, onChange: change }: { options: SocialOptions; onChange: OptionChange }) {
  return (
    <>
      <Field label="Naslov" value={options.title} maxLength={60} placeholder="Raspored utakmica" onChange={(event) => change("title", event.target.value)} />
      <Field label="Podnaslov" value={options.subtitle} maxLength={100} placeholder="Vikend košarke · 24–25. oktobar" onChange={(event) => change("subtitle", event.target.value)} />
      <Field label="Tekst u dnu slike" value={options.footer} maxLength={100} onChange={(event) => change("footer", event.target.value)} />
      <div className="flex flex-wrap gap-x-5 gap-y-3">
        {([{ key: "showLogos", label: "Grbovi ekipa" }, { key: "showCompetition", label: "Takmičenje i kolo" }, { key: "showHall", label: "Dvorana" }] as const).map(({ key, label }) => <label key={key} className="flex items-center gap-2 text-[13px]"><input type="checkbox" checked={options[key]} onChange={(event) => change(key, event.target.checked)} className="size-4 accent-brand" />{label}</label>)}
      </div>
      <p className="text-[12px] text-fg-faint">{SOCIAL_BRANDS[options.brand].name} logo je uvijek prikazan. Termini su po sarajevskom vremenu; za odgođene utakmice piše „ODGOĐENO“ umjesto termina.</p>
    </>
  );
}

/** Pregled i preuzimanje slika za odabrane utakmice; `onStale` kad je neka utakmica u međuvremenu počela */
export function SocialPreview({ matches: chosen, options, perPage, page, onPage: setPage, onStale, className }: {
  matches: SocialMatch[];
  options: SocialOptions;
  perPage: number;
  page: number;
  onPage: (page: number) => void;
  onStale: () => void;
  className?: string;
}) {
  const [preview, setPreview] = useState<{ key: string; url: string; missingLogos: number } | null>(null);
  const [failure, setFailure] = useState<{ key: string; message: string } | null>(null);
  const format = SOCIAL_FORMATS.find((f) => f.id === options.format)!;
  const pages = Math.ceil(chosen.length / perPage);
  const currentPage = Math.min(page, Math.max(0, pages - 1));
  const pageMatches = useMemo(() => chosen.slice(currentPage * perPage, (currentPage + 1) * perPage), [chosen, currentPage, perPage]);
  const renderKey = JSON.stringify([pageMatches, options, currentPage, pages]);
  const ready = preview?.key === renderKey && chosen.length > 0;
  const error = failure?.key === renderKey ? failure.message : null;

  useEffect(() => {
    if (!pageMatches.length) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      renderSocialImage(pageMatches, options, currentPage, pages).then(({ blob, missingLogos }) => {
        if (cancelled) return;
        const objectUrl = URL.createObjectURL(blob);
        setPreview({ key: renderKey, url: objectUrl, missingLogos });
        setFailure(null);
      }).catch((cause: unknown) => {
        if (!cancelled) setFailure({ key: renderKey, message: cause instanceof Error ? cause.message : "Izrada slike nije uspjela." });
      });
    }, 180);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [pageMatches, options, currentPage, pages, renderKey]);

  useEffect(() => {
    return () => { if (preview) URL.revokeObjectURL(preview.url); };
  }, [preview]);

  return (
    <section aria-label="Pregled slike" className={cx(CARD, "flex min-w-0 flex-col gap-4 p-4", className)}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[18px] font-semibold tracking-tight">Pregled objave</h2>
        <span className="text-[12px] text-fg-faint">PNG · {format.width} × {format.height}</span>
      </div>
      <div className="grid min-h-52 place-items-center overflow-hidden rounded-lg border border-line bg-panel-2 p-2" aria-busy={chosen.length > 0 && !ready && !error}>
        {!chosen.length ? <div className="px-5 py-16 text-center text-fg-muted"><Images className="mx-auto mb-3 size-8" aria-hidden="true" /><p className="text-[14px]">Označi utakmice za pregled slike.</p></div>
          : error ? <p role="alert" className="p-6 text-[14px] text-crest">{error}</p>
          : ready ? (
            // eslint-disable-next-line @next/next/no-img-element -- Local PNG blob is the exact downloadable image.
            <img src={preview.url} alt={`${options.title || "Raspored utakmica"}, slika ${currentPage + 1}: ${pageMatches.map((m) => `${m.home} – ${m.away}, ${m.status === "postponed" ? "ODGOĐENO, novi termin naknadno" : `${formatDate(m.date)} u ${formatTime(m.startsAt)}`}`).join("; ")}`} width={format.width} height={format.height} className="block h-auto max-h-[66vh] w-auto max-w-full shadow-panel" />
          ) : <SocialPreviewSkeleton width={format.width} height={format.height} rows={pageMatches.length} />}
      </div>
      {pages > 1 && <div className="flex items-center justify-between gap-2">
        <Button variant="secondary" aria-label="Prethodna slika" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)} className="px-3"><ChevronLeft className="size-4" /></Button>
        <label className="flex items-center gap-2 text-[13px]">Slika <select aria-label="Broj slike" className={cx(inputClass, "w-auto!")} value={currentPage} onChange={(event) => setPage(Number(event.target.value))}>{Array.from({ length: pages }, (_, n) => <option key={n} value={n}>{n + 1} / {pages}</option>)}</select></label>
        <Button variant="secondary" aria-label="Sljedeća slika" disabled={currentPage >= pages - 1} onClick={() => setPage(currentPage + 1)} className="px-3"><ChevronRight className="size-4" /></Button>
      </div>}
      {pages > 1 && <p className="text-[12px] leading-relaxed text-fg-muted">Raspored je podijeljen na {pages} slika, do {perPage} utakmica po slici. Preuzmi svaku stranicu za carousel ili niz Story objava.</p>}
      {ready && preview.missingLogos > 0 && <p role="status" className="text-[12px] text-orange">Nisu učitani svi grbovi ({preview.missingLogos}). Na njihovom mjestu su inicijali ekipa.</p>}
      <Button disabled={!ready} onClick={() => {
        if (!ready || !preview) return;
        if (pageMatches.some((match) => match.status !== "postponed" && new Date(match.startsAt).getTime() <= Date.now())) { onStale(); return; }
        const link = document.createElement("a");
        link.href = preview.url;
        link.download = `${slug(options.title) || "raspored"}-${options.format}-${currentPage + 1}.png`;
        document.body.appendChild(link);
        link.click();
        link.remove();
      }}><Download className="size-4" aria-hidden="true" />{pages > 1 ? `Preuzmi sliku ${currentPage + 1} (PNG)` : "Preuzmi sliku (PNG)"}</Button>
      <p className="text-center text-[12px] text-fg-faint">Spremno za ručnu objavu na Facebooku i Instagramu.</p>
    </section>
  );
}

function Step({ number, title, aside, children }: { number: number; title: string; aside?: string; children: ReactNode }) {
  return <section className={cx(CARD, "flex flex-col gap-4 p-4 sm:p-5")}><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="flex items-center gap-2.5 text-[17px] font-semibold"><span className="grid size-7 place-items-center rounded-full bg-panel-2 text-[12px] text-fg-muted">{number}</span>{title}</h2>{aside && <span className="text-[12px] font-semibold text-fg-muted">{aside}</span>}</div>{children}</section>;
}

function fold(value: string) {
  return value.toLowerCase().replace(/đ/g, "d").normalize("NFD").replace(/\p{M}/gu, "");
}

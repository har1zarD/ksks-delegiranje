import type { SocialMatch } from "@/lib/data/social";
import { formatTime, formatWeekday } from "@/lib/format";
import { formatScore } from "@/lib/quarter-points";
import { A1_ZENE_ID } from "@/lib/a1-zene-raspored";
import { A2_JUG_ID } from "@/lib/a2-jug-raspored";

export const SOCIAL_FORMATS = [
  { id: "portrait", name: "Objava · 4:5", detail: "Instagram / Facebook", width: 1080, height: 1350 },
  { id: "square", name: "Kvadrat · 1:1", detail: "Instagram / Facebook", width: 1080, height: 1080 },
  { id: "story", name: "Story · 9:16", detail: "Instagram / Facebook", width: 1080, height: 1920 },
  { id: "landscape", name: "Široka objava", detail: "Facebook", width: 1200, height: 630 },
] as const;

export const KSKS_LOGO = "/brand/ksks-logo-512.png";

const KSBIH = { name: "KSBIH", lines: ["KOŠARKAŠKI SAVEZ", "BOSNE I HERCEGOVINE"], footer: "Košarkaški savez Bosne i Hercegovine", watermark: "/competitions/ksbih.png" } as const;

/**
 * Savez u zaglavlju slike, logo je prozirni PNG bez podloge. `light` je ista slika s bijelim natpisom za tamne teme.
 * KSBIH lige imaju svoj logo (A1Ž, A2), a vodeni žig je uvijek osnovni grb saveza.
 */
export const SOCIAL_BRANDS = {
  ksks: { logo: KSKS_LOGO, light: KSKS_LOGO, name: "KSKS", lines: ["KOŠARKAŠKI SAVEZ", "KANTONA SARAJEVO"], footer: "Košarkaški savez Kantona Sarajevo", watermark: null },
  // Sve KSBiH lige nose isti logo KSBiH (bez oznake lige desno), korisnik 2026-10-25
  ksbih: { ...KSBIH, logo: "/competitions/ksbih.png", light: "/competitions/ksbih-light.png" },
  "ksbih-a1-zene": { ...KSBIH, logo: "/competitions/ksbih.png", light: "/competitions/ksbih-light.png" },
  "ksbih-a2": { ...KSBIH, logo: "/competitions/ksbih.png", light: "/competitions/ksbih-light.png" },
} as const;

/** Savez čije je takmičenje: A1 žene i A2 jug su KSBIH lige, ostalo (i više takmičenja na slici) KSKS */
export function brandOf(competitionId: string): SocialBrand {
  if (competitionId === A1_ZENE_ID) return "ksbih-a1-zene";
  if (competitionId === A2_JUG_ID) return "ksbih-a2";
  return "ksks";
}

const ARENA = "/social/arena-background-v1.png";
const PARQUET = "/social/parquet-background-v1.png";
const FIRE = "/social/fire-v1.png";
const ELECTRIC = "/social/electric-v1.png";
const CRIMSON = "/social/crimson-v1.png";
const EMERALD = "/social/emerald-v1.png";
const SILVER = "/social/silver-v1.png";

type Template = {
  id: string;
  name: string;
  description: string;
  bg: string;
  /** Traka reda; "transparent" = bez trake, redovi razdvojeni tankom linijom */
  panel: string;
  ink: string;
  muted: string;
  accent: string;
  line: string;
  background: string | null;
  overlay: string;
  headerInk: string;
  headerMuted: string;
};

export const SOCIAL_TEMPLATES = [
  { id: "fire", name: "Vatra", description: "Crna dvorana, žar i narandžasti sjaj", bg: "#120a05", panel: "rgba(14,9,6,0.84)", ink: "#ffffff", muted: "#efd3bd", accent: "#ff7a1a", line: "#6b3b1c", background: FIRE, overlay: "rgba(8,4,2,0.18)", headerInk: "#ffffff", headerMuted: "#ffdcc2" },
  { id: "electric", name: "Električna plava", description: "Plavi reflektori, broadcast stil", bg: "#06122e", panel: "rgba(5,16,44,0.84)", ink: "#ffffff", muted: "#bfd5f6", accent: "#ff8a3d", line: "#2f4f86", background: ELECTRIC, overlay: "rgba(2,8,24,0.16)", headerInk: "#ffffff", headerMuted: "#d3e2fb" },
  { id: "crimson", name: "Crvena noć", description: "Crveni reflektori i izmaglica", bg: "#1a0508", panel: "rgba(28,6,10,0.84)", ink: "#ffffff", muted: "#efc7cc", accent: "#ffcf8a", line: "#6b2a33", background: CRIMSON, overlay: "rgba(10,2,4,0.16)", headerInk: "#ffffff", headerMuted: "#f6d9dc" },
  { id: "emerald", name: "Smaragd", description: "Zeleno-tirkizna moderna dvorana", bg: "#04201c", panel: "rgba(3,28,25,0.84)", ink: "#ffffff", muted: "#bfe7dc", accent: "#7ef0c9", line: "#2e6b5f", background: EMERALD, overlay: "rgba(1,12,10,0.16)", headerInk: "#ffffff", headerMuted: "#d2f1e8" },
  { id: "silver", name: "Srebro", description: "Svijetla studijska pozadina", bg: "#eef1f5", panel: "rgba(255,255,255,0.88)", ink: "#0f172a", muted: "#4b5567", accent: "#2457d6", line: "#cfd6e0", background: SILVER, overlay: "transparent", headerInk: "#0f172a", headerMuted: "#4b5567" },
  { id: "arena", name: "Noć u dvorani", description: "Dvorana pod reflektorima, zlatni detalji", bg: "#101827", panel: "rgba(15,25,43,0.90)", ink: "#ffffff", muted: "#c7d3e5", accent: "#ffc674", line: "#46546b", background: ARENA, overlay: "rgba(6,13,27,0.32)", headerInk: "#ffffff", headerMuted: "#d2d9e6" },
  { id: "paper", name: "Čisti raspored", description: "Bijelo-plavi službeni raspored", bg: "#edf2f8", panel: "#ffffff", ink: "#142b4a", muted: "#50647d", accent: "#1c4ccd", line: "#cbd7e6", background: null, overlay: "transparent", headerInk: "#142b4a", headerMuted: "#50647d" },
  { id: "court", name: "Na parketu", description: "Pravi parket i topli narandžasti tonovi", bg: "#633713", panel: "rgba(28,23,20,0.92)", ink: "#ffffff", muted: "#e0cbb7", accent: "#ffad66", line: "#7b5b40", background: PARQUET, overlay: "rgba(35,19,8,0.28)", headerInk: "#ffffff", headerMuted: "#f2dcc4" },
  { id: "royal", name: "KSKS Royal", description: "Boje saveza: ljubičasta i zlato", bg: "#211348", panel: "rgba(33,19,72,0.92)", ink: "#ffffff", muted: "#d9d0ec", accent: "#efc45b", line: "#655183", background: ARENA, overlay: "rgba(36,12,75,0.66)", headerInk: "#ffffff", headerMuted: "#e0d7ef" },
  { id: "gold", name: "Zlatni termin", description: "Crni parket, bronza i zlato", bg: "#17130d", panel: "rgba(23,20,15,0.94)", ink: "#fffaf0", muted: "#d8c7a7", accent: "#e9c675", line: "#736144", background: PARQUET, overlay: "rgba(8,8,10,0.68)", headerInk: "#fff4dc", headerMuted: "#e5cfa7" },
  { id: "ice", name: "Plavi reflektori", description: "Hladna plava dvorana i svijetli grbovi", bg: "#082a43", panel: "rgba(6,36,59,0.93)", ink: "#ffffff", muted: "#b8d8ea", accent: "#7fe2ff", line: "#3a738f", background: ARENA, overlay: "rgba(0,39,66,0.60)", headerInk: "#ffffff", headerMuted: "#c3e7f6" },
  { id: "editorial", name: "Sportski magazin", description: "Krem papir, bordo i izražena tipografija", bg: "#f5eee3", panel: "#fffdf8", ink: "#47221c", muted: "#776254", accent: "#8e3025", line: "#d3bb9c", background: null, overlay: "transparent", headerInk: "#47221c", headerMuted: "#776254" },
] as const satisfies readonly Template[];

export const SOCIAL_STATEHOOD_TEMPLATE = {
  id: "bih-statehood", name: "Dan državnosti BiH", description: "Plavo-žuta pozadina sa zvijezdama i oznakom 25. novembra",
  bg: "#06184b", panel: "rgba(4,18,57,0.92)", ink: "#ffffff", muted: "#ccdafa", accent: "#ffda44", line: "#36589b",
  background: "/social/bih-statehood-portrait-v1.png", overlay: "rgba(2,10,35,0.18)", headerInk: "#ffffff", headerMuted: "#e1eaff",
} as const satisfies Template;

/** Boja akcenta preko predloška (prazno = boja predloška), da slika prati boje tvoje pozadine */
export const SOCIAL_ACCENTS = [
  { id: "", name: "Iz predloška" },
  { id: "#f2c14e", name: "Zlatna" },
  { id: "#ff7a1a", name: "Narandžasta" },
  { id: "#f2545b", name: "Crvena" },
  { id: "#4aa8ff", name: "Plava" },
  { id: "#34d399", name: "Zelena" },
  { id: "#a78bfa", name: "Ljubičasta" },
  { id: "#ffffff", name: "Bijela" },
] as const;

/** Raspored elemenata na slici, po vrsti slike */
export const SOCIAL_YEARS = [
  { id: "none", name: "Bez godine", example: "31.10." },
  { id: "short", name: "Kratko", example: "31.10.26." },
  { id: "full", name: "Puno", example: "31.10.2026." },
] as const;

export const SOCIAL_LAYOUTS = {
  schedule: [
    { id: "rows", name: "Trake", description: "Grb, ime, termin, ime, grb" },
    { id: "cards", name: "Kartice", description: "Imena, grbovi, termin i dvorana na kartici" },
    { id: "list", name: "Lista", description: "Po danima, sažeto" },
  ],
  results: [
    { id: "rows", name: "Trake", description: "Grb, ime, rezultat, ime, grb" },
    { id: "list", name: "Lista", description: "Po danima, sažeto" },
  ],
  round: [
    { id: "split", name: "Odigrano i slijedi", description: "Rezultati gore, preostale utakmice ispod" },
    { id: "rows", name: "Trake", description: "Redom po terminu, rezultat ili datum" },
    { id: "list", name: "Lista", description: "Po danima, sažeto" },
  ],
  standings: [
    { id: "bars", name: "Trake", description: "Svaka ekipa u svojoj traci" },
    { id: "board", name: "Ploča", description: "Jedan panel, tanke linije" },
  ],
  clubs: [
    { id: "grid", name: "Mreža", description: "Veliki grbovi s imenima" },
    { id: "list", name: "Lista", description: "Grb i ime u redovima" },
  ],
  stats: [
    { id: "mvp", name: "MVP", description: "Najbolji igrač: velika fotografija, ime i brojke" },
    { id: "five", name: "Petorka", description: "Pet najboljih igrača na karticama" },
    { id: "leaders", name: "Lideri", description: "Najbolji po poenima, skokovima, asistencijama…" },
    { id: "top", name: "Top lista", description: "Redoslijed igrača po jednoj statistici" },
  ],
} as const;

export type SocialFormat = (typeof SOCIAL_FORMATS)[number]["id"];
export type SocialTemplate = (typeof SOCIAL_TEMPLATES)[number]["id"];
export type SocialBrand = keyof typeof SOCIAL_BRANDS;
export type SocialYear = (typeof SOCIAL_YEARS)[number]["id"];
export type SocialKind = "schedule" | "results" | "round" | "standings" | "clubs" | "stats";

/** Izgled: zajednički za sve vrste slika */
export type SocialDesignOptions = {
  format: SocialFormat;
  template: SocialTemplate;
  accent: string;
  statehoodDay: boolean;
  showBrand: boolean;
  showLogos: boolean;
  /** Grb na bijeloj pločici (za grbove s bijelom pozadinom) */
  crestTiles: boolean;
  showHall: boolean;
  showCompetition: boolean;
  /** Godina uz datum: bez nje, s dvije (31.10.26.) ili četiri cifre (31.10.2026.) */
  year: SocialYear;
};

/** Tekst i raspored elemenata: svaka vrsta slike ima svoj */
export type SocialTextOptions = { brand: SocialBrand; title: string; subtitle: string; footer: string; layout: string };

export type SocialOptions = SocialDesignOptions & SocialTextOptions;

/** Sačuvano stanje bildera rasporeda (karticа "Raspored"): dovoljno da se nastavi na drugom uređaju */
export type ScheduleDraft = {
  manual: SocialMatch[];
  selected: string[];
  filters: { competition: string; round: string; search: string; from: string; to: string };
  texts: SocialTextOptions;
  perPage: number;
  design: SocialDesignOptions;
};

export type SocialStanding = { teamId: string; name: string; logoUrl: string | null; played: number; won: number; lost: number; diff: number; points: number };

/** Statistika igrača na slici: kolo = jedna utakmica (games 1), sezona = zbir i broj utakmica (prikaz po utakmici) */
export type SocialStatPlayer = {
  id: string;
  first: string;
  last: string;
  number: string | null;
  team: string;
  teamLogo: string | null;
  /** Fotografija s licence i ista bez pozadine (PNG) */
  photo: string | null;
  cutout: string | null;
  games: number;
  seconds: number;
  pts: number;
  reb: number;
  ast: number;
  stl: number;
  blk: number;
  tov: number;
  fgm: number;
  fga: number;
  tpm: number;
  tpa: number;
  ftm: number;
  fta: number;
  eff: number;
  /** Utakmica kola (samo za kolo) */
  game: { opponent: string; opponentLogo: string | null; teamScore: number; opponentScore: number; won: boolean } | null;
};

export type SocialStatKey = "pts" | "reb" | "ast" | "eff" | "stl" | "blk" | "tpm";

/** Statistike za lidere i top listu; `unit` ide ispod broja na slici */
export const SOCIAL_STATS: { id: SocialStatKey; label: string; short: string; unit: string; top: string }[] = [
  { id: "pts", label: "Poeni", short: "PTS", unit: "POENA", top: "Najbolji strijelci" },
  { id: "reb", label: "Skokovi", short: "SKO", unit: "SKOKOVA", top: "Najbolji skakači" },
  { id: "ast", label: "Asistencije", short: "AST", unit: "ASISTENCIJA", top: "Najbolji asistenti" },
  { id: "eff", label: "Indeks korisnosti", short: "IND", unit: "INDEKS", top: "Najkorisniji igrači" },
  { id: "stl", label: "Ukradene lopte", short: "UKR", unit: "UKRADENIH", top: "Najviše ukradenih lopti" },
  { id: "blk", label: "Blokade", short: "BLK", unit: "BLOKADA", top: "Najviše blokada" },
  { id: "tpm", label: "Pogođene trice", short: "3P", unit: "TRICA", top: "Najviše pogođenih trica" },
];

/** Vrijednost statistike: kolo = broj s utakmice, sezona = prosjek po utakmici */
export function statValue(p: SocialStatPlayer, key: SocialStatKey, season: boolean) {
  return season ? p[key] / Math.max(1, p.games) : p[key];
}

/** "24" za kolo, "18,4" za prosjek sezone */
export function statText(p: SocialStatPlayer, key: SocialStatKey, season: boolean) {
  const value = statValue(p, key, season);
  return season ? value.toFixed(1).replace(".", ",") : String(value);
}

/** Ime igrača za pregled i opis slike */
export const statName = (p: SocialStatPlayer) => [p.first, p.last].filter(Boolean).join(" ");
export type SocialClub = { id: string; name: string; logoUrl: string | null };

export type SocialContent =
  | { kind: "schedule"; matches: SocialMatch[] }
  | { kind: "results"; matches: SocialMatch[] }
  /** Kolo: odigrane utakmice s rezultatom i one koje tek slijede, na istoj slici */
  | { kind: "round"; matches: SocialMatch[] }
  | { kind: "standings"; rows: SocialStanding[]; firstRank: number }
  | { kind: "clubs"; clubs: SocialClub[] }
  /** Statistika: `season` = prosjeci sezone, inače jedno kolo */
  | { kind: "stats"; mode: "mvp"; player: SocialStatPlayer; season: boolean }
  | { kind: "stats"; mode: "five"; players: SocialStatPlayer[]; season: boolean }
  | { kind: "stats"; mode: "leaders"; categories: { key: SocialStatKey; players: SocialStatPlayer[] }[]; season: boolean }
  | { kind: "stats"; mode: "top"; key: SocialStatKey; players: SocialStatPlayer[]; firstRank: number; season: boolean };

/** Igrači na slici statistike */
export function statPlayers(content: SocialContent): SocialStatPlayer[] {
  if (content.kind !== "stats") return [];
  if (content.mode === "mvp") return [content.player];
  if (content.mode === "leaders") return content.categories.flatMap((c) => c.players);
  return content.players;
}

/** Utakmica s upisanim konačnim rezultatom */
export function isPlayed(m: SocialMatch) {
  return m.status === "finished" && m.homeScore != null && m.awayScore != null;
}

export function templateOf(id: SocialTemplate, statehoodDay = false): Template {
  return statehoodDay ? SOCIAL_STATEHOOD_TEMPLATE : SOCIAL_TEMPLATES.find((t) => t.id === id) ?? SOCIAL_TEMPLATES.find((t) => t.id === "arena")!;
}

export function contentSize(content: SocialContent) {
  if (content.kind === "stats") return content.mode === "mvp" ? 4 : content.mode === "leaders" ? content.categories.length * 2 : content.players.length;
  return "matches" in content ? content.matches.length : content.kind === "standings" ? content.rows.length : content.clubs.length;
}

const imageCache = new Map<string, Promise<HTMLImageElement | null>>();
const crestBounds = new WeakMap<HTMLImageElement, { x: number; y: number; width: number; height: number }>();

/** Neprovidni dio slike (grbovi često imaju mnogo praznog prostora oko sebe) */
function visibleBounds(image: HTMLImageElement) {
  const cached = crestBounds.get(image);
  if (cached) return cached;
  const full = { x: 0, y: 0, width: image.naturalWidth, height: image.naturalHeight };
  const sample = document.createElement("canvas");
  const scale = Math.min(1, 512 / Math.max(full.width, full.height));
  sample.width = Math.max(1, Math.round(full.width * scale));
  sample.height = Math.max(1, Math.round(full.height * scale));
  const context = sample.getContext("2d", { willReadFrequently: true });
  if (!context) return full;
  context.drawImage(image, 0, 0, sample.width, sample.height);
  const pixels = context.getImageData(0, 0, sample.width, sample.height).data;
  let left = sample.width, top = sample.height, right = -1, bottom = -1;
  for (let y = 0; y < sample.height; y++) {
    for (let x = 0; x < sample.width; x++) {
      if (pixels[(y * sample.width + x) * 4 + 3] <= 8) continue;
      left = Math.min(left, x); right = Math.max(right, x);
      top = Math.min(top, y); bottom = Math.max(bottom, y);
    }
  }
  const x = Math.max(0, left - 2) * full.width / sample.width;
  const y = Math.max(0, top - 2) * full.height / sample.height;
  const bounds = right < left ? full : {
    x, y,
    width: Math.min(full.width, (right + 3) * full.width / sample.width) - x,
    height: Math.min(full.height, (bottom + 3) * full.height / sample.height) - y,
  };
  crestBounds.set(image, bounds);
  return bounds;
}

function loadImage(url: string) {
  const existing = imageCache.get(url);
  if (existing) return existing;
  const pending = new Promise<HTMLImageElement | null>((resolve) => {
    const img = new Image();
    const timer = window.setTimeout(() => finish(null), 12000);
    const finish = (image: HTMLImageElement | null) => {
      window.clearTimeout(timer);
      img.onload = null;
      img.onerror = null;
      if (!image) imageCache.delete(url);
      resolve(image);
    };
    img.crossOrigin = "anonymous";
    img.onload = () => finish(img.naturalWidth ? img : null);
    img.onerror = () => finish(null);
    img.src = url;
  });
  imageCache.set(url, pending);
  return pending;
}

function rgbOf(hex: string) {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex);
  const n = match ? parseInt(match[1], 16) : 0xffffff;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function luminance(hex: string) {
  const [r, g, b] = rgbOf(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Tamni ili bijeli tekst na boji akcenta */
function inkOn(hex: string) {
  return luminance(hex) > 0.45 ? "#0b0d12" : "#ffffff";
}

const shortDate = (date: string, year: SocialYear) => {
  const [y, m, d] = date.split("-");
  return `${d}.${m}.${year === "full" ? `${y}.` : year === "short" ? `${y.slice(2)}.` : ""}`;
};

const logoUrls = (content: SocialContent) =>
  "matches" in content ? content.matches.flatMap((m) => [m.homeLogo, m.awayLogo])
    : content.kind === "standings" ? content.rows.map((r) => r.logoUrl)
    : content.kind === "stats" ? statPlayers(content).flatMap((p) => [p.teamLogo, p.game?.opponentLogo ?? null])
    : content.clubs.map((c) => c.logoUrl);

/**
 * Slika za objavu (PNG). `posterFont` je uski sportski font za naslove, imena i brojeve; ostalo je font aplikacije.
 */
export async function renderSocialImage(content: SocialContent, options: SocialOptions, page: number, pages: number, posterFont: string) {
  const format = SOCIAL_FORMATS.find((f) => f.id === options.format)!;
  const base = templateOf(options.template, options.statehoodDay);
  const theme = {
    ...base,
    accent: options.accent || base.accent,
    background: options.statehoodDay && options.format === "landscape" ? "/social/bih-statehood-landscape-v1.png" : base.background,
  };
  const brand = SOCIAL_BRANDS[options.brand];
  const body = getComputedStyle(document.body).fontFamily;
  const poster = posterFont || body;
  const mono = getComputedStyle(document.body).getPropertyValue("--font-geist-mono").trim() || "monospace";
  const urls = options.showLogos ? [...new Set(logoUrls(content).filter((url): url is string => Boolean(url)))] : [];
  // Fotografija igrača: bez pozadine (PNG) kad postoji, inače obična s licence
  const people = statPlayers(content);
  const [loaded, photoList, brandLogo, background, watermark] = await Promise.all([
    Promise.all(urls.map(async (url) => [url, await loadImage(url)] as const)),
    Promise.all(people.map(async (p) => {
      const cutout = p.cutout ? await loadImage(p.cutout) : null;
      const photo = cutout ? null : p.photo ? await loadImage(p.photo) : null;
      return [p.id, { cutout, photo }] as const;
    })),
    loadImage(luminance(base.headerInk) > 0.5 ? brand.light : brand.logo),
    theme.background ? loadImage(theme.background) : Promise.resolve(null),
    brand.watermark ? loadImage(brand.watermark) : Promise.resolve(null),
    document.fonts.load(`700 40px ${poster}`, "ČĆŠĐŽčćšđž0123456789"),
    document.fonts.load(`500 40px ${poster}`, "ČĆŠĐŽčćšđž0123456789"),
    document.fonts.load(`600 24px ${body}`, "ČĆŠĐŽčćšđž"),
    document.fonts.load(`700 36px ${mono}`, "ODGOĐENO"),
  ]);
  if (!brandLogo) throw new Error(`${brand.name} logo nije učitan. Osvježi stranicu i pokušaj ponovo.`);
  if (theme.background && !background) throw new Error("Pozadina predloška nije učitana. Osvježi stranicu i pokušaj ponovo.");
  const logos = new Map(loaded);
  const photos = new Map(photoList);
  const canvas = document.createElement("canvas");
  canvas.width = format.width;
  canvas.height = format.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Preglednik ne podržava izradu slike.");
  const w = canvas.width;
  const h = canvas.height;
  const wide = options.format === "landscape";
  const story = options.format === "story";
  const margin = wide ? 48 : 60;
  const hasPanel = theme.panel !== "transparent";
  const lightPanel = hasPanel && theme.ink !== "#ffffff" && theme.ink !== "#fffaf0";

  // ── Crtanje ─────────────────────────────────────────────

  function box(x: number, y: number, width: number, height: number, fill: string | CanvasGradient, radius = 14) {
    ctx!.fillStyle = fill;
    ctx!.beginPath();
    ctx!.roundRect(x, y, width, height, radius);
    ctx!.fill();
  }

  function line(x1: number, y1: number, x2: number, y2: number, color: string, width = 1) {
    ctx!.save();
    ctx!.strokeStyle = color;
    ctx!.lineWidth = width;
    ctx!.beginPath();
    ctx!.moveTo(x1, y1);
    ctx!.lineTo(x2, y2);
    ctx!.stroke();
    ctx!.restore();
  }

  type TextStyle = { size: number; color: string; max: number; weight?: number; align?: CanvasTextAlign; face?: Face; spacing?: number };

  type Face = "poster" | "body" | "mono";
  function setFont(size: number, weight: number, face: Face, spacing: number) {
    ctx!.font = `${weight} ${size}px ${face === "poster" ? poster : face === "mono" ? mono : body}`;
    if ("letterSpacing" in ctx!) (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${spacing * size}px`;
  }

  /** Tekst koji se smanji (do 70%) da stane u `max`; sjena samo na prozirnim predlošcima bez trake ili u zaglavlju */
  function text(value: string, x: number, y: number, { size, color, max, weight = 600, align = "left", face = "body", spacing = 0 }: TextStyle) {
    let fitted = size;
    setFont(fitted, weight, face, spacing);
    while (ctx!.measureText(value).width > max && fitted > size * 0.7) {
      fitted -= 1;
      setFont(fitted, weight, face, spacing);
    }
    ctx!.save();
    ctx!.fillStyle = color;
    ctx!.textAlign = align;
    ctx!.textBaseline = "middle";
    ctx!.fillText(value, x, y, max);
    ctx!.restore();
    setFont(size, weight, face, 0);
  }

  function measure(value: string, size: number, weight: number, face: Face, spacing = 0) {
    setFont(size, weight, face, spacing);
    const width = ctx!.measureText(value).width;
    setFont(size, weight, face, 0);
    return width;
  }

  /** Ime ekipe u jednom ili dva reda, centrirano na `x` */
  function teamName(name: string, x: number, y: number, max: number, size: number, color = theme.ink, align: CanvasTextAlign = "center") {
    const value = name.toUpperCase();
    const style = { size, color, max, weight: 600, align, face: "poster" as const, spacing: 0.01 };
    if (measure(value, size, 600, "poster", 0.01) <= max) return text(value, x, y, style);
    const words = value.trim().split(/\s+/);
    if (words.length < 2) return text(value, x, y, style);
    let split = 1;
    let best = Infinity;
    for (let i = 1; i < words.length; i++) {
      const score = Math.max(measure(words.slice(0, i).join(" "), size, 600, "poster"), measure(words.slice(i).join(" "), size, 600, "poster"));
      if (score < best) { best = score; split = i; }
    }
    const small = size * 0.86;
    text(words.slice(0, split).join(" "), x, y - small * 0.56, { ...style, size: small });
    text(words.slice(split).join(" "), x, y + small * 0.56, { ...style, size: small });
  }

  function contain(image: HTMLImageElement, x: number, y: number, size: number, padding = 0, visible = true) {
    const bounds = visible ? visibleBounds(image) : { x: 0, y: 0, width: image.naturalWidth, height: image.naturalHeight };
    const scale = (size - padding * 2) / Math.max(bounds.width, bounds.height);
    const width = bounds.width * scale;
    const height = bounds.height * scale;
    ctx!.drawImage(image, bounds.x, bounds.y, bounds.width, bounds.height, x + (size - width) / 2, y + (size - height) / 2, width, height);
  }

  /** Grb ekipe bez podloge (ili na bijeloj pločici); bez grba inicijali u tankom krugu */
  function crest(name: string, url: string | null, cx: number, cy: number, size: number, ink = theme.ink, ring = theme.line) {
    if (!options.showLogos || size < 8) return;
    const x = cx - size / 2;
    const y = cy - size / 2;
    const logo = url ? logos.get(url) : null;
    if (options.crestTiles) box(x, y, size, size, "#ffffff", size * 0.16);
    if (logo) {
      contain(logo, x, y, size, options.crestTiles ? size * 0.08 : 0);
      return;
    }
    const initials = name.trim().split(/\s+/).map((word) => word[0]).slice(0, 2).join("").toUpperCase();
    if (!options.crestTiles) {
      ctx!.save();
      ctx!.strokeStyle = ring;
      ctx!.lineWidth = Math.max(1.5, size * 0.03);
      ctx!.beginPath();
      ctx!.arc(cx, cy, size * 0.44, 0, Math.PI * 2);
      ctx!.stroke();
      ctx!.restore();
    }
    text(initials, cx, cy, { size: size * 0.32, color: options.crestTiles ? "#25354b" : ink, max: size * 0.8, weight: 700, align: "center", face: "poster" });
  }

  /** Traka reda; bez trake tanka linija ispod (osim zadnjeg reda) */
  function rowSurface(x: number, y: number, width: number, height: number, last: boolean, alpha = 1, radius = Math.min(12, height * 0.16)) {
    if (hasPanel) {
      ctx!.save();
      ctx!.globalAlpha = alpha;
      box(x, y, width, height, theme.panel, radius);
      ctx!.restore();
    } else if (!last) {
      line(x, y + height, x + width, y + height, theme.line, 1.5);
    }
  }

  // ── Podloga ─────────────────────────────────────────────

  ctx.fillStyle = theme.bg;
  ctx.fillRect(0, 0, w, h);
  if (background) {
    const scale = Math.max(w / background.naturalWidth, h / background.naturalHeight);
    const bw = background.naturalWidth * scale;
    const bh = background.naturalHeight * scale;
    ctx.drawImage(background, (w - bw) / 2, (h - bh) / 2, bw, bh);
    ctx.fillStyle = theme.overlay;
    ctx.fillRect(0, 0, w, h);
  }

  // ── Zaglavlje: savez lijevo, naslov u sredini, podnaslov između dvije linije akcenta ─────

  const top = story ? 170 : wide ? 34 : 54;
  const brandSize = wide ? 70 : 84;
  let cursor = top;
  let titleX = margin;
  if (options.showBrand) {
    // Logo bez podloge, visine kao blok saveza; širi logo lige (A1Ž, A2) pomjeri tekst udesno
    const bounds = visibleBounds(brandLogo);
    const scale = brandSize / Math.max(bounds.height, bounds.width / 2.2);
    const logoWidth = bounds.width * scale;
    const logoHeight = bounds.height * scale;
    ctx.drawImage(brandLogo, bounds.x, bounds.y, bounds.width, bounds.height, margin, top + (brandSize - logoHeight) / 2, logoWidth, logoHeight);
    const bx = margin + logoWidth + 20;
    titleX = Math.max(470, bx + 16 + measure(brand.lines[1], 15, 600, "body", 0.08) + 40);
    box(bx, top + brandSize * 0.18, 3, brandSize * 0.64, theme.accent, 1.5);
    text(brand.lines[0], bx + 16, top + brandSize * 0.38, { size: wide ? 15 : 17, color: theme.headerMuted, max: 360, weight: 600, spacing: 0.08 });
    text(brand.lines[1], bx + 16, top + brandSize * 0.64, { size: wide ? 15 : 17, color: theme.headerMuted, max: 360, weight: 600, spacing: 0.08 });
    cursor = top + (wide ? 0 : brandSize + 22);
  }

  const title = options.title.trim().toUpperCase();
  const subtitle = options.subtitle.trim().toUpperCase();
  if (wide) {
    // Široka: naslov desno od saveza, u istom redu
    const tx = titleX;
    if (title) text(title, tx, top + (subtitle ? 26 : brandSize / 2), { size: 50, color: theme.headerInk, max: w - tx - margin, weight: 700, face: "poster", spacing: 0.01 });
    if (subtitle) text(subtitle, tx, top + 66, { size: 20, color: theme.headerMuted, max: w - tx - margin, weight: 600, spacing: 0.12 });
    cursor = top + brandSize + 22;
  } else {
    const titleSize = story ? 112 : options.format === "square" ? 84 : 96;
    if (title) {
      text(title, w / 2, cursor + titleSize * 0.55, { size: titleSize, color: theme.headerInk, max: w - margin * 2, weight: 700, align: "center", face: "poster", spacing: 0.01 });
      cursor += titleSize * 1.12;
    }
    if (subtitle) {
      const size = story ? 30 : 25;
      const width = Math.min(measure(subtitle, size, 600, "body", 0.14), w - margin * 2 - 180);
      const y = cursor + size * 0.6;
      text(subtitle, w / 2, y, { size, color: theme.headerMuted, max: width, weight: 600, align: "center", spacing: 0.14 });
      const gap = 22;
      const rule = Math.min(140, (w - margin * 2 - width) / 2 - gap);
      if (rule > 20) {
        box(w / 2 - width / 2 - gap - rule, y - 1.5, rule, 3, theme.accent, 1.5);
        box(w / 2 + width / 2 + gap, y - 1.5, rule, 3, theme.accent, 1.5);
      }
      cursor += size * 1.9;
    }
    cursor += 18;
  }

  if (options.statehoodDay) {
    const bandHeight = wide ? 28 : story ? 48 : 40;
    box(margin, cursor + 4, w - margin * 2, bandHeight, "rgba(0,35,120,0.92)", 5);
    box(margin, cursor + 4, 4, bandHeight, theme.accent, 1);
    text("25. NOVEMBAR · DAN DRŽAVNOSTI BIH", w / 2, cursor + 4 + bandHeight / 2, {
      size: wide ? 16 : story ? 24 : 20, color: "#ffda44", max: w - margin * 2 - 48, weight: 700, align: "center", spacing: 0.08,
    });
    cursor += bandHeight + (wide ? 14 : 24);
  }

  const footerY = h - (story ? 150 : wide ? 26 : 42);
  const contentTop = cursor;
  const bottom = footerY - (wide ? 22 : 36);
  const available = bottom - contentTop;
  const width = w - margin * 2;

  // Vodeni žig saveza (KSBIH) samo na predlošcima s pozadinom; MVP ima igrača preko cijele slike
  if (watermark && !(content.kind === "stats" && content.mode === "mvp")) {
    const size = Math.min(width, available) * 0.9;
    ctx.save();
    ctx.globalAlpha = background ? 0.22 : 0.1;
    contain(watermark, (w - size) / 2, contentTop + (available - size) / 2, size);
    ctx.restore();
  }
  const panelAlpha = watermark ? 0.8 : 1;

  const dayLabel = (m: SocialMatch) => `${formatWeekday(m.startsAt).toUpperCase()} ${shortDate(m.date, options.year)}`;
  const hallOf = (m: SocialMatch) => (options.showHall && m.hall ? m.hall.toUpperCase() : null);
  const postponedInk = lightPanel || theme.ink === "#0f172a" ? "#c81e1e" : "#ff6b6b";

  /** Rezultat „78 : 65“ centriran na dvotački; pobjednikov broj punom bojom, poraženog prigušeno */
  function score(m: SocialMatch, cx: number, cy: number, size: number, max: number) {
    const home = m.homeScore ?? 0;
    const away = m.awayScore ?? 0;
    const side = max / 2 - size * 0.24;
    text(formatScore(home), cx - size * 0.24, cy, { size, color: home >= away ? theme.ink : theme.muted, max: side, weight: 700, align: "right", face: "poster" });
    text(":", cx, cy - size * 0.05, { size: size * 0.8, color: theme.accent, max: size * 0.3, weight: 700, align: "center", face: "poster" });
    text(formatScore(away), cx + size * 0.24, cy, { size, color: away >= home ? theme.ink : theme.muted, max: side, weight: 700, align: "left", face: "poster" });
  }

  // ── Raspored ─────────────────────────────────────────────

  if (content.kind === "schedule") {
    const matches = content.matches;
    const columns = wide && matches.length > 3 ? 2 : 1;
    const rows = Math.ceil(matches.length / columns);
    const gap = hasPanel ? (matches.length > 6 ? 10 : 14) : 0;
    // Jedna ili dvije utakmice dobiju veliki prikaz; više utakmica su redovi do 210 px
    const cap = rows === 1 ? 440 : rows === 2 ? 400 : story ? 230 : 210;
    const rowHeight = Math.min(cap, (available - (rows - 1) * gap) / Math.max(1, rows));
    // Oznaka takmičenja u redu samo kad su na slici različita takmičenja ili kola (inače je u podnaslovu)
    const mixed = new Set(matches.map((m) => `${m.competitionId}|${m.round ?? ""}`)).size > 1;
    const showCompetition = options.showCompetition && mixed;
    const block = rows * rowHeight + (rows - 1) * gap;
    const startY = contentTop + Math.max(0, (available - block) / 2) * (matches.length <= 2 ? 1 : 0.35);
    const cardWidth = (width - (columns - 1) * 16) / columns;
    const big = columns === 1 && rowHeight >= 300;
    const postponedOn = (light: boolean) => (light ? "#c81e1e" : "#ff6b6b");

    /** Kartice: grbovi i imena uz termin, dvorana i takmičenje u donjem redu */
    const cards = () => {
      const cols = wide && matches.length > 3 ? 2 : 1;
      const lines = Math.ceil(matches.length / cols);
      const gapY = Math.min(16, available / (lines * 8));
      const maxHeight = lines === 1 ? 360 : lines === 2 ? 280 : story ? 220 : 180;
      const cardHeight = Math.min(maxHeight, (available - (lines - 1) * gapY) / lines);
      const block = lines * cardHeight + (lines - 1) * gapY;
      const y0 = contentTop + Math.max(0, available - block) * 0.35;
      const colWidth = (width - (cols - 1) * 24) / cols;
      matches.forEach((m, i) => {
        const postponed = m.status === "postponed";
        const x = margin + (i % cols) * (colWidth + 24);
        const cardWidth = colWidth;
        const y = y0 + Math.floor(i / cols) * (cardHeight + gapY);
        const center = x + cardWidth / 2;
        const competition = showCompetition ? [m.competition, m.round == null ? null : `${m.round}. kolo`].filter(Boolean).join(" · ") : null;
        const detail = [competition, postponed ? "Novi termin naknadno" : options.showHall ? m.hall || "Dvorana nije određena" : null].filter(Boolean).join(" · ").toUpperCase();
        const footerHeight = detail ? Math.min(34, cardHeight * 0.26) : 0;
        const bodyHeight = cardHeight - footerHeight;
        const pad = Math.min(22, cardHeight * 0.14);
        const radius = Math.min(16, cardHeight * 0.12);
        const middle = Math.min(248, cardWidth * 0.25);
        const ink = "#10264e";

        ctx.save();
        ctx.shadowColor = "rgba(0,0,0,0.18)";
        ctx.shadowBlur = Math.min(18, cardHeight * 0.1);
        ctx.shadowOffsetY = 4;
        box(x, y, cardWidth, cardHeight, "#ffffff", radius);
        ctx.restore();
        if (footerHeight) {
          ctx.save();
          ctx.beginPath();
          ctx.roundRect(x, y, cardWidth, cardHeight, radius);
          ctx.clip();
          ctx.fillStyle = "#eff3f9";
          ctx.fillRect(x, y + bodyHeight, cardWidth, footerHeight);
          ctx.restore();
          line(x + pad, y + bodyHeight, x + cardWidth - pad, y + bodyHeight, "#dce4ef");
          text(detail, center, y + bodyHeight + footerHeight / 2, { size: Math.min(20, footerHeight * 0.74), color: "#475b78", max: cardWidth - pad * 2, weight: 600, align: "center" });
        }
        box(x, y + radius, 4, cardHeight - radius * 2, theme.accent, 2);
        const middleInset = Math.min(8, bodyHeight * 0.09);
        if (!postponed) box(center - middle / 2, y + middleInset, middle, bodyHeight - middleInset * 2, "#edf2f9", Math.min(10, radius));

        const size = options.showLogos ? Math.min(144, bodyHeight * 0.82, cardWidth * 0.13) : 0;
        const cy = y + bodyHeight / 2;
        const nameGap = size ? Math.min(14, cardWidth * 0.015) : 0;
        const homeLeft = x + pad + size + nameGap;
        const homeRight = center - middle / 2 - 14;
        const awayLeft = center + middle / 2 + 14;
        const awayRight = x + cardWidth - pad - size - nameGap;
        const nameSize = Math.min(38, Math.max(14, bodyHeight * 0.32));
        crest(m.home, m.homeLogo, x + pad + size / 2, cy, size, ink, "#b5c4d9");
        crest(m.away, m.awayLogo, x + cardWidth - pad - size / 2, cy, size, ink, "#b5c4d9");
        teamName(m.home, (homeLeft + homeRight) / 2, cy, homeRight - homeLeft, nameSize, ink);
        teamName(m.away, (awayLeft + awayRight) / 2, cy, awayRight - awayLeft, nameSize, ink);

        if (postponed) {
          text("ODGOĐENO", center, cy, { size: Math.min(30, bodyHeight * 0.3, middle * 0.12), color: postponedOn(true), max: middle - 20, weight: 700, align: "center", face: "mono", spacing: 0.08 });
        } else {
          const dateLine = `${formatWeekday(m.startsAt).toUpperCase()} ${shortDate(m.date, options.year)}`;
          text(dateLine, center, y + bodyHeight * 0.26, { size: Math.min(25, bodyHeight * 0.205), color: "#475b78", max: middle - 20, weight: 600, align: "center", face: "poster", spacing: 0.01 });
          text(formatTime(m.startsAt), center, y + bodyHeight * 0.64, { size: Math.min(76, bodyHeight * 0.49, middle * 0.34), color: ink, max: middle - 20, weight: 700, align: "center", face: "poster" });
        }
      });
    };

    /** Lista: zaglavlje po danu, red = vrijeme · grb ime – ime grb, dvorana ispod */
    const list = () => {
      const groups = new Map<string, SocialMatch[]>();
      for (const m of matches) {
        const key = m.status === "postponed" ? "ODGOĐENO" : `${formatWeekday(m.startsAt).toUpperCase()} · ${shortDate(m.date, options.year)}`;
        groups.set(key, [...(groups.get(key) ?? []), m]);
      }
      const headers = groups.size;
      const headerHeight = Math.min(58, available / (matches.length + headers) * 0.7);
      const rowHeight = Math.min(story ? 128 : 112, (available - headers * headerHeight - (headers - 1) * 18) / Math.max(1, matches.length));
      const block = headers * headerHeight + matches.length * rowHeight + (headers - 1) * 18;
      let y = contentTop + Math.max(0, (available - block) / 2) * 0.4;
      const timeWidth = width * 0.17;
      for (const [label, list] of groups) {
        const postponedGroup = label === "ODGOĐENO";
        text(label, margin, y + headerHeight * 0.5, { size: headerHeight * 0.46, color: postponedGroup ? postponedOn(lightPanel || theme.ink === "#0f172a") : theme.accent, max: width, weight: 700, face: postponedGroup ? "mono" : "poster", spacing: postponedGroup ? 0.08 : 0.04 });
        line(margin, y + headerHeight - 2, margin + width, y + headerHeight - 2, theme.accent, 2);
        y += headerHeight;
        list.forEach((m, i) => {
          const cy = y + rowHeight / 2;
          rowSurface(margin, y + 4, width, rowHeight - 8, i === list.length - 1, panelAlpha, Math.min(10, rowHeight * 0.14));
          const pad = 18;
          const nameY = options.showHall && m.status !== "postponed" ? cy - rowHeight * 0.1 : cy;
          if (m.status === "postponed") text("—", margin + pad, cy, { size: rowHeight * 0.36, color: theme.muted, max: timeWidth, weight: 700, face: "poster" });
          else text(formatTime(m.startsAt), margin + pad, cy, { size: rowHeight * 0.4, color: theme.ink, max: timeWidth - pad, weight: 700, face: "poster" });
          const size = options.showLogos ? rowHeight * 0.58 : 0;
          const left = margin + timeWidth;
          const right = margin + width - pad;
          const mid = (left + right) / 2;
          crest(m.home, m.homeLogo, left + size / 2, cy, size);
          crest(m.away, m.awayLogo, right - size / 2, cy, size);
          const nameSize = Math.min(rowHeight * 0.26, 32);
          teamName(m.home, left + size + (size ? 16 : 0), nameY, mid - left - size - 40, nameSize, theme.ink, "left");
          teamName(m.away, right - size - (size ? 16 : 0), nameY, right - mid - size - 40, nameSize, theme.ink, "right");
          text("–", mid, nameY, { size: nameSize, color: theme.muted, max: 30, weight: 600, align: "center", face: "poster" });
          if (options.showHall && m.status !== "postponed") text((m.hall ?? "Dvorana nije određena").toUpperCase(), mid, cy + rowHeight * 0.24, { size: Math.min(rowHeight * 0.14, 17), color: theme.muted, max: right - left - size * 2 - 40, weight: 600, align: "center", spacing: 0.1 });
          y += rowHeight;
        });
        y += 18;
      }
    };

    if (options.layout === "cards") cards();
    else if (options.layout === "list") list();
    else matches.forEach((m, index) => {
      const postponed = m.status === "postponed";
      const row = Math.floor(index / columns);
      const x = margin + (index % columns) * (cardWidth + 16);
      const y = startY + row * (rowHeight + gap);
      const center = x + cardWidth / 2;
      rowSurface(x, y, cardWidth, rowHeight, row === rows - 1, panelAlpha);
      const competition = [m.competition, m.round == null ? null : `${m.round}. kolo`].filter(Boolean).join(" · ").toUpperCase();
      const weekday = postponed ? "" : formatWeekday(m.startsAt).toUpperCase();
      const detail = postponed ? "NOVI TERMIN NAKNADNO" : [`${weekday} ${formatTime(m.startsAt)}`, options.showHall ? (m.hall ?? "Dvorana nije određena").toUpperCase() : null].filter(Boolean).join("  ·  ");
      const postponedColor = lightPanel || theme.ink === "#0f172a" ? "#c81e1e" : "#ff6b6b";

      if (big) {
        // Jedna ili dvije utakmice: veliki grbovi s imenima ispod, datum i termin u sredini
        const crestSize = Math.min(rowHeight * 0.5, cardWidth * 0.24, 250);
        const side = cardWidth * 0.2;
        const nameGap = options.showLogos ? crestSize / 2 + 44 : 0;
        const cy = y + rowHeight / 2 - nameGap / 2 + (showCompetition ? 16 : 0);
        crest(m.home, m.homeLogo, x + side, cy, crestSize);
        crest(m.away, m.awayLogo, x + cardWidth - side, cy, crestSize);
        teamName(m.home, x + side, cy + nameGap, cardWidth * 0.34, 38);
        teamName(m.away, x + cardWidth - side, cy + nameGap, cardWidth * 0.34, 38);
        if (showCompetition) text(competition, center, y + 44, { size: 20, color: theme.muted, max: cardWidth - 80, weight: 600, align: "center", spacing: 0.12 });
        if (postponed) text("ODGOĐENO", center, cy - 14, { size: 44, color: postponedColor, max: cardWidth * 0.27, weight: 700, align: "center", face: "mono", spacing: 0.08 });
        else text(shortDate(m.date, options.year), center, cy - 14, { size: 80, color: theme.ink, max: cardWidth * 0.27, weight: 700, align: "center", face: "poster" });
        const [time, hall] = detail.split("  ·  ");
        text(time, center, cy + 44, { size: 24, color: postponed ? theme.muted : theme.accent, max: cardWidth * 0.28, weight: 700, align: "center", spacing: 0.08 });
        if (hall) text(hall, center, cy + 76, { size: 18, color: theme.muted, max: cardWidth * 0.28, weight: 600, align: "center", spacing: 0.08 });
        return;
      }

      // Red: grb · ime · termin · ime · grb
      const pad = Math.min(24, rowHeight * 0.14);
      const crestSize = options.showLogos ? Math.min(rowHeight * 0.74, 150, cardWidth * 0.13) : 0;
      const middle = cardWidth * (columns > 1 ? 0.34 : 0.3);
      const nameSize = Math.min(rowHeight * 0.22, columns > 1 ? 24 : 34);
      const homeLeft = x + pad + (crestSize ? crestSize + pad : 0);
      const homeRight = center - middle / 2 - 10;
      const awayLeft = center + middle / 2 + 10;
      const awayRight = x + cardWidth - pad - (crestSize ? crestSize + pad : 0);
      const cy = y + rowHeight / 2;
      crest(m.home, m.homeLogo, x + pad + crestSize / 2, cy, crestSize);
      crest(m.away, m.awayLogo, x + cardWidth - pad - crestSize / 2, cy, crestSize);
      teamName(m.home, (homeLeft + homeRight) / 2, cy, homeRight - homeLeft, nameSize);
      teamName(m.away, (awayLeft + awayRight) / 2, cy, awayRight - awayLeft, nameSize);

      const withLabel = showCompetition && rowHeight >= 96;
      const bigY = withLabel ? y + rowHeight * 0.5 : y + rowHeight * 0.43;
      const bigSize = Math.min(rowHeight * (withLabel ? 0.3 : 0.36), 64);
      const smallSize = Math.min(rowHeight * 0.13, 20);
      if (withLabel) text(competition, center, y + rowHeight * 0.2, { size: smallSize * 0.9, color: theme.muted, max: middle, weight: 600, align: "center", spacing: 0.1 });
      if (postponed) text("ODGOĐENO", center, bigY, { size: bigSize * 0.6, color: postponedColor, max: middle, weight: 700, align: "center", face: "mono", spacing: 0.08 });
      else text(shortDate(m.date, options.year), center, bigY, { size: bigSize, color: theme.ink, max: middle, weight: 700, align: "center", face: "poster" });
      text(detail, center, withLabel ? y + rowHeight * 0.79 : y + rowHeight * 0.75, { size: smallSize, color: postponed ? theme.muted : theme.accent, max: middle + 20, weight: 600, align: "center", spacing: 0.06 });
    });
  }

  // ── Rezultati ─────────────────────────────────────────────

  if (content.kind === "results") {
    const matches = content.matches;
    const mixed = new Set(matches.map((m) => `${m.competitionId}|${m.round ?? ""}`)).size > 1;
    const showCompetition = options.showCompetition && mixed;

    /** Lista: zaglavlje po danu, red = grb ime · rezultat · ime grb, dvorana ispod */
    const list = () => {
      const groups = new Map<string, SocialMatch[]>();
      for (const m of matches) {
        const key = `${formatWeekday(m.startsAt).toUpperCase()} · ${shortDate(m.date, options.year)}`;
        groups.set(key, [...(groups.get(key) ?? []), m]);
      }
      const headers = groups.size;
      const headerHeight = Math.min(58, available / (matches.length + headers) * 0.7);
      const rowHeight = Math.min(story ? 128 : 112, (available - headers * headerHeight - (headers - 1) * 18) / Math.max(1, matches.length));
      const block = headers * headerHeight + matches.length * rowHeight + (headers - 1) * 18;
      let y = contentTop + Math.max(0, (available - block) / 2) * 0.4;
      const scoreWidth = width * 0.24;
      for (const [label, list] of groups) {
        text(label, margin, y + headerHeight * 0.5, { size: headerHeight * 0.46, color: theme.accent, max: width, weight: 700, face: "poster", spacing: 0.04 });
        line(margin, y + headerHeight - 2, margin + width, y + headerHeight - 2, theme.accent, 2);
        y += headerHeight;
        list.forEach((m, i) => {
          const cy = y + rowHeight / 2;
          rowSurface(margin, y + 4, width, rowHeight - 8, i === list.length - 1, panelAlpha, Math.min(10, rowHeight * 0.14));
          const pad = 18;
          const hall = hallOf(m);
          const nameY = hall ? cy - rowHeight * 0.1 : cy;
          const size = options.showLogos ? rowHeight * 0.58 : 0;
          const left = margin + pad;
          const right = margin + width - pad;
          const mid = margin + width / 2;
          crest(m.home, m.homeLogo, left + size / 2, cy, size);
          crest(m.away, m.awayLogo, right - size / 2, cy, size);
          const nameSize = Math.min(rowHeight * 0.26, 32);
          const nameMax = mid - scoreWidth / 2 - left - size - (size ? 16 : 0) - 12;
          teamName(m.home, left + size + (size ? 16 : 0), nameY, nameMax, nameSize, theme.ink, "left");
          teamName(m.away, right - size - (size ? 16 : 0), nameY, nameMax, nameSize, theme.ink, "right");
          score(m, mid, nameY, Math.min(rowHeight * 0.38, 46), scoreWidth);
          if (hall) text(hall, mid, cy + rowHeight * 0.26, { size: Math.min(rowHeight * 0.14, 17), color: theme.muted, max: right - left - size * 2 - 40, weight: 600, align: "center", spacing: 0.1 });
          y += rowHeight;
        });
        y += 18;
      }
    };

    if (options.layout === "list") list();
    else {
      const columns = wide && matches.length > 3 ? 2 : 1;
      const rows = Math.ceil(matches.length / columns);
      const gap = hasPanel ? (matches.length > 6 ? 10 : 14) : 0;
      const cap = rows === 1 ? 440 : rows === 2 ? 400 : story ? 230 : 210;
      const rowHeight = Math.min(cap, (available - (rows - 1) * gap) / Math.max(1, rows));
      const block = rows * rowHeight + (rows - 1) * gap;
      const startY = contentTop + Math.max(0, (available - block) / 2) * (matches.length <= 2 ? 1 : 0.35);
      const cardWidth = (width - (columns - 1) * 16) / columns;
      const big = columns === 1 && rowHeight >= 300;
      matches.forEach((m, index) => {
        const row = Math.floor(index / columns);
        const x = margin + (index % columns) * (cardWidth + 16);
        const y = startY + row * (rowHeight + gap);
        const center = x + cardWidth / 2;
        rowSurface(x, y, cardWidth, rowHeight, row === rows - 1, panelAlpha);
        const competition = [m.competition, m.round == null ? null : `${m.round}. kolo`].filter(Boolean).join(" · ").toUpperCase();
        const hall = hallOf(m);

        if (big) {
          // Jedna ili dvije utakmice: veliki grbovi s imenima ispod, rezultat i datum u sredini
          const crestSize = Math.min(rowHeight * 0.5, cardWidth * 0.24, 250);
          const side = cardWidth * 0.2;
          const nameGap = options.showLogos ? crestSize / 2 + 44 : 0;
          const cy = y + rowHeight / 2 - nameGap / 2 + (showCompetition ? 16 : 0);
          crest(m.home, m.homeLogo, x + side, cy, crestSize);
          crest(m.away, m.awayLogo, x + cardWidth - side, cy, crestSize);
          teamName(m.home, x + side, cy + nameGap, cardWidth * 0.34, 38);
          teamName(m.away, x + cardWidth - side, cy + nameGap, cardWidth * 0.34, 38);
          if (showCompetition) text(competition, center, y + 44, { size: 20, color: theme.muted, max: cardWidth - 80, weight: 600, align: "center", spacing: 0.12 });
          score(m, center, cy - 14, 84, cardWidth * 0.3);
          text(dayLabel(m), center, cy + 50, { size: 24, color: theme.accent, max: cardWidth * 0.28, weight: 700, align: "center", spacing: 0.08 });
          if (hall) text(hall, center, cy + 82, { size: 18, color: theme.muted, max: cardWidth * 0.28, weight: 600, align: "center", spacing: 0.08 });
          return;
        }

        // Red: grb · ime · rezultat · ime · grb
        const pad = Math.min(24, rowHeight * 0.14);
        const crestSize = options.showLogos ? Math.min(rowHeight * 0.74, 150, cardWidth * 0.13) : 0;
        const middle = cardWidth * (columns > 1 ? 0.34 : 0.3);
        const nameSize = Math.min(rowHeight * 0.22, columns > 1 ? 24 : 34);
        const homeLeft = x + pad + (crestSize ? crestSize + pad : 0);
        const homeRight = center - middle / 2 - 10;
        const awayLeft = center + middle / 2 + 10;
        const awayRight = x + cardWidth - pad - (crestSize ? crestSize + pad : 0);
        const cy = y + rowHeight / 2;
        crest(m.home, m.homeLogo, x + pad + crestSize / 2, cy, crestSize);
        crest(m.away, m.awayLogo, x + cardWidth - pad - crestSize / 2, cy, crestSize);
        teamName(m.home, (homeLeft + homeRight) / 2, cy, homeRight - homeLeft, nameSize);
        teamName(m.away, (awayLeft + awayRight) / 2, cy, awayRight - awayLeft, nameSize);

        const withLabel = showCompetition && rowHeight >= 96;
        const bigY = withLabel ? y + rowHeight * 0.5 : y + rowHeight * 0.43;
        const bigSize = Math.min(rowHeight * (withLabel ? 0.3 : 0.36), 64);
        const smallSize = Math.min(rowHeight * 0.13, 20);
        if (withLabel) text(competition, center, y + rowHeight * 0.2, { size: smallSize * 0.9, color: theme.muted, max: middle, weight: 600, align: "center", spacing: 0.1 });
        score(m, center, bigY, bigSize, middle);
        const detail = [dayLabel(m), hall].filter(Boolean).join("  ·  ");
        text(detail, center, withLabel ? y + rowHeight * 0.79 : y + rowHeight * 0.75, { size: smallSize, color: theme.accent, max: middle + 20, weight: 600, align: "center", spacing: 0.06 });
      });
    }
  }

  // ── Kolo: odigrano i slijedi ─────────────────────────────────────────────

  if (content.kind === "round") {
    const matches = content.matches;
    const mixed = new Set(matches.map((m) => `${m.competitionId}|${m.round ?? ""}`)).size > 1;
    const showCompetition = options.showCompetition && mixed;
    const now = Date.now();

    /** Sredina reda: rezultat, ODGOĐENO ili datum s terminom (ako je termin prošao, a rezultata nema: rezultat naknadno) */
    const middle = (m: SocialMatch, center: number, y: number, rowHeight: number, max: number, withLabel: boolean, withDay: boolean) => {
      const bigY = withLabel ? y + rowHeight * 0.5 : y + rowHeight * 0.43;
      const bigSize = Math.min(rowHeight * (withLabel ? 0.3 : 0.36), 64);
      const smallSize = Math.min(rowHeight * 0.13, 20);
      const detailY = withLabel ? y + rowHeight * 0.79 : y + rowHeight * 0.75;
      const hall = hallOf(m);
      if (isPlayed(m)) {
        score(m, center, bigY, bigSize, max);
        text([withDay ? dayLabel(m) : null, hall].filter(Boolean).join("  ·  "), center, detailY, { size: smallSize, color: theme.muted, max: max + 20, weight: 600, align: "center", spacing: 0.06 });
      } else if (m.status === "postponed") {
        text("ODGOĐENO", center, bigY, { size: bigSize * 0.6, color: postponedInk, max, weight: 700, align: "center", face: "mono", spacing: 0.08 });
        text("NOVI TERMIN NAKNADNO", center, detailY, { size: smallSize, color: theme.muted, max: max + 20, weight: 600, align: "center", spacing: 0.06 });
      } else {
        const started = new Date(m.startsAt).getTime() <= now;
        text(started ? "–  :  –" : shortDate(m.date, options.year), center, bigY, { size: bigSize, color: started ? theme.muted : theme.ink, max, weight: 700, align: "center", face: "poster" });
        const when = started ? "REZULTAT NAKNADNO" : withDay ? `${formatWeekday(m.startsAt).toUpperCase()} ${formatTime(m.startsAt)}` : formatTime(m.startsAt);
        text([when, started ? null : hall].filter(Boolean).join("  ·  "), center, detailY, { size: smallSize, color: theme.accent, max: max + 20, weight: 600, align: "center", spacing: 0.06 });
      }
    };

    /** Red: grb · ime · sredina · ime · grb */
    const row = (m: SocialMatch, x: number, y: number, cardWidth: number, rowHeight: number, last: boolean, narrow: boolean, withDay = true) => {
      rowSurface(x, y, cardWidth, rowHeight, last, panelAlpha);
      const center = x + cardWidth / 2;
      const pad = Math.min(24, rowHeight * 0.14);
      const crestSize = options.showLogos ? Math.min(rowHeight * 0.74, 150, cardWidth * 0.13) : 0;
      const mid = cardWidth * (narrow ? 0.34 : 0.3);
      const nameSize = Math.min(rowHeight * 0.22, narrow ? 24 : 34);
      const homeLeft = x + pad + (crestSize ? crestSize + pad : 0);
      const homeRight = center - mid / 2 - 10;
      const awayLeft = center + mid / 2 + 10;
      const awayRight = x + cardWidth - pad - (crestSize ? crestSize + pad : 0);
      const cy = y + rowHeight / 2;
      crest(m.home, m.homeLogo, x + pad + crestSize / 2, cy, crestSize);
      crest(m.away, m.awayLogo, x + cardWidth - pad - crestSize / 2, cy, crestSize);
      teamName(m.home, (homeLeft + homeRight) / 2, cy, homeRight - homeLeft, nameSize);
      teamName(m.away, (awayLeft + awayRight) / 2, cy, awayRight - awayLeft, nameSize);
      const withLabel = showCompetition && rowHeight >= 96;
      if (withLabel) {
        const competition = [m.competition, m.round == null ? null : `${m.round}. kolo`].filter(Boolean).join(" · ").toUpperCase();
        text(competition, center, y + rowHeight * 0.2, { size: Math.min(rowHeight * 0.13, 20) * 0.9, color: theme.muted, max: mid, weight: 600, align: "center", spacing: 0.1 });
      }
      middle(m, center, y, rowHeight, mid, withLabel, withDay);
    };

    /** Naslov odjeljka (dan, ODIGRANO, SLIJEDI) s linijom akcenta */
    const header = (label: string, y: number, height: number, color = theme.accent, face: Face = "poster") => {
      text(label, margin, y + height * 0.5, { size: height * 0.46, color, max: width, weight: 700, face, spacing: face === "mono" ? 0.08 : 0.04 });
      line(margin, y + height - 2, margin + width, y + height - 2, theme.accent, 2);
    };

    /** Redovi po grupama, svaka sa svojim naslovom; prazne grupe se preskaču */
    const groups = (list: { label: string; matches: SocialMatch[]; postponed?: boolean }[], cap: number, byDay = false) => {
      const filled = list.filter((g) => g.matches.length);
      const gap = hasPanel ? 10 : 0;
      const groupGap = 22;
      const headerHeight = Math.min(58, available / (matches.length + filled.length) * 0.62);
      const free = available - filled.length * headerHeight - (filled.length - 1) * groupGap - (matches.length - filled.length) * gap;
      const rowHeight = Math.min(cap, free / Math.max(1, matches.length));
      const block = filled.length * headerHeight + matches.length * rowHeight + (matches.length - filled.length) * gap + (filled.length - 1) * groupGap;
      let y = contentTop + Math.max(0, (available - block) / 2) * 0.4;
      for (const group of filled) {
        header(group.label, y, headerHeight, group.postponed ? postponedInk : theme.accent, group.postponed ? "mono" : "poster");
        y += headerHeight;
        group.matches.forEach((m, i) => {
          row(m, margin, y, width, rowHeight, i === group.matches.length - 1, false, !byDay);
          y += rowHeight + (i < group.matches.length - 1 ? gap : 0);
        });
        y += groupGap;
      }
    };

    if (options.layout === "list") {
      // Po danima; odgođene na kraju pod svojim naslovom
      const days = new Map<string, SocialMatch[]>();
      for (const m of matches) {
        const key = m.status === "postponed" && !isPlayed(m) ? "ODGOĐENO" : `${formatWeekday(m.startsAt).toUpperCase()} · ${shortDate(m.date, options.year)}`;
        days.set(key, [...(days.get(key) ?? []), m]);
      }
      groups([...days].map(([label, list]) => ({ label, matches: list, postponed: label === "ODGOĐENO" })), story ? 150 : 132, true);
    } else if (options.layout === "rows") {
      const columns = wide && matches.length > 3 ? 2 : 1;
      const rows = Math.ceil(matches.length / columns);
      const gap = hasPanel ? (matches.length > 6 ? 10 : 14) : 0;
      const rowHeight = Math.min(rows <= 2 ? 300 : story ? 230 : 210, (available - (rows - 1) * gap) / Math.max(1, rows));
      const block = rows * rowHeight + (rows - 1) * gap;
      const startY = contentTop + Math.max(0, (available - block) / 2) * 0.35;
      const cardWidth = (width - (columns - 1) * 16) / columns;
      matches.forEach((m, index) => {
        const r = Math.floor(index / columns);
        row(m, margin + (index % columns) * (cardWidth + 16), startY + r * (rowHeight + gap), cardWidth, rowHeight, r === rows - 1, columns > 1);
      });
    } else {
      const played = matches.filter(isPlayed);
      const rest = matches.filter((m) => !isPlayed(m));
      groups([{ label: "ODIGRANO", matches: played }, { label: "SLIJEDI", matches: rest }], story ? 190 : 170);
    }
  }

  // ── Tabela ─────────────────────────────────────────────

  if (content.kind === "standings") {
    const rows = content.rows;
    const headerHeight = wide ? 40 : 54;
    const board = options.layout === "board";
    const gap = hasPanel && !board ? 5 : 0;
    const rowHeight = Math.min(story ? 96 : 84, (available - headerHeight - 10 - (rows.length - 1) * gap) / Math.max(1, rows.length));
    const tableHeight = headerHeight + 10 + rows.length * rowHeight + (rows.length - 1) * gap;
    const y0 = contentTop + Math.max(0, (available - tableHeight) / 2) * 0.4;
    const logo = options.showLogos ? Math.min(rowHeight * 0.74, 64) : 0;
    // Kolone: #, grb, ekipa (ostatak), brojke
    const numbers = [
      { full: "UTAKMICE", short: "UT", width: 0.105, value: (r: SocialStanding) => String(r.played) },
      { full: "POBJEDE", short: "POB", width: 0.1, value: (r: SocialStanding) => String(r.won) },
      { full: "PORAZI", short: "POR", width: 0.1, value: (r: SocialStanding) => String(r.lost) },
      { full: "KOŠ RAZLIKA", short: "+/-", width: 0.13, value: (r: SocialStanding) => (r.diff > 0 ? `+${formatScore(r.diff)}` : formatScore(r.diff)) },
      { full: "BODOVI", short: "BOD", width: 0.1, value: (r: SocialStanding) => formatScore(r.points) },
    ];
    const rankWidth = width * 0.075;
    const numbersWidth = numbers.reduce((sum, c) => sum + c.width * width, 0);
    const nameX = margin + rankWidth + (logo ? logo + 26 : 8);
    const nameMax = width - numbersWidth - (nameX - margin) - 16;
    const headerSize = wide ? 14 : 17;
    const headerInk = hasPanel && !board ? inkOn(theme.accent) : theme.accent;

    if (board) {
      // Ploča: jedan panel, lijevo blagi sjaj akcenta iza ekipa, redovi razdvojeni tankim linijama
      const pad = 10;
      const bottomY = y0 + tableHeight + pad;
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(margin - pad, y0 - pad, width + pad * 2, bottomY - y0 + pad, 22);
      if (hasPanel) { ctx.globalAlpha = panelAlpha; ctx.fillStyle = theme.panel; ctx.fill(); ctx.globalAlpha = 1; }
      ctx.clip();
      const [r, g, b] = rgbOf(theme.accent);
      const glow = ctx.createLinearGradient(margin, 0, margin + width - numbersWidth, 0);
      glow.addColorStop(0, `rgba(${r},${g},${b},0.30)`);
      glow.addColorStop(1, `rgba(${r},${g},${b},0)`);
      ctx.fillStyle = glow;
      ctx.fillRect(margin - pad, y0 + headerHeight + 6, width - numbersWidth, tableHeight - headerHeight);
      ctx.restore();
      line(margin, y0 + headerHeight + 4, margin + width, y0 + headerHeight + 4, theme.line, 1.5);
    } else if (hasPanel) box(margin, y0, width, headerHeight, theme.accent, Math.min(10, headerHeight * 0.22));
    else line(margin, y0 + headerHeight, margin + width, y0 + headerHeight, theme.accent, 2);
    const hy = y0 + headerHeight / 2;
    text("#", margin + rankWidth / 2, hy, { size: headerSize, color: headerInk, max: rankWidth, weight: 700, align: "center", spacing: 0.1 });
    text("EKIPA", nameX, hy, { size: headerSize, color: headerInk, max: nameMax, weight: 700, spacing: 0.1 });
    // Svi puni nazivi kolona ili sve kratice, nikad mješavina
    const full = numbers.every((column) => measure(column.full, headerSize, 700, "body", 0.1) <= column.width * width - 10);
    let nx = margin + width - numbersWidth;
    for (const column of numbers) {
      const cw = column.width * width;
      const label = full ? column.full : column.short;
      text(label, nx + cw / 2, hy, { size: headerSize, color: headerInk, max: cw - 6, weight: 700, align: "center", spacing: 0.1 });
      nx += cw;
    }

    rows.forEach((r, index) => {
      const y = y0 + headerHeight + 10 + index * (rowHeight + gap);
      const cy = y + rowHeight / 2;
      if (board) { if (index < rows.length - 1) line(margin, y + rowHeight, margin + width, y + rowHeight, theme.line, 1); }
      else rowSurface(margin, y, width, rowHeight, index === rows.length - 1, panelAlpha * (hasPanel && index % 2 ? 0.86 : 1), Math.min(10, rowHeight * 0.16));
      const size = Math.min(rowHeight * 0.44, 38);
      text(`${content.firstRank + index}.`, margin + rankWidth / 2, cy, { size, color: theme.ink, max: rankWidth - 6, weight: 600, align: "center", face: "poster" });
      if (logo) crest(r.name, r.logoUrl, margin + rankWidth + 12 + logo / 2, cy, logo);
      teamName(r.name, nameX, cy, nameMax, size, theme.ink, "left");
      let x = margin + width - numbersWidth;
      numbers.forEach((column, i) => {
        const cw = column.width * width;
        const last = i === numbers.length - 1;
        text(column.value(r), x + cw / 2, cy, { size: last ? size * 1.05 : size * 0.95, color: last ? theme.accent : theme.ink, max: cw - 6, weight: last ? 700 : 500, align: "center", face: "poster" });
        x += cw;
      });
    });
  }

  // ── Klubovi ─────────────────────────────────────────────

  if (content.kind === "clubs" && options.layout === "list") {
    // Lista: jedna ili dvije kolone, grb i ime u redu
    const clubs = content.clubs;
    const cols = clubs.length > 7 && !wide ? 2 : wide && clubs.length > 4 ? 2 : 1;
    const lines = Math.ceil(clubs.length / cols);
    const gapY = hasPanel ? 8 : 0;
    const rowHeight = Math.min(story ? 120 : 104, (available - (lines - 1) * gapY) / Math.max(1, lines));
    const block = lines * rowHeight + (lines - 1) * gapY;
    const y0 = contentTop + Math.max(0, (available - block) / 2) * 0.5;
    const colWidth = (width - (cols - 1) * 20) / cols;
    clubs.forEach((club, i) => {
      const col = Math.floor(i / lines);
      const row = i % lines;
      const x = margin + col * (colWidth + 20);
      const y = y0 + row * (rowHeight + gapY);
      const cy = y + rowHeight / 2;
      rowSurface(x, y, colWidth, rowHeight, row === lines - 1 || i === clubs.length - 1, panelAlpha, Math.min(12, rowHeight * 0.16));
      const size = options.showLogos ? rowHeight * 0.72 : 0;
      crest(club.name, club.logoUrl, x + 16 + size / 2, cy, size);
      teamName(club.name, x + 16 + size + (size ? 22 : 0), cy, colWidth - size - 60, Math.min(rowHeight * 0.32, 36), theme.ink, "left");
    });
  }

  if (content.kind === "clubs" && options.layout !== "list") {
    const clubs = content.clubs;
    const n = Math.max(1, clubs.length);
    const gap = hasPanel ? 14 : 8;
    // Broj kolona koji daje najveću ćeliju (ćelija je malo viša nego šira, zbog imena)
    let best = { columns: 1, cell: 0 };
    for (let columns = 1; columns <= Math.min(8, n); columns++) {
      const rows = Math.ceil(n / columns);
      const cell = Math.min((width - (columns - 1) * gap) / columns, ((available - (rows - 1) * gap) / rows) / 1.18);
      if (cell > best.cell) best = { columns, cell };
    }
    const { columns } = best;
    const cellWidth = Math.min(best.cell, 320);
    const cellHeight = cellWidth * 1.18;
    const rows = Math.ceil(n / columns);
    const gridHeight = rows * cellHeight + (rows - 1) * gap;
    const y0 = contentTop + Math.max(0, (available - gridHeight) / 2);
    clubs.forEach((club, index) => {
      const row = Math.floor(index / columns);
      const inRow = row === rows - 1 ? n - row * columns : columns;
      const rowWidth = inRow * cellWidth + (inRow - 1) * gap;
      const x = (w - rowWidth) / 2 + (index - row * columns) * (cellWidth + gap);
      const y = y0 + row * (cellHeight + gap);
      if (hasPanel) {
        ctx.save();
        ctx.globalAlpha = panelAlpha;
        box(x, y, cellWidth, cellHeight, theme.panel, Math.min(16, cellWidth * 0.08));
        ctx.restore();
      }
      const crestSize = options.showLogos ? cellWidth * 0.6 : 0;
      if (crestSize) crest(club.name, club.logoUrl, x + cellWidth / 2, y + cellHeight * 0.42, crestSize);
      teamName(club.name, x + cellWidth / 2, options.showLogos ? y + cellHeight * 0.85 : y + cellHeight / 2, cellWidth * 0.88, Math.min(cellWidth * 0.11, 32));
    });
  }

  // ── Statistika: MVP, petorka, lideri, top lista ─────────────────────────────────────────────

  if (content.kind === "stats") {
    const season = content.season;
    const darkInk = luminance(theme.ink) > 0.5;
    const [ar, ag, ab] = rgbOf(theme.accent);
    const accentAlpha = (alpha: number) => `rgba(${ar},${ag},${ab},${alpha})`;
    const perGame = season ? " / UT" : "";

    /** Tekst sa sjenom na tamnim predlošcima (preko fotografije) */
    const shadowed = (draw: () => void) => {
      ctx.save();
      if (darkInk) {
        ctx.shadowColor = "rgba(0,0,0,0.55)";
        ctx.shadowBlur = 14;
        ctx.shadowOffsetY = 2;
      }
      draw();
      ctx.restore();
    };

    /** Panel (kartica) na kojoj stoji igrač */
    const panel = (x: number, y: number, pw: number, ph: number, radius: number, highlight = false) => {
      ctx.save();
      ctx.globalAlpha = hasPanel ? panelAlpha : 1;
      box(x, y, pw, ph, hasPanel ? theme.panel : accentAlpha(0.08), radius);
      ctx.restore();
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(x, y, pw, ph, radius);
      ctx.clip();
      const glow = ctx.createLinearGradient(0, y, 0, y + ph);
      glow.addColorStop(0, accentAlpha(highlight ? 0.34 : 0.2));
      glow.addColorStop(0.65, accentAlpha(0));
      ctx.fillStyle = glow;
      ctx.fillRect(x, y, pw, ph);
      ctx.restore();
      ctx.save();
      ctx.strokeStyle = highlight ? theme.accent : accentAlpha(0.35);
      ctx.lineWidth = highlight ? 3 : 1.5;
      ctx.beginPath();
      ctx.roundRect(x + 0.75, y + 0.75, pw - 1.5, ph - 1.5, radius);
      ctx.stroke();
      ctx.restore();
    };

    /** Silueta kad igrač nema fotografiju */
    const silhouette = (x: number, y: number, fw: number, fh: number) => {
      const size = Math.min(fw * 0.7, fh * 0.8);
      const cx = x + fw / 2;
      const base = y + fh;
      ctx.save();
      ctx.fillStyle = accentAlpha(0.28);
      ctx.beginPath();
      ctx.arc(cx, base - size * 0.72, size * 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(cx, base, size * 0.42, size * 0.4, 0, Math.PI, 0);
      ctx.fill();
      ctx.restore();
    };

    /**
     * Igrač u okviru (x, y, fw, fh): izrezana fotografija stoji na dnu okvira i blago se gubi prema dnu; obična
     * fotografija ispuni okvir (lice u gornjoj trećini). `zoom` > 1 krupnije (glava i ramena).
     */
    const figure = (p: SocialStatPlayer, x: number, y: number, fw: number, fh: number, { fade = 0.16, zoom = 1, radius = 0 }: { fade?: number; zoom?: number; radius?: number } = {}) => {
      const own = photos.get(p.id);
      const layer = document.createElement("canvas");
      layer.width = Math.max(1, Math.round(fw));
      layer.height = Math.max(1, Math.round(fh));
      const lctx = layer.getContext("2d");
      if (!lctx || (!own?.cutout && !own?.photo)) {
        silhouette(x, y, fw, fh);
        return;
      }
      lctx.imageSmoothingEnabled = true;
      lctx.imageSmoothingQuality = "high";
      if (own.cutout) {
        const b = visibleBounds(own.cutout);
        // Krupni kadar samo za fotografiju s ramenima; ona koja je samo lice već je krupna
        const near = b.height / b.width >= 1.2 ? zoom : Math.min(zoom, 1.1);
        let scale = (fh * near) / b.height;
        if (b.width * scale > fw * 1.12 * near) scale = (fw * 1.12 * near) / b.width;
        // Mala fotografija s licence (npr. 110 × 150 px) se ne uvećava više od tri puta, inače je samo mrlja
        scale = Math.min(scale, 3);
        const dw = b.width * scale;
        const dh = b.height * scale;
        // Krupni kadar: vrh glave uz gornji rub, višak tijela ispod okvira
        const top = near > 1.1 ? fh * 0.04 : fh - dh;
        lctx.drawImage(own.cutout, b.x, b.y, b.width, b.height, (fw - dw) / 2, top, dw, dh);
      } else if (own.photo) {
        const image = own.photo;
        const scale = Math.max(fw / image.naturalWidth, fh / image.naturalHeight) * zoom;
        const dw = image.naturalWidth * scale;
        const dh = image.naturalHeight * scale;
        lctx.drawImage(image, (fw - dw) / 2, (fh - dh) * 0.28, dw, dh);
      }
      if (fade > 0) {
        lctx.globalCompositeOperation = "destination-in";
        const mask = lctx.createLinearGradient(0, 0, 0, fh);
        mask.addColorStop(0, "rgba(0,0,0,1)");
        mask.addColorStop(1 - fade, "rgba(0,0,0,1)");
        mask.addColorStop(1, "rgba(0,0,0,0)");
        lctx.fillStyle = mask;
        lctx.fillRect(0, 0, fw, fh);
      }
      ctx.save();
      if (radius) {
        ctx.beginPath();
        ctx.roundRect(x, y, fw, fh, radius);
        ctx.clip();
      }
      ctx.drawImage(layer, x, y, fw, fh);
      ctx.restore();
    };

    /** Okrugla fotografija (glava i ramena) s prstenom akcenta */
    const headshot = (p: SocialStatPlayer, cx: number, cy: number, r: number) => {
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = accentAlpha(0.18);
      ctx.fill();
      ctx.clip();
      figure(p, cx - r, cy - r, r * 2, r * 2, { fade: 0, zoom: 1.9 });
      ctx.restore();
      ctx.save();
      ctx.strokeStyle = theme.accent;
      ctx.lineWidth = Math.max(2, r * 0.06);
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    };

    /** Ime: ime manje i prigušeno, prezime veliko (do dva reda) */
    const nameBlock = (p: SocialStatPlayer, x: number, y: number, max: number, size: number, align: CanvasTextAlign = "left") => {
      const first = p.first.toUpperCase();
      const last = (p.last || p.first).toUpperCase();
      let lastSize = size;
      while (measure(last, lastSize, 700, "poster", 0.01) > max && lastSize > size * 0.62) lastSize -= 1;
      const firstSize = Math.max(14, size * 0.42);
      shadowed(() => {
        if (p.last) text(first, x, y, { size: firstSize, color: theme.muted, max, weight: 600, align, face: "poster", spacing: 0.06 });
        text(last, x, y + firstSize * 0.62 + lastSize * 0.56, { size: lastSize, color: theme.ink, max, weight: 700, align, face: "poster", spacing: 0.01 });
      });
      return firstSize * 0.62 + lastSize * 1.1;
    };

    /** Grb i naziv ekipe u redu */
    const teamRow = (p: SocialStatPlayer, x: number, cy: number, max: number, size: number, align: "left" | "center" = "left") => {
      const logo = options.showLogos ? size * 1.5 : 0;
      const label = p.team.toUpperCase();
      const labelWidth = Math.min(measure(label, size, 600, "body", 0.06), max - logo - 10);
      const start = align === "center" ? x - (logo + (logo ? 10 : 0) + labelWidth) / 2 : x;
      if (logo) crest(p.team, p.teamLogo, start + logo / 2, cy, logo);
      shadowed(() => text(label, start + logo + (logo ? 10 : 0), cy, { size, color: theme.muted, max: max - logo - 10, weight: 600, spacing: 0.06 }));
    };

    /** Kolo: "POBJEDA 98:77 · KK VUKOVI"; sezona: "5 UTAKMICA · 31 MIN PO UTAKMICI" */
    const gameLine = (p: SocialStatPlayer) => {
      if (p.game) return `${p.game.won ? "POBJEDA" : "PORAZ"} ${p.game.teamScore}:${p.game.opponentScore} · ${p.game.opponent.toUpperCase()}`;
      const games = p.games % 10 >= 2 && p.games % 10 <= 4 && (p.games % 100 < 12 || p.games % 100 > 14) ? "UTAKMICE" : "UTAKMICA";
      return `${p.games} ${games} · ${Math.round(p.seconds / 60 / Math.max(1, p.games))} MIN PO UTAKMICI`;
    };

    if (content.mode === "mvp") {
      const p = content.player;
      const tiles = (["pts", "reb", "ast", "eff"] as const).map((key) => ({ value: statText(p, key, season), label: `${SOCIAL_STATS.find((s) => s.id === key)!.unit}${perGame}` }));
      const shooting = [
        p.fga ? `ŠUT ${p.fgm}/${p.fga}` : null,
        p.tpa ? `TRICE ${p.tpm}/${p.tpa}` : null,
        p.fta ? `SB ${p.ftm}/${p.fta}` : null,
        p.stl ? `UKR ${season ? statText(p, "stl", true) : p.stl}` : null,
      ].filter(Boolean).join("  ·  ");

      const statsBar = (x: number, y: number, bw: number, bh: number) => {
        panel(x, y, bw, bh, Math.min(20, bh * 0.16), true);
        const cw = bw / tiles.length;
        tiles.forEach((tile, i) => {
          const cx = x + cw * i + cw / 2;
          if (i) line(x + cw * i, y + bh * 0.2, x + cw * i, y + bh * 0.8, theme.line, 1.5);
          text(tile.value, cx, y + bh * 0.42, { size: Math.min(bh * 0.46, cw * 0.42), color: i === 0 ? theme.accent : theme.ink, max: cw - 16, weight: 700, align: "center", face: "poster" });
          text(tile.label, cx, y + bh * 0.78, { size: Math.min(18, bh * 0.13), color: theme.muted, max: cw - 12, weight: 600, align: "center", spacing: 0.1 });
        });
      };

      if (wide) {
        // Široka: igrač lijevo, ime, ekipa i brojke desno
        const photoW = width * 0.4;
        const fx = margin;
        if (p.number) text(p.number, fx + photoW / 2, contentTop + available * 0.45, { size: available * 0.75, color: accentAlpha(0.16), max: photoW, weight: 700, align: "center", face: "poster" });
        figure(p, fx, contentTop, photoW, available + (h - bottom) * 0.6, { fade: 0.12 });
        const tx = margin + photoW + 30;
        const tw = w - margin - tx;
        let ty = contentTop + 30;
        ty += nameBlock(p, tx, ty, tw, 64) + 10;
        teamRow(p, tx, ty + 14, tw, 20);
        text(gameLine(p), tx, ty + 52, { size: 17, color: theme.accent, max: tw, weight: 700, spacing: 0.06 });
        statsBar(tx, bottom - 130, tw, 130);
        if (shooting) text(shooting, tx, bottom - 150, { size: 16, color: theme.muted, max: tw, weight: 600, spacing: 0.06 });
      } else {
        const barH = story ? 230 : options.format === "square" ? 150 : 176;
        const stageBottom = bottom - barH - (story ? 34 : 22);
        const stageH = stageBottom - contentTop;
        // Iza igrača: broj dresa i grb ekipe
        if (p.number) text(p.number, w * 0.66, contentTop + stageH * 0.42, { size: stageH * 0.72, color: accentAlpha(0.14), max: w * 0.6, weight: 700, align: "center", face: "poster" });
        const glow = ctx.createRadialGradient(w * 0.66, contentTop + stageH * 0.55, 10, w * 0.66, contentTop + stageH * 0.55, stageH * 0.7);
        glow.addColorStop(0, accentAlpha(0.32));
        glow.addColorStop(1, accentAlpha(0));
        ctx.fillStyle = glow;
        ctx.fillRect(0, contentTop - 20, w, stageH + 40);
        const fw = w * 0.62;
        figure(p, w - margin - fw + 30, contentTop, fw, stageH + 12, { fade: 0.1 });
        // Ime, ekipa i utakmica dolje lijevo, preko dna fotografije
        const tw = w * 0.58;
        const nameSize = story ? 116 : options.format === "square" ? 84 : 100;
        const blockH = nameSize * 0.42 * 0.62 + nameSize * 1.1 + 92;
        let ty = stageBottom - blockH;
        box(margin, ty - 72, 170, 40, theme.accent, 6);
        text(season ? "SEZONA" : "MVP", margin + 85, ty - 52, { size: 24, color: inkOn(theme.accent), max: 150, weight: 700, align: "center", face: "poster", spacing: 0.12 });
        ty += 8;
        ty += nameBlock(p, margin, ty, tw, nameSize);
        teamRow(p, margin, ty + 18, tw, story ? 24 : 21);
        shadowed(() => text(gameLine(p), margin, ty + 60, { size: story ? 22 : 19, color: theme.accent, max: tw, weight: 700, spacing: 0.06 }));
        statsBar(margin, bottom - barH, width, barH);
        if (shooting) text(shooting, w - margin, ty + 60, { size: story ? 20 : 17, color: theme.muted, max: w * 0.36, weight: 600, align: "right", spacing: 0.06 });
      }
    }

    if (content.mode === "five") {
      const players = content.players;
      const n = players.length;
      const cols = wide ? Math.min(5, n) : story ? 2 : Math.min(3, n);
      const rows = Math.ceil(n / cols);
      const gap = wide ? 16 : 22;
      const cardW = (width - (cols - 1) * gap) / cols;
      const cardH = Math.min((available - (rows - 1) * gap) / rows, cardW * 1.6);
      const y0 = contentTop + Math.max(0, available - rows * cardH - (rows - 1) * gap) / 2;
      players.forEach((p, i) => {
        const row = Math.floor(i / cols);
        const inRow = row === rows - 1 ? n - row * cols : cols;
        const x = (w - (inRow * cardW + (inRow - 1) * gap)) / 2 + (i - row * cols) * (cardW + gap);
        const y = y0 + row * (cardH + gap);
        const radius = Math.min(18, cardW * 0.07);
        panel(x, y, cardW, cardH, radius, i === 0);
        const photoH = cardH * 0.6;
        if (p.number) text(p.number, x + cardW * 0.5, y + photoH * 0.46, { size: photoH * 0.62, color: accentAlpha(0.16), max: cardW, weight: 700, align: "center", face: "poster" });
        figure(p, x + cardW * 0.04, y + 10, cardW * 0.92, photoH - 10, { fade: 0.14, radius: radius });
        const logo = options.showLogos ? Math.min(cardW * 0.2, 64) : 0;
        if (logo) crest(p.team, p.teamLogo, x + cardW - logo / 2 - 10, y + logo / 2 + 10, logo);
        const pad = Math.min(18, cardW * 0.07);
        const nameSize = Math.min(cardW * 0.15, cardH * 0.085, 46);
        let ty = y + photoH + nameSize * 0.2;
        ty += nameBlock(p, x + cardW / 2, ty, cardW - pad * 2, nameSize, "center");
        text(p.team.toUpperCase(), x + cardW / 2, ty + nameSize * 0.1, { size: Math.max(12, nameSize * 0.36), color: theme.muted, max: cardW - pad * 2, weight: 600, align: "center", spacing: 0.06 });
        // Tri brojke u dnu kartice
        const keys = ["pts", "reb", "ast", "eff"] as const;
        const shown = cardW < 230 ? keys.filter((k) => k !== "ast") : keys;
        const statsTop = y + cardH - Math.min(cardH * 0.17, 92);
        const sw = (cardW - pad * 2) / shown.length;
        line(x + pad, statsTop, x + cardW - pad, statsTop, theme.line, 1.5);
        const valueSize = Math.min(sw * 0.42, (y + cardH - statsTop) * 0.44);
        shown.forEach((key, k) => {
          const cx = x + pad + sw * k + sw / 2;
          const stat = SOCIAL_STATS.find((s) => s.id === key)!;
          text(statText(p, key, season), cx, statsTop + (y + cardH - statsTop) * 0.42, { size: valueSize, color: key === "eff" ? theme.accent : theme.ink, max: sw - 6, weight: 700, align: "center", face: "poster" });
          text(stat.short, cx, statsTop + (y + cardH - statsTop) * 0.78, { size: Math.max(11, valueSize * 0.34), color: theme.muted, max: sw - 6, weight: 600, align: "center", spacing: 0.1 });
        });
      });
    }

    if (content.mode === "leaders") {
      const categories = content.categories.filter((c) => c.players.length);
      const n = Math.max(1, categories.length);
      const cols = wide ? Math.min(3, n) : n <= 2 ? 1 : 2;
      const rows = Math.ceil(n / cols);
      const gap = wide ? 14 : 18;
      const tileW = (width - (cols - 1) * gap) / cols;
      const tileH = Math.min((available - (rows - 1) * gap) / rows, tileW * 0.9);
      const y0 = contentTop + Math.max(0, available - rows * tileH - (rows - 1) * gap) / 2;
      categories.forEach((category, i) => {
        const [leader, ...rest] = category.players;
        const stat = SOCIAL_STATS.find((s) => s.id === category.key)!;
        const row = Math.floor(i / cols);
        const inRow = row === rows - 1 ? n - row * cols : cols;
        const x = (w - (inRow * tileW + (inRow - 1) * gap)) / 2 + (i - row * cols) * (tileW + gap);
        const y = y0 + row * (tileH + gap);
        const radius = Math.min(18, tileH * 0.08);
        panel(x, y, tileW, tileH, radius);
        const pad = Math.min(22, tileW * 0.05);
        // Igrač desno, do dna pločice
        const fw = tileW * 0.46;
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(x, y, tileW, tileH, radius);
        ctx.clip();
        figure(leader, x + tileW - fw - pad * 0.2, y + tileH * 0.12, fw, tileH * 0.88, { fade: 0.12 });
        ctx.restore();
        const tw = tileW - fw - pad;
        const label = Math.min(26, tileH * 0.085);
        text(stat.label.toUpperCase(), x + pad, y + pad + label * 0.5, { size: label, color: theme.accent, max: tileW - pad * 2, weight: 700, face: "poster", spacing: 0.06 });
        const valueSize = Math.min(tileH * 0.27, tw * 0.5);
        const vy = y + pad + label + valueSize * 0.6;
        shadowed(() => text(statText(leader, category.key, season), x + pad, vy, { size: valueSize, color: theme.ink, max: tw, weight: 700, face: "poster" }));
        text(`${stat.unit}${season ? " PO UTAKMICI" : ""}`, x + pad, vy + valueSize * 0.58, { size: Math.max(11, label * 0.62), color: theme.muted, max: tw, weight: 600, spacing: 0.1 });
        const nameSize = Math.min(tileH * 0.1, 34);
        let ny = vy + valueSize * 0.58 + nameSize * 1.1;
        ny += nameBlock(leader, x + pad, ny, tw, nameSize);
        teamRow(leader, x + pad, ny + nameSize * 0.2, tw, Math.max(11, nameSize * 0.42));
        // Drugi i treći
        const small = Math.max(12, Math.min(18, tileH * 0.058));
        rest.slice(0, 2).forEach((q, k) => {
          const ry = y + tileH - pad - (rest.slice(0, 2).length - 1 - k) * small * 1.5 - small * 0.3;
          text(`${k + 2}. ${(q.last || q.first).toUpperCase()}`, x + pad, ry, { size: small, color: theme.muted, max: tw - 70, weight: 600, spacing: 0.04 });
          shadowed(() => text(statText(q, category.key, season), x + tw - pad, ry, { size: small, color: theme.ink, max: 60, weight: 700, align: "right", face: "poster" }));
        });
      });
    }

    if (content.mode === "top") {
      const players = content.players;
      const stat = SOCIAL_STATS.find((s) => s.id === content.key)!;
      const n = Math.max(1, players.length);
      const gap = hasPanel ? 8 : 0;
      const rowH = Math.min(story ? 150 : wide ? 70 : 118, (available - (n - 1) * gap) / n);
      const y0 = contentTop + Math.max(0, available - n * rowH - (n - 1) * gap) * 0.35;
      const valueW = width * 0.2;
      players.forEach((p, i) => {
        const y = y0 + i * (rowH + gap);
        const cy = y + rowH / 2;
        const top = i === 0 && content.firstRank === 1;
        rowSurface(margin, y, width, rowH, i === n - 1, panelAlpha * (hasPanel && i % 2 ? 0.88 : 1), Math.min(12, rowH * 0.16));
        if (top) box(margin, y, 6, rowH, theme.accent, 3);
        const rankW = rowH * 0.8;
        text(String(content.firstRank + i), margin + rankW / 2, cy, { size: rowH * 0.42, color: top ? theme.accent : theme.muted, max: rankW, weight: 700, align: "center", face: "poster" });
        const r = rowH * 0.38;
        headshot(p, margin + rankW + r, cy, r);
        const nx = margin + rankW + r * 2 + 20;
        const nameMax = width - (nx - margin) - valueW - 10;
        const nameSize = Math.min(rowH * 0.3, 40);
        const name = `${p.first.toUpperCase()} ${(p.last || "").toUpperCase()}`.trim();
        text(name, nx, cy - rowH * 0.13, { size: nameSize, color: theme.ink, max: nameMax, weight: 700, face: "poster", spacing: 0.01 });
        const logo = options.showLogos ? rowH * 0.24 : 0;
        if (logo) crest(p.team, p.teamLogo, nx + logo / 2, cy + rowH * 0.22, logo);
        const detail = [p.team.toUpperCase(), season ? `${p.games} UT` : p.game ? `${p.game.teamScore}:${p.game.opponentScore} ${p.game.opponent.toUpperCase()}` : null].filter(Boolean).join("  ·  ");
        text(detail, nx + logo + (logo ? 8 : 0), cy + rowH * 0.22, { size: Math.min(rowH * 0.15, 19), color: theme.muted, max: nameMax - logo - 8, weight: 600, spacing: 0.05 });
        text(statText(p, content.key, season), margin + width - 24, cy - rowH * 0.06, { size: rowH * 0.46, color: top ? theme.accent : theme.ink, max: valueW, weight: 700, align: "right", face: "poster" });
        text(`${stat.short}${perGame}`, margin + width - 24, cy + rowH * 0.3, { size: Math.min(rowH * 0.13, 16), color: theme.muted, max: valueW, weight: 600, align: "right", spacing: 0.1 });
      });
    }
  }

  // ── Podnožje ─────────────────────────────────────────────

  if (options.footer.trim()) {
    const footer = options.footer.trim().toUpperCase();
    text(footer, w / 2, footerY, { size: wide ? 14 : 17, color: theme.headerMuted, max: w - margin * 2 - 160, weight: 600, align: "center", spacing: 0.16 });
  }
  if (pages > 1) text(`${page + 1} / ${pages}`, w - margin, footerY, { size: wide ? 15 : 18, color: theme.headerMuted, max: 90, weight: 700, align: "right" });

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((value) => value ? resolve(value) : reject(new Error("Slika nije mogla biti sačuvana.")), "image/png");
  });
  return { blob, missingLogos: loaded.filter(([, logo]) => !logo).length };
}

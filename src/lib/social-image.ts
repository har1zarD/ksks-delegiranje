import type { SocialMatch } from "@/lib/data/social";
import { formatTime, formatWeekday } from "@/lib/format";
import { A1_ZENE_ID } from "@/lib/a1-zene-raspored";
import { A2_JUG_ID } from "@/lib/a2-jug-raspored";

export const SOCIAL_FORMATS = [
  { id: "portrait", name: "Objava · 4:5", detail: "Instagram / Facebook", width: 1080, height: 1350 },
  { id: "square", name: "Kvadrat · 1:1", detail: "Instagram / Facebook", width: 1080, height: 1080 },
  { id: "story", name: "Story · 9:16", detail: "Instagram / Facebook", width: 1080, height: 1920 },
  { id: "landscape", name: "Široka objava", detail: "Facebook", width: 1200, height: 630 },
] as const;

export const KSKS_LOGO = "/brand/ksks-logo-512.png";

/** Savez u zaglavlju slike; KSBIH lige (A1 žene, A2 jug) imaju i grb saveza kao vodeni žig na predlošcima s pozadinom */
export const SOCIAL_BRANDS = {
  ksks: { logo: KSKS_LOGO, name: "KSKS", lines: ["KOŠARKAŠKI SAVEZ", "KANTONA SARAJEVO"], footer: "Košarkaški savez Kantona Sarajevo", watermark: false },
  ksbih: { logo: "/competitions/ksbih.png", name: "KSBIH", lines: ["KOŠARKAŠKI SAVEZ", "BOSNE I HERCEGOVINE"], footer: "Košarkaški savez Bosne i Hercegovine", watermark: true },
} as const;

/** Savez čije je takmičenje: A2 jug i A1 žene su KSBIH lige, ostalo (i više takmičenja na slici) KSKS */
export function brandOf(competitionId: string): SocialBrand {
  return competitionId === A2_JUG_ID || competitionId === A1_ZENE_ID ? "ksbih" : "ksks";
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
  /** Podloga slike; prozirni predlošci je nemaju (PNG s providnom pozadinom, za vlastiti dizajn) */
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
  transparent?: boolean;
  /** Blaga sjena ispod teksta, da bijeli tekst ostane čitljiv na svijetlom dijelu tuđe pozadine */
  shadow?: boolean;
};

export const SOCIAL_TEMPLATES = [
  // Prozirni: samo sadržaj, pozadinu dodaješ u svom dizajnu
  { id: "glass", name: "Tamno staklo", description: "Prozirno · tamne trake, zlatni detalji", bg: "transparent", panel: "rgba(9,11,17,0.62)", ink: "#ffffff", muted: "rgba(255,255,255,0.68)", accent: "#f2c14e", line: "rgba(255,255,255,0.14)", background: null, overlay: "transparent", headerInk: "#ffffff", headerMuted: "rgba(255,255,255,0.8)", transparent: true, shadow: true },
  { id: "frost", name: "Svijetlo staklo", description: "Prozirno · bijele trake, tamni tekst", bg: "transparent", panel: "rgba(255,255,255,0.86)", ink: "#0f172a", muted: "#536074", accent: "#2457d6", line: "rgba(15,23,42,0.10)", background: null, overlay: "transparent", headerInk: "#ffffff", headerMuted: "rgba(255,255,255,0.86)", transparent: true, shadow: true },
  { id: "white-type", name: "Bijeli tekst", description: "Prozirno · bez traka, tanke linije", bg: "transparent", panel: "transparent", ink: "#ffffff", muted: "rgba(255,255,255,0.74)", accent: "#ff9a3d", line: "rgba(255,255,255,0.30)", background: null, overlay: "transparent", headerInk: "#ffffff", headerMuted: "rgba(255,255,255,0.82)", transparent: true, shadow: true },
  { id: "dark-type", name: "Tamni tekst", description: "Prozirno · za svijetle pozadine", bg: "transparent", panel: "transparent", ink: "#0f172a", muted: "#4b5567", accent: "#c2410c", line: "rgba(15,23,42,0.18)", background: null, overlay: "transparent", headerInk: "#0f172a", headerMuted: "#4b5567", transparent: true },
  { id: "ember", name: "Žar", description: "Prozirno · crne trake, narandžasti akcent", bg: "transparent", panel: "rgba(0,0,0,0.70)", ink: "#ffffff", muted: "rgba(255,255,255,0.66)", accent: "#ff7a1a", line: "rgba(255,122,26,0.55)", background: null, overlay: "transparent", headerInk: "#ffffff", headerMuted: "rgba(255,255,255,0.82)", transparent: true, shadow: true },
  // S pozadinom
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
  { id: "derby", name: "Derbi večer", description: "Bordo dvorana za velike susrete", bg: "#3e1019", panel: "rgba(49,12,23,0.93)", ink: "#ffffff", muted: "#ebc9cf", accent: "#ffc18c", line: "#80505b", background: ARENA, overlay: "rgba(65,6,20,0.65)", headerInk: "#ffffff", headerMuted: "#f5d7dc" },
] as const satisfies readonly Template[];

/** Boja akcenta preko predloška (prazno = boja predloška), da slika prati boje tvoje pozadine */
export const SOCIAL_ACCENTS = [
  { id: "", name: "Iz predloška" },
  { id: "#f2c14e", name: "Zlatna" },
  { id: "#ff7a1a", name: "Narandžasta" },
  { id: "#f2545b", name: "Crvena" },
  { id: "#4aa8ff", name: "Plava" },
  { id: "#34d399", name: "Zelena" },
  { id: "#ffffff", name: "Bijela" },
] as const;

/** Raspored elemenata na slici, po vrsti slike */
export const SOCIAL_LAYOUTS = {
  schedule: [
    { id: "rows", name: "Trake", description: "Grb, ime, termin, ime, grb" },
    { id: "cards", name: "Kartice", description: "Svijetle kartice i veliko vrijeme" },
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
} as const;

export type SocialFormat = (typeof SOCIAL_FORMATS)[number]["id"];
export type SocialTemplate = (typeof SOCIAL_TEMPLATES)[number]["id"];
export type SocialBrand = keyof typeof SOCIAL_BRANDS;
export type SocialKind = "schedule" | "standings" | "clubs";

/** Izgled: zajednički za sve vrste slika */
export type SocialDesignOptions = {
  format: SocialFormat;
  template: SocialTemplate;
  accent: string;
  showBrand: boolean;
  showLogos: boolean;
  /** Grb na bijeloj pločici (za grbove s bijelom pozadinom) */
  crestTiles: boolean;
  showHall: boolean;
  showCompetition: boolean;
};

/** Tekst i raspored elemenata: svaka vrsta slike ima svoj */
export type SocialTextOptions = { brand: SocialBrand; title: string; subtitle: string; footer: string; layout: string };

export type SocialOptions = SocialDesignOptions & SocialTextOptions;

export type SocialStanding = { teamId: string; name: string; logoUrl: string | null; played: number; won: number; lost: number; diff: number; points: number };
export type SocialClub = { id: string; name: string; logoUrl: string | null };

export type SocialContent =
  | { kind: "schedule"; matches: SocialMatch[] }
  | { kind: "standings"; rows: SocialStanding[]; firstRank: number }
  | { kind: "clubs"; clubs: SocialClub[] };

export function templateOf(id: SocialTemplate): Template {
  return SOCIAL_TEMPLATES.find((t) => t.id === id)!;
}

export function contentSize(content: SocialContent) {
  return content.kind === "schedule" ? content.matches.length : content.kind === "standings" ? content.rows.length : content.clubs.length;
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

/** Akcent dovoljno taman za tekst na bijeloj kartici */
function deepen(hex: string) {
  const l = luminance(hex);
  if (l > 0.8) return "#111827";
  const t = l > 0.45 ? 0.5 : l > 0.2 ? 0.25 : 0;
  const [r, g, b] = rgbOf(hex).map((v) => Math.round(v * (1 - t)));
  return `rgb(${r}, ${g}, ${b})`;
}

const shortDate = (date: string) => {
  const [, m, d] = date.split("-");
  return `${d}.${m}.`;
};

const logoUrls = (content: SocialContent) =>
  content.kind === "schedule" ? content.matches.flatMap((m) => [m.homeLogo, m.awayLogo])
    : content.kind === "standings" ? content.rows.map((r) => r.logoUrl)
    : content.clubs.map((c) => c.logoUrl);

/**
 * Slika za objavu (PNG). `posterFont` je uski sportski font za naslove, imena i brojeve; ostalo je font aplikacije.
 * Prozirni predlošci daju PNG bez pozadine, da ga staviš preko svog dizajna.
 */
export async function renderSocialImage(content: SocialContent, options: SocialOptions, page: number, pages: number, posterFont: string) {
  const format = SOCIAL_FORMATS.find((f) => f.id === options.format)!;
  const base = templateOf(options.template);
  const theme = { ...base, accent: options.accent || base.accent };
  const brand = SOCIAL_BRANDS[options.brand];
  const body = getComputedStyle(document.body).fontFamily;
  const poster = posterFont || body;
  const mono = getComputedStyle(document.body).getPropertyValue("--font-geist-mono").trim() || "monospace";
  const urls = options.showLogos ? [...new Set(logoUrls(content).filter((url): url is string => Boolean(url)))] : [];
  const [loaded, brandLogo, background] = await Promise.all([
    Promise.all(urls.map(async (url) => [url, await loadImage(url)] as const)),
    loadImage(brand.logo),
    theme.background ? loadImage(theme.background) : Promise.resolve(null),
    document.fonts.load(`700 40px ${poster}`, "ČĆŠĐŽčćšđž0123456789"),
    document.fonts.load(`500 40px ${poster}`, "ČĆŠĐŽčćšđž0123456789"),
    document.fonts.load(`600 24px ${body}`, "ČĆŠĐŽčćšđž"),
    document.fonts.load(`700 36px ${mono}`, "ODGOĐENO"),
  ]);
  if (!brandLogo) throw new Error(`${brand.name} logo nije učitan. Osvježi stranicu i pokušaj ponovo.`);
  if (theme.background && !background) throw new Error("Pozadina predloška nije učitana. Osvježi stranicu i pokušaj ponovo.");
  const logos = new Map(loaded);
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

  type TextStyle = { size: number; color: string; max: number; weight?: number; align?: CanvasTextAlign; face?: Face; spacing?: number; shadow?: boolean };

  type Face = "poster" | "body" | "mono";
  function setFont(size: number, weight: number, face: Face, spacing: number) {
    ctx!.font = `${weight} ${size}px ${face === "poster" ? poster : face === "mono" ? mono : body}`;
    if ("letterSpacing" in ctx!) (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${spacing * size}px`;
  }

  /** Tekst koji se smanji (do 70%) da stane u `max`; sjena samo na prozirnim predlošcima bez trake ili u zaglavlju */
  function text(value: string, x: number, y: number, { size, color, max, weight = 600, align = "left", face = "body", spacing = 0, shadow = false }: TextStyle) {
    let fitted = size;
    setFont(fitted, weight, face, spacing);
    while (ctx!.measureText(value).width > max && fitted > size * 0.7) {
      fitted -= 1;
      setFont(fitted, weight, face, spacing);
    }
    ctx!.save();
    if (shadow && theme.shadow) {
      ctx!.shadowColor = "rgba(0,0,0,0.45)";
      ctx!.shadowBlur = Math.max(6, fitted * 0.35);
      ctx!.shadowOffsetY = Math.max(1, fitted * 0.05);
    }
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
    const style = { size, color, max, weight: 600, align, face: "poster" as const, spacing: 0.01, shadow: !hasPanel };
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
      ctx!.save();
      if (!options.crestTiles && !hasPanel && theme.shadow) {
        ctx!.shadowColor = "rgba(0,0,0,0.35)";
        ctx!.shadowBlur = size * 0.08;
      }
      contain(logo, x, y, size, options.crestTiles ? size * 0.08 : 0);
      ctx!.restore();
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

  if (!theme.transparent) {
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
  }

  // ── Zaglavlje: savez lijevo, naslov u sredini, podnaslov između dvije linije akcenta ─────

  const top = story ? 170 : wide ? 34 : 54;
  const brandSize = wide ? 70 : 84;
  let cursor = top;
  if (options.showBrand) {
    if (theme.transparent || !background) {
      contain(brandLogo, margin, top, brandSize, 0, true);
    } else {
      box(margin, top, brandSize, brandSize, "#ffffff", 14);
      contain(brandLogo, margin, top, brandSize, 6, options.brand === "ksbih");
    }
    const bx = margin + brandSize + 20;
    box(bx, top + brandSize * 0.18, 3, brandSize * 0.64, theme.accent, 1.5);
    text(brand.lines[0], bx + 16, top + brandSize * 0.38, { size: wide ? 15 : 17, color: theme.headerMuted, max: 360, weight: 600, spacing: 0.08, shadow: true });
    text(brand.lines[1], bx + 16, top + brandSize * 0.64, { size: wide ? 15 : 17, color: theme.headerMuted, max: 360, weight: 600, spacing: 0.08, shadow: true });
    cursor = top + (wide ? 0 : brandSize + 22);
  }

  const title = options.title.trim().toUpperCase();
  const subtitle = options.subtitle.trim().toUpperCase();
  if (wide) {
    // Široka: naslov desno od saveza, u istom redu
    const tx = options.showBrand ? 470 : margin;
    if (title) text(title, tx, top + (subtitle ? 26 : brandSize / 2), { size: 50, color: theme.headerInk, max: w - tx - margin, weight: 700, face: "poster", spacing: 0.01, shadow: true });
    if (subtitle) text(subtitle, tx, top + 66, { size: 20, color: theme.headerMuted, max: w - tx - margin, weight: 600, spacing: 0.12, shadow: true });
    cursor = top + brandSize + 22;
  } else {
    const titleSize = story ? 112 : options.format === "square" ? 84 : 96;
    if (title) {
      text(title, w / 2, cursor + titleSize * 0.55, { size: titleSize, color: theme.headerInk, max: w - margin * 2, weight: 700, align: "center", face: "poster", spacing: 0.01, shadow: true });
      cursor += titleSize * 1.12;
    }
    if (subtitle) {
      const size = story ? 30 : 25;
      const width = Math.min(measure(subtitle, size, 600, "body", 0.14), w - margin * 2 - 180);
      const y = cursor + size * 0.6;
      text(subtitle, w / 2, y, { size, color: theme.headerMuted, max: width, weight: 600, align: "center", spacing: 0.14, shadow: true });
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

  const footerY = h - (story ? 150 : wide ? 26 : 42);
  const contentTop = cursor;
  const bottom = footerY - (wide ? 22 : 36);
  const available = bottom - contentTop;
  const width = w - margin * 2;

  // Vodeni žig saveza (KSBIH) samo na predlošcima s pozadinom
  if (brand.watermark && !theme.transparent) {
    const size = Math.min(width, available) * 0.9;
    ctx.save();
    ctx.globalAlpha = background ? 0.22 : 0.1;
    contain(brandLogo, (w - size) / 2, contentTop + (available - size) / 2, size);
    ctx.restore();
  }
  const panelAlpha = brand.watermark && !theme.transparent ? 0.8 : 1;

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

    /** Kartice: imena iznad, svijetla kartica s grbovima na krajevima, dan i datum, veliko vrijeme */
    const cards = () => {
      const cols = wide && matches.length > 3 ? 2 : 1;
      const lines = Math.ceil(matches.length / cols);
      const slot = available / lines;
      const labelHeight = Math.min(38, slot * 0.24);
      const gapY = Math.min(16, slot * 0.07);
      const cardHeight = Math.min(slot - labelHeight - gapY, story ? 200 : 176);
      const slotHeight = labelHeight + cardHeight;
      const block = lines * slotHeight + (lines - 1) * gapY;
      const y0 = contentTop + Math.max(0, (available - block) / 2) * 0.5;
      const colWidth = (width - (cols - 1) * 24) / cols;
      const inset = cols > 1 ? 0 : width * 0.06;
      const timeColor = deepen(theme.accent);
      matches.forEach((m, i) => {
        const postponed = m.status === "postponed";
        const x = margin + (i % cols) * (colWidth + 24) + inset;
        const cardWidth = colWidth - inset * 2;
        const y = y0 + Math.floor(i / cols) * (slotHeight + gapY);
        const center = x + cardWidth / 2;
        text(`${m.home}  –  ${m.away}`.toUpperCase(), center, y + labelHeight * 0.45, { size: Math.min(labelHeight * 0.5, 18), color: theme.headerMuted, max: cardWidth, weight: 600, align: "center", spacing: 0.2, shadow: true });
        const cy = y + labelHeight;
        ctx.save();
        ctx.shadowColor = "rgba(0,0,0,0.32)";
        ctx.shadowBlur = cardHeight * 0.16;
        ctx.shadowOffsetY = cardHeight * 0.04;
        const fill = ctx.createLinearGradient(0, cy, 0, cy + cardHeight);
        fill.addColorStop(0, "#ffffff");
        fill.addColorStop(1, "#e2e6ee");
        box(x, cy, cardWidth, cardHeight, fill, cardHeight * 0.24);
        ctx.restore();
        const size = options.showLogos ? cardHeight * 0.84 : 0;
        crest(m.home, m.homeLogo, x + cardHeight * 0.1 + size / 2, cy + cardHeight / 2, size, "#1f2937", "rgba(15,23,42,0.2)");
        crest(m.away, m.awayLogo, x + cardWidth - cardHeight * 0.1 - size / 2, cy + cardHeight / 2, size, "#1f2937", "rgba(15,23,42,0.2)");
        const middle = cardWidth - (size + cardHeight * 0.2) * 2 - 20;
        const hall = options.showHall && !postponed;
        const dateY = cy + cardHeight * (hall ? 0.24 : 0.29);
        const bigY = cy + cardHeight * (hall ? 0.55 : 0.63);
        const dateLine = postponed ? "NOVI TERMIN NAKNADNO" : `${formatWeekday(m.startsAt).toUpperCase()} ${shortDate(m.date)}`;
        text(dateLine, center, dateY, { size: cardHeight * 0.15, color: "#1f2937", max: middle, weight: 600, align: "center", face: "poster", spacing: 0.06 });
        if (postponed) text("ODGOĐENO", center, bigY, { size: cardHeight * 0.26, color: postponedOn(true), max: middle, weight: 700, align: "center", face: "mono", spacing: 0.08 });
        else text(formatTime(m.startsAt), center, bigY, { size: cardHeight * 0.42, color: timeColor, max: middle, weight: 700, align: "center", face: "poster" });
        if (hall) text((m.hall ?? "Dvorana nije određena").toUpperCase(), center, cy + cardHeight * 0.85, { size: cardHeight * 0.095, color: "#5b6474", max: middle, weight: 600, align: "center", spacing: 0.1 });
      });
    };

    /** Lista: zaglavlje po danu, red = vrijeme · grb ime – ime grb, dvorana ispod */
    const list = () => {
      const groups = new Map<string, SocialMatch[]>();
      for (const m of matches) {
        const key = m.status === "postponed" ? "ODGOĐENO" : `${formatWeekday(m.startsAt).toUpperCase()} · ${shortDate(m.date)}`;
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
        text(label, margin, y + headerHeight * 0.5, { size: headerHeight * 0.46, color: postponedGroup ? postponedOn(lightPanel || theme.ink === "#0f172a") : theme.accent, max: width, weight: 700, face: postponedGroup ? "mono" : "poster", spacing: postponedGroup ? 0.08 : 0.04, shadow: true });
        line(margin, y + headerHeight - 2, margin + width, y + headerHeight - 2, theme.accent, 2);
        y += headerHeight;
        list.forEach((m, i) => {
          const cy = y + rowHeight / 2;
          rowSurface(margin, y + 4, width, rowHeight - 8, i === list.length - 1, panelAlpha, Math.min(10, rowHeight * 0.14));
          const pad = 18;
          const nameY = options.showHall && m.status !== "postponed" ? cy - rowHeight * 0.1 : cy;
          if (m.status === "postponed") text("—", margin + pad, cy, { size: rowHeight * 0.36, color: theme.muted, max: timeWidth, weight: 700, face: "poster", shadow: !hasPanel });
          else text(formatTime(m.startsAt), margin + pad, cy, { size: rowHeight * 0.4, color: theme.ink, max: timeWidth - pad, weight: 700, face: "poster", shadow: !hasPanel });
          const size = options.showLogos ? rowHeight * 0.58 : 0;
          const left = margin + timeWidth;
          const right = margin + width - pad;
          const mid = (left + right) / 2;
          crest(m.home, m.homeLogo, left + size / 2, cy, size);
          crest(m.away, m.awayLogo, right - size / 2, cy, size);
          const nameSize = Math.min(rowHeight * 0.26, 32);
          teamName(m.home, left + size + (size ? 16 : 0), nameY, mid - left - size - 40, nameSize, theme.ink, "left");
          teamName(m.away, right - size - (size ? 16 : 0), nameY, right - mid - size - 40, nameSize, theme.ink, "right");
          text("–", mid, nameY, { size: nameSize, color: theme.muted, max: 30, weight: 600, align: "center", face: "poster", shadow: !hasPanel });
          if (options.showHall && m.status !== "postponed") text((m.hall ?? "Dvorana nije određena").toUpperCase(), mid, cy + rowHeight * 0.24, { size: Math.min(rowHeight * 0.14, 17), color: theme.muted, max: right - left - size * 2 - 40, weight: 600, align: "center", spacing: 0.1, shadow: !hasPanel });
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
        if (showCompetition) text(competition, center, y + 44, { size: 20, color: theme.muted, max: cardWidth - 80, weight: 600, align: "center", spacing: 0.12, shadow: !hasPanel });
        if (postponed) text("ODGOĐENO", center, cy - 14, { size: 44, color: postponedColor, max: cardWidth * 0.27, weight: 700, align: "center", face: "mono", spacing: 0.08, shadow: !hasPanel });
        else text(shortDate(m.date), center, cy - 14, { size: 80, color: theme.ink, max: cardWidth * 0.27, weight: 700, align: "center", face: "poster", shadow: !hasPanel });
        const [time, hall] = detail.split("  ·  ");
        text(time, center, cy + 44, { size: 24, color: postponed ? theme.muted : theme.accent, max: cardWidth * 0.28, weight: 700, align: "center", spacing: 0.08, shadow: !hasPanel });
        if (hall) text(hall, center, cy + 76, { size: 18, color: theme.muted, max: cardWidth * 0.28, weight: 600, align: "center", spacing: 0.08, shadow: !hasPanel });
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
      if (withLabel) text(competition, center, y + rowHeight * 0.2, { size: smallSize * 0.9, color: theme.muted, max: middle, weight: 600, align: "center", spacing: 0.1, shadow: !hasPanel });
      if (postponed) text("ODGOĐENO", center, bigY, { size: bigSize * 0.6, color: postponedColor, max: middle, weight: 700, align: "center", face: "mono", spacing: 0.08, shadow: !hasPanel });
      else text(shortDate(m.date), center, bigY, { size: bigSize, color: theme.ink, max: middle, weight: 700, align: "center", face: "poster", shadow: !hasPanel });
      text(detail, center, withLabel ? y + rowHeight * 0.79 : y + rowHeight * 0.75, { size: smallSize, color: postponed ? theme.muted : theme.accent, max: middle + 20, weight: 600, align: "center", spacing: 0.06, shadow: !hasPanel });
    });
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
      { full: "KOŠ RAZLIKA", short: "+/-", width: 0.13, value: (r: SocialStanding) => (r.diff > 0 ? `+${r.diff}` : String(r.diff)) },
      { full: "BODOVI", short: "BOD", width: 0.1, value: (r: SocialStanding) => String(r.points) },
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
      text(`${content.firstRank + index}.`, margin + rankWidth / 2, cy, { size, color: theme.ink, max: rankWidth - 6, weight: 600, align: "center", face: "poster", shadow: !hasPanel });
      if (logo) crest(r.name, r.logoUrl, margin + rankWidth + 12 + logo / 2, cy, logo);
      teamName(r.name, nameX, cy, nameMax, size, theme.ink, "left");
      let x = margin + width - numbersWidth;
      numbers.forEach((column, i) => {
        const cw = column.width * width;
        const last = i === numbers.length - 1;
        text(column.value(r), x + cw / 2, cy, { size: last ? size * 1.05 : size * 0.95, color: last ? theme.accent : theme.ink, max: cw - 6, weight: last ? 700 : 500, align: "center", face: "poster", shadow: !hasPanel });
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

  // ── Podnožje ─────────────────────────────────────────────

  if (options.footer.trim()) {
    const footer = options.footer.trim().toUpperCase();
    text(footer, w / 2, footerY, { size: wide ? 14 : 17, color: theme.headerMuted, max: w - margin * 2 - 160, weight: 600, align: "center", spacing: 0.16, shadow: true });
  }
  if (pages > 1) text(`${page + 1} / ${pages}`, w - margin, footerY, { size: wide ? 15 : 18, color: theme.headerMuted, max: 90, weight: 700, align: "right", shadow: true });

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((value) => value ? resolve(value) : reject(new Error("Slika nije mogla biti sačuvana.")), "image/png");
  });
  return { blob, missingLogos: loaded.filter(([, logo]) => !logo).length };
}

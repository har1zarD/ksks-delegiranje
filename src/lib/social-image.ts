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

/**
 * Teme slika statistike (MVP, petorka, lideri): pozadine vezane za teren (Codex ImageGen, public/social/court-*.png).
 * Imena, brojevi i grbovi crtaju se preko, pa je sredina pozadine mirna i tamna.
 */
export const STATS_TEMPLATES = [
  { id: "court-neon", name: "Neon", description: "Ljubičasti svjetlosni valovi i sjaj rubova dvorane", bg: "#17082d", panel: "rgba(20,8,38,0.88)", ink: "#ffffff", muted: "#ddd0f5", accent: "#f7a8ff", line: "#77518e", background: "/social/court-neon-v1.png", overlay: "rgba(12,3,28,0.24)", headerInk: "#ffffff", headerMuted: "#eadcfa" },
  { id: "court-teal", name: "Tirkiz", description: "Tirkizna dvorana, linije terena i meke zrake svjetla", bg: "#032e36", panel: "rgba(2,32,42,0.90)", ink: "#ffffff", muted: "#c2e9ec", accent: "#95ffdf", line: "#347a85", background: "/social/court-teal-v1.png", overlay: "rgba(0,24,34,0.44)", headerInk: "#ffffff", headerMuted: "#d3f2f1" },
  { id: "court-smoke", name: "Bordo dim", description: "Bordo izmaglica, prigušeni reflektori i zrno", bg: "#24080f", panel: "rgba(34,7,15,0.88)", ink: "#ffffff", muted: "#edcbd3", accent: "#ffd0a4", line: "#80505b", background: "/social/court-smoke-v1.png", overlay: "rgba(18,3,8,0.30)", headerInk: "#ffffff", headerMuted: "#f5dbe0" },
  { id: "court-hardwood", name: "Parket", description: "Tamni parket odozgo, centralni krug pod reflektorom", bg: "#120c07", panel: "rgba(20,13,8,0.82)", ink: "#ffffff", muted: "#ead8c4", accent: "#ff9a3c", line: "#6b4a2c", background: "/social/court-hardwood-v1.png", overlay: "rgba(8,5,2,0.30)", headerInk: "#ffffff", headerMuted: "#f3dfc8" },
  { id: "court-tactics", name: "Taktička tabla", description: "Školska tabla trenera, kredom nacrtan teren", bg: "#141917", panel: "rgba(18,24,22,0.84)", ink: "#f6f7f2", muted: "#c9d2cb", accent: "#ffd166", line: "#56635c", background: "/social/court-tactics-v1.png", overlay: "rgba(8,12,10,0.34)", headerInk: "#f6f7f2", headerMuted: "#d6ddd7" },
  { id: "court-blueprint", name: "Nacrt terena", description: "Tehnički nacrt terena, plave i cijan linije", bg: "#061a3a", panel: "rgba(5,24,58,0.84)", ink: "#ffffff", muted: "#bcd5f6", accent: "#5ee0ff", line: "#2d5791", background: "/social/court-blueprint-v1.png", overlay: "rgba(2,12,32,0.30)", headerInk: "#ffffff", headerMuted: "#cfe2fb" },
  { id: "court-paint", name: "Reket", description: "Lakirani parket i narandžasti reket", bg: "#1a0904", panel: "rgba(26,10,5,0.84)", ink: "#ffffff", muted: "#f3d0c0", accent: "#ff6a3d", line: "#743a26", background: "/social/court-paint-v1.png", overlay: "rgba(12,4,2,0.38)", headerInk: "#ffffff", headerMuted: "#f8dccf" },
  { id: "court-street", name: "Ulični teren", description: "Mokri asfalt noću, lanac na košu", bg: "#0d0f12", panel: "rgba(14,16,20,0.86)", ink: "#ffffff", muted: "#d2d6dc", accent: "#ffb347", line: "#4a4f57", background: "/social/court-street-v1.png", overlay: "rgba(6,7,9,0.36)", headerInk: "#ffffff", headerMuted: "#dfe2e6" },
  { id: "court-baseline", name: "Ispod koša", description: "Tabla i mrežica pod reflektorima dvorane", bg: "#070b14", panel: "rgba(8,12,22,0.84)", ink: "#ffffff", muted: "#c9d3e7", accent: "#ff5d5d", line: "#38455f", background: "/social/court-baseline-v1.png", overlay: "rgba(3,5,10,0.34)", headerInk: "#ffffff", headerMuted: "#d6deee" },
  { id: "court-gold", name: "Zlatne linije", description: "Crni teren sa zlatnim linijama", bg: "#0b0a08", panel: "rgba(14,12,9,0.88)", ink: "#fffaf0", muted: "#dccdaa", accent: "#e7c06a", line: "#6e5a35", background: "/social/court-gold-v1.png", overlay: "rgba(4,4,3,0.32)", headerInk: "#fff4dc", headerMuted: "#e8d6b0" },
  { id: "court-scoreboard", name: "Semafor", description: "Dvorana, LED semafor i reklamne trake", bg: "#05070d", panel: "rgba(6,9,18,0.86)", ink: "#ffffff", muted: "#c5cde2", accent: "#ff3b4f", line: "#3b3156", background: "/social/court-scoreboard-v1.png", overlay: "rgba(2,3,8,0.36)", headerInk: "#ffffff", headerMuted: "#d3d9ea" },
  { id: "court-rooftop", name: "Krovni teren", description: "Teren na krovu noću, svjetla grada", bg: "#071522", panel: "rgba(7,19,32,0.88)", ink: "#ffffff", muted: "#c4d4e5", accent: "#ffbd70", line: "#3b536b", background: "/social/court-rooftop-v1.png", overlay: "rgba(3,10,18,0.30)", headerInk: "#ffffff", headerMuted: "#d5e1ef" },
] as const satisfies readonly Template[];

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
} as const;

/** Slike statistike: šta se prikazuje (MVP, petorka…) i u kojem stilu */
export const STATS_MODES = [
  { id: "mvp", name: "MVP", description: "Najbolji igrač kola ili sezone" },
  { id: "five", name: "Petorka", description: "Pet najboljih igrača" },
  { id: "leaders", name: "Lideri", description: "Najbolji po poenima, skokovima, asistencijama…" },
  { id: "top", name: "Top lista", description: "Redoslijed po jednoj statistici" },
] as const;

export const STATS_STYLES: Record<StatsMode, readonly { id: string; name: string; description: string }[]> = {
  mvp: [
    { id: "poster", name: "Plakat", description: "Ogroman broj dresa, grb, linije terena i brojke u traci" },
    { id: "scoreboard", name: "Semafor", description: "LED semafor: rezultat utakmice i brojke u ćelijama" },
  ],
  five: [
    { id: "pillars", name: "Reflektori", description: "Pet svjetlosnih stubova, najkorisniji u sredini i veliki naslov ispod" },
    { id: "staggered", name: "Stepenice", description: "Igrači u luku, bijele oznake imena i veliki poeni i indeks" },
    { id: "zigzag", name: "Cik-cak", description: "Igrači naizmjenično lijevo i desno, grb, indeks i traka s imenom" },
    { id: "court", name: "Na terenu", description: "Pet igrača raspoređenih po nacrtanom polu-terenu" },
    { id: "cards", name: "Kartice", description: "Kartica po igraču: broj, grb, ime i brojke" },
    { id: "list", name: "Lista", description: "Pet redova s brojkama u kolonama" },
  ],
  leaders: [
    { id: "tiles", name: "Pločice", description: "Pločica po kategoriji, veliki broj i grb" },
    { id: "board", name: "Tabla", description: "Kategorije u redovima, kao tabla rezultata" },
  ],
  top: [
    { id: "list", name: "Lista", description: "Redovi s brojem dresa, grbom i vrijednošću" },
    { id: "podium", name: "Podij", description: "Prva trojka na podiju, ostali ispod" },
  ],
} as const;

export type StatsMode = (typeof STATS_MODES)[number]["id"];

/** Fotografije igrača na slikama statistike */
export const STATS_PHOTOS = [
  { id: "cutout", name: "Izrezana", description: "Igrač bez pozadine, sa sjajem boje akcenta" },
  { id: "frame", name: "U okviru", description: "Fotografija s licence u portret-kartici" },
  { id: "none", name: "Bez fotografije", description: "Samo ime, broj dresa i grb" },
] as const;

export type StatsPhoto = (typeof STATS_PHOTOS)[number]["id"];

export type SocialFormat = (typeof SOCIAL_FORMATS)[number]["id"];
export type SocialTemplate = (typeof SOCIAL_TEMPLATES)[number]["id"] | (typeof STATS_TEMPLATES)[number]["id"];
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
  /** Okvir lica na izrezanoj fotografiji [x, y, w, h] (0–1): lice se centrira, krupni kadrovi se odzumiraju */
  face: number[] | null;
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
  | ({ kind: "stats"; season: boolean; photos: StatsPhoto } & (
    | { mode: "mvp"; player: SocialStatPlayer }
    | { mode: "five"; players: SocialStatPlayer[] }
    | { mode: "leaders"; categories: { key: SocialStatKey; players: SocialStatPlayer[] }[] }
    | { mode: "top"; key: SocialStatKey; players: SocialStatPlayer[]; firstRank: number }
  ));

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
  if (statehoodDay) return SOCIAL_STATEHOOD_TEMPLATE;
  return [...SOCIAL_TEMPLATES, ...STATS_TEMPLATES].find((t) => t.id === id) ?? SOCIAL_TEMPLATES.find((t) => t.id === "arena")!;
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
  // Fotografije igrača (slike statistike): izrezana kad je izabrana i postoji, inače obična s licence
  const photoStyle = content.kind === "stats" ? content.photos : "none";
  const people = photoStyle === "none" ? [] : statPlayers(content);
  const [loaded, photoList, brandLogo, background, watermark] = await Promise.all([
    Promise.all(urls.map(async (url) => [url, await loadImage(url)] as const)),
    Promise.all(people.map(async (p) => {
      const cutout = photoStyle === "cutout" && p.cutout ? await loadImage(p.cutout) : null;
      const photo = !cutout && p.photo ? await loadImage(p.photo) : null;
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

  const titleBelow = content.kind === "stats" && content.mode === "five" && options.layout === "pillars";
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
    if (!titleBelow) {
      const bx = margin + logoWidth + 20;
      titleX = Math.max(470, bx + 16 + measure(brand.lines[1], 15, 600, "body", 0.08) + 40);
      box(bx, top + brandSize * 0.18, 3, brandSize * 0.64, theme.accent, 1.5);
      text(brand.lines[0], bx + 16, top + brandSize * 0.38, { size: wide ? 15 : 17, color: theme.headerMuted, max: 360, weight: 600, spacing: 0.08 });
      text(brand.lines[1], bx + 16, top + brandSize * 0.64, { size: wide ? 15 : 17, color: theme.headerMuted, max: 360, weight: 600, spacing: 0.08 });
    }
    cursor = top + (wide ? 0 : brandSize + 22);
  }

  const title = options.title.trim().toUpperCase();
  const subtitle = options.subtitle.trim().toUpperCase();
  if (titleBelow) {
    cursor = top + (options.showBrand ? brandSize + (wide ? 14 : 22) : 0);
  } else if (wide) {
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

  // Vodeni žig saveza (KSBIH) samo na predlošcima s pozadinom; slike statistike imaju svoju pozadinu terena
  if (watermark && content.kind !== "stats") {
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

  // ── Statistika: MVP, petorka, lideri, top lista (bez fotografija; grb, broj dresa i linije terena) ─────────

  if (content.kind === "stats") {
    const season = content.season;
    const style = options.layout;
    const darkInk = luminance(theme.ink) > 0.5;
    const [ar, ag, ab] = rgbOf(theme.accent);
    const accentAlpha = (alpha: number) => `rgba(${ar},${ag},${ab},${alpha})`;
    const perGame = season ? " / UT" : "";
    const statOf = (key: SocialStatKey) => SOCIAL_STATS.find((s) => s.id === key)!;
    const lastName = (p: SocialStatPlayer) => (p.last || p.first).toUpperCase();
    const fullName = (p: SocialStatPlayer) => [p.first, p.last].filter(Boolean).join(" ").toUpperCase();

    /** Tekst sa sjenom na tamnim predlošcima (preko pozadine) */
    const shadowed = (draw: () => void) => {
      ctx.save();
      if (darkInk) {
        ctx.shadowColor = "rgba(0,0,0,0.6)";
        ctx.shadowBlur = 14;
        ctx.shadowOffsetY = 2;
      }
      draw();
      ctx.restore();
    };

    /** Panel s blagim sjajem akcenta odozgo; `highlight` = okvir punom bojom akcenta */
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
      glow.addColorStop(0, accentAlpha(highlight ? 0.3 : 0.16));
      glow.addColorStop(0.6, accentAlpha(0));
      ctx.fillStyle = glow;
      ctx.fillRect(x, y, pw, ph);
      ctx.restore();
      ctx.save();
      ctx.strokeStyle = highlight ? theme.accent : accentAlpha(0.32);
      ctx.lineWidth = highlight ? 3 : 1.5;
      ctx.beginPath();
      ctx.roundRect(x + 0.75, y + 0.75, pw - 1.5, ph - 1.5, radius);
      ctx.stroke();
      ctx.restore();
    };

    /**
     * Polovina FIBA terena (15 × 14 m) u okviru, koš gore: linije, reket, krug slobodnih bacanja, trica, centralni
     * polukrug. Vraća koordinate za tačku na terenu u metrima (x od lijeve aut-linije, y od osnovne linije).
     */
    const halfCourt = (x: number, y: number, cw: number, ch: number, color: string, width: number) => {
      const m = Math.min(cw / 15, ch / 14);
      const W = 15 * m;
      const H = 14 * m;
      const ox = x + (cw - W) / 2;
      const oy = y + (ch - H) / 2;
      const cx0 = ox + W / 2;
      const rimY = oy + 1.575 * m;
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.strokeRect(ox, oy, W, H);
      ctx.strokeRect(cx0 - 2.45 * m, oy, 4.9 * m, 5.8 * m);
      ctx.beginPath();
      ctx.arc(cx0, oy + 5.8 * m, 1.8 * m, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx0 - 0.9 * m, oy + 1.2 * m);
      ctx.lineTo(cx0 + 0.9 * m, oy + 1.2 * m);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx0, rimY, 0.225 * m, 0, Math.PI * 2);
      ctx.stroke();
      const r = 6.75 * m;
      const dx = W / 2 - 0.9 * m;
      const dy = Math.sqrt(Math.max(0, r * r - dx * dx));
      ctx.beginPath();
      ctx.moveTo(cx0 - dx, oy);
      ctx.lineTo(cx0 - dx, rimY + dy);
      ctx.arc(cx0, rimY, r, Math.atan2(dy, -dx), Math.atan2(dy, dx), true);
      ctx.lineTo(cx0 + dx, oy);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx0, oy + H, 1.8 * m, Math.PI, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      return (mx: number, my: number) => ({ x: ox + mx * m, y: oy + my * m });
    };

    /** Broj dresa u krugu akcenta (oznaka igrača na terenu i u listama) */
    const jersey = (p: SocialStatPlayer, cx: number, cy: number, r: number, filled = true) => {
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = filled ? theme.accent : accentAlpha(0.14);
      ctx.fill();
      ctx.lineWidth = Math.max(2, r * 0.08);
      ctx.strokeStyle = filled ? "rgba(255,255,255,0.85)" : theme.accent;
      ctx.stroke();
      ctx.restore();
      text(p.number ?? "–", cx, cy + r * 0.04, { size: r * 1.05, color: filled ? inkOn(theme.accent) : theme.ink, max: r * 1.7, weight: 700, align: "center", face: "poster" });
    };

    /** Igrač ima fotografiju za crtanje (izabran prikaz s fotografijom i fotografija je učitana) */
    const hasPhoto = (p: SocialStatPlayer) => Boolean(photos.get(p.id)?.cutout || photos.get(p.id)?.photo);

    /**
     * Fotografija u okviru (x, y, pw, ph). Izrezana: igrač stoji na dnu okvira, sa sjajem akcenta oko obrisa i blagim
     * nestajanjem prema dnu. Obična: portret-kartica 4:5 (lice u gornjoj trećini), okvir akcenta i tamni prelaz dole.
     * `zoom`: krupniji kadar (glava i ramena), vrh glave uz gornji rub.
     */
    const portrait = (p: SocialStatPlayer, x: number, y: number, pw: number, ph: number, { zoom = 1, radius = 18 }: { zoom?: number; radius?: number } = {}) => {
      const own = photos.get(p.id);
      if (!own?.cutout && !own?.photo) return false;
      if (own.cutout) {
        const b = visibleBounds(own.cutout);
        const near = b.height / b.width >= 1.2 ? zoom : Math.min(zoom, 1.1);
        let scale = (ph * near) / b.height;
        if (b.width * scale > pw * 1.1 * near) scale = (pw * 1.1 * near) / b.width;
        scale = Math.min(scale, 3);
        // Krupni kadar s licence (lice preko pola fotografije): lice najviše trećina okvira, da se ne razvuče preko svega
        const face = p.face && p.face.length === 4 ? p.face : null;
        if (face) {
          const faceH = face[3] * own.cutout.naturalHeight * scale;
          const maxFace = ph * (near > 1.1 ? 0.46 : 0.3);
          if (faceH > maxFace) scale *= maxFace / faceH;
        }
        const dw = b.width * scale;
        const dh = b.height * scale;
        const pad = 60;
        const layer = document.createElement("canvas");
        layer.width = Math.max(1, Math.round(pw + pad * 2));
        layer.height = Math.max(1, Math.round(ph + pad));
        const l = layer.getContext("2d")!;
        l.imageSmoothingQuality = "high";
        const dx = pad + (pw - dw) / 2;
        let dy = pad + (near > 1.1 ? ph * 0.04 : ph - dh);
        if (face && near <= 1.1 && dh < ph * 0.8) {
          // Odzumirana fotografija: lice malo iznad sredine okvira, ne zalijepljeno uz dno
          const faceCenter = ((face[1] + face[3] / 2) * own.cutout.naturalHeight - b.y) * scale;
          dy = pad + Math.min(ph - dh, Math.max(0, ph * 0.42 - faceCenter));
        }
        // Sjaj akcenta oko obrisa, pa sam igrač
        l.save();
        l.shadowColor = accentAlpha(0.85);
        l.shadowBlur = Math.min(46, ph * 0.06);
        l.drawImage(own.cutout, b.x, b.y, b.width, b.height, dx, dy, dw, dh);
        l.restore();
        l.drawImage(own.cutout, b.x, b.y, b.width, b.height, dx, dy, dw, dh);
        l.globalCompositeOperation = "destination-in";
        // Donji rub fotografije se gubi (rub okvira, ili rub same fotografije kad je kraća od okvira)
        const end = Math.min(dy + dh, pad + ph);
        const fadeFrom = end - Math.max(1, Math.min(ph * 0.14, dh * 0.24));
        const mask = l.createLinearGradient(0, fadeFrom, 0, end);
        mask.addColorStop(0, "#000");
        mask.addColorStop(1, "rgba(0,0,0,0)");
        l.fillStyle = mask;
        l.fillRect(0, 0, layer.width, layer.height);
        ctx.drawImage(layer, x - pad, y - pad);
        return true;
      }
      const image = own.photo!;
      const ch = Math.min(ph, pw * 1.25);
      const cw = ch * 0.8;
      const cx = x + (pw - cw) / 2;
      const cy = y + ph - ch;
      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,0.45)";
      ctx.shadowBlur = 24;
      ctx.shadowOffsetY = 8;
      box(cx, cy, cw, ch, theme.bg, radius);
      ctx.restore();
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(cx, cy, cw, ch, radius);
      ctx.clip();
      const scale = Math.max(cw / image.naturalWidth, ch / image.naturalHeight) * zoom;
      const iw = image.naturalWidth * scale;
      const ih = image.naturalHeight * scale;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(image, cx + (cw - iw) / 2, cy + (ch - ih) * 0.25, iw, ih);
      const shade = ctx.createLinearGradient(0, cy + ch * 0.55, 0, cy + ch);
      shade.addColorStop(0, "rgba(0,0,0,0)");
      shade.addColorStop(1, "rgba(0,0,0,0.55)");
      ctx.fillStyle = shade;
      ctx.fillRect(cx, cy, cw, ch);
      ctx.restore();
      ctx.save();
      ctx.strokeStyle = theme.accent;
      ctx.lineWidth = Math.max(3, cw * 0.012);
      ctx.beginPath();
      ctx.roundRect(cx, cy, cw, ch, radius);
      ctx.stroke();
      ctx.restore();
      return true;
    };

    /** Okrugla fotografija (glava i ramena) s prstenom akcenta; bez fotografije ništa (false) */
    const avatar = (p: SocialStatPlayer, cx: number, cy: number, r: number) => {
      const own = photos.get(p.id);
      if (!own?.cutout && !own?.photo) return false;
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      const fill = ctx.createLinearGradient(0, cy - r, 0, cy + r);
      fill.addColorStop(0, accentAlpha(0.45));
      fill.addColorStop(1, accentAlpha(0.12));
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.clip();
      ctx.imageSmoothingQuality = "high";
      if (own.cutout && p.face?.length === 4) {
        // Po licu: lice 0,8 polumjera visoko, centrirano malo iznad sredine kruga. Krupni kadar s licence se tako
        // odzumira; kad je fotografija kraća od kruga, njen donji rub (vrat) se gubi umjesto oštrog reza.
        const [fx, fy, fw, fh] = p.face;
        const W = own.cutout.naturalWidth;
        const H = own.cutout.naturalHeight;
        const s = Math.min((r * 0.8) / (fh * H), (r * 6) / H);
        const dw = W * s;
        const dh = H * s;
        const dx = r - (fx + fw / 2) * W * s;
        const dy = r * 0.9 - (fy + fh / 2) * H * s;
        const layer = document.createElement("canvas");
        layer.width = layer.height = Math.max(1, Math.round(r * 2));
        const l = layer.getContext("2d")!;
        l.imageSmoothingQuality = "high";
        l.drawImage(own.cutout, dx, dy, dw, dh);
        if (dy + dh < r * 2 - 1) {
          l.globalCompositeOperation = "destination-in";
          const fade = l.createLinearGradient(0, dy + dh * 0.72, 0, dy + dh);
          fade.addColorStop(0, "#000");
          fade.addColorStop(1, "rgba(0,0,0,0)");
          l.fillStyle = fade;
          l.fillRect(0, 0, layer.width, layer.height);
        }
        ctx.drawImage(layer, cx - r, cy - r, r * 2, r * 2);
      } else if (own.cutout) {
        const b = visibleBounds(own.cutout);
        const face = b.height / b.width < 1.2;
        // Glava i ramena: najviše 2,3 promjera u širinu i 2,6 u visinu (uska portretna fotografija ostaje cijelo lice)
        const scale = face ? (r * 2) / b.height : Math.min((r * 2.3) / b.width, (r * 2.6) / b.height);
        const dw = b.width * scale;
        const dh = b.height * scale;
        ctx.drawImage(own.cutout, b.x, b.y, b.width, b.height, cx - dw / 2, face ? cy + r - dh : cy - r + r * 0.12, dw, dh);
      } else {
        const image = own.photo!;
        const scale = Math.max((r * 2) / image.naturalWidth, (r * 2) / image.naturalHeight) * 1.15;
        const iw = image.naturalWidth * scale;
        const ih = image.naturalHeight * scale;
        ctx.drawImage(image, cx - iw / 2, cy - r - (ih - r * 2) * 0.22, iw, ih);
      }
      ctx.restore();
      ctx.save();
      ctx.strokeStyle = theme.accent;
      ctx.lineWidth = Math.max(2.5, r * 0.07);
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      return true;
    };

    /** Mali broj dresa uz okruglu fotografiju */
    const numberBadge = (p: SocialStatPlayer, cx: number, cy: number, r: number) => {
      if (!p.number) return;
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = theme.accent;
      ctx.fill();
      ctx.restore();
      text(p.number, cx, cy + r * 0.04, { size: r * 1.1, color: inkOn(theme.accent), max: r * 1.7, weight: 700, align: "center", face: "poster" });
    };

    /** Okrugla fotografija s brojem dresa, a bez fotografije broj dresa u krugu */
    const marker = (p: SocialStatPlayer, cx: number, cy: number, r: number, filled = true) => {
      if (avatar(p, cx, cy, r)) numberBadge(p, cx + r * 0.72, cy + r * 0.72, Math.max(11, r * 0.34));
      else jersey(p, cx, cy, r, filled);
    };

    /** Ogroman broj dresa: obris akcenta i blaga ispuna (pozadina igrača) */
    const bigNumber = (value: string, cx: number, cy: number, size: number, max: number) => {
      setFont(size, 700, "poster", 0);
      ctx.save();
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = accentAlpha(0.1);
      ctx.fillText(value, cx, cy, max);
      ctx.strokeStyle = accentAlpha(0.55);
      ctx.lineWidth = Math.max(2, size * 0.008);
      ctx.strokeText(value, cx, cy, max);
      ctx.restore();
    };

    /** Ime: ime manje i prigušeno, prezime veliko; vraća visinu bloka */
    const nameBlock = (p: SocialStatPlayer, x: number, y: number, max: number, size: number, align: CanvasTextAlign = "left") => {
      const last = lastName(p);
      let lastSize = size;
      while (measure(last, lastSize, 700, "poster", 0.01) > max && lastSize > size * 0.6) lastSize -= 1;
      const firstSize = Math.max(13, size * 0.4);
      shadowed(() => {
        if (p.last) text(p.first.toUpperCase(), x, y, { size: firstSize, color: theme.muted, max, weight: 600, align, face: "poster", spacing: 0.08 });
        text(last, x, y + firstSize * 0.62 + lastSize * 0.56, { size: lastSize, color: theme.ink, max, weight: 700, align, face: "poster", spacing: 0.01 });
      });
      return firstSize * 0.62 + lastSize * 1.12;
    };

    /** Grb i naziv ekipe u redu */
    const teamRow = (p: SocialStatPlayer, x: number, cy: number, max: number, size: number, align: "left" | "center" = "left") => {
      const logo = options.showLogos ? size * 1.6 : 0;
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

    /** Šut i ukradene: "ŠUT 13/17 · TRICE 3/4 · SB 5/6" */
    const shootingLine = (p: SocialStatPlayer) =>
      [p.fga ? `ŠUT ${p.fgm}/${p.fga}` : null, p.tpa ? `TRICE ${p.tpm}/${p.tpa}` : null, p.fta ? `SB ${p.ftm}/${p.fta}` : null, p.stl ? `UKR ${statText(p, "stl", season)}` : null]
        .filter(Boolean).join("  ·  ");

    /** Brojke u ćelijama (vrijednost iznad, oznaka ispod), razdvojene tankim linijama */
    const statCells = (p: SocialStatPlayer, keys: SocialStatKey[], x: number, y: number, cw: number, ch: number, labels: "unit" | "short" = "unit") => {
      const cell = cw / keys.length;
      keys.forEach((key, i) => {
        const cx = x + cell * i + cell / 2;
        if (i) line(x + cell * i, y + ch * 0.2, x + cell * i, y + ch * 0.8, theme.line, 1.5);
        text(statText(p, key, season), cx, y + ch * 0.42, { size: Math.min(ch * 0.46, cell * 0.42), color: key === "eff" || i === 0 ? theme.accent : theme.ink, max: cell - 12, weight: 700, align: "center", face: "poster" });
        const label = labels === "unit" ? `${statOf(key).unit}${perGame}` : statOf(key).short;
        text(label, cx, y + ch * 0.79, { size: Math.min(18, ch * 0.13), color: theme.muted, max: cell - 10, weight: 600, align: "center", spacing: 0.1 });
      });
    };

    // ── MVP ─────────────────────────────────────────────

    if (content.mode === "mvp" && style === "scoreboard") {
      // Semafor: rezultat utakmice gore, ime u traci, šest LED ćelija
      const p = content.player;
      const pad = wide ? 24 : 34;
      const bw = wide ? Math.min(width, 900) : width;
      const bx = (w - bw) / 2;
      const bh = Math.min(available, wide ? available : story ? 1180 : bw * 1.02);
      const by = contentTop + (available - bh) * 0.45;
      box(bx, by, bw, bh, "rgba(4,6,10,0.92)", 26);
      ctx.save();
      ctx.strokeStyle = accentAlpha(0.7);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(bx + 8, by + 8, bw - 16, bh - 16, 20);
      ctx.stroke();
      ctx.restore();
      // LED rešetka (tačkice) preko cijelog semafora
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(bx + 8, by + 8, bw - 16, bh - 16, 20);
      ctx.clip();
      ctx.fillStyle = "rgba(255,255,255,0.035)";
      for (let gy = by + 14; gy < by + bh; gy += 9) for (let gx = bx + 14; gx < bx + bw; gx += 9) ctx.fillRect(gx, gy, 2.5, 2.5);
      ctx.restore();
      const led = (value: string, cx: number, cy: number, size: number, max: number, color = theme.accent) => {
        ctx.save();
        ctx.shadowColor = color;
        ctx.shadowBlur = size * 0.35;
        text(value, cx, cy, { size, color, max, weight: 700, align: "center", face: "poster" });
        ctx.restore();
      };
      const rows = wide ? [0.3, 0.2, 0.5] : [0.27, 0.2, 0.53];
      const top = by + pad;
      const inner = bh - pad * 2;
      // Red 1: grb · rezultat · grb (sezona: utakmice i minute)
      const r1 = inner * rows[0];
      const crestSize = Math.min(r1 * 0.78, bw * 0.16);
      if (p.game) {
        crest(p.team, p.teamLogo, bx + pad + crestSize / 2 + 10, top + r1 / 2, crestSize);
        crest(p.game.opponent, p.game.opponentLogo, bx + bw - pad - crestSize / 2 - 10, top + r1 / 2, crestSize);
        led(`${p.game.teamScore} : ${p.game.opponentScore}`, bx + bw / 2, top + r1 * 0.45, r1 * 0.6, bw * 0.5, "#ffffff");
        text(p.game.won ? "POBJEDA" : "PORAZ", bx + bw / 2, top + r1 * 0.88, { size: Math.min(20, r1 * 0.14), color: p.game.won ? theme.accent : theme.muted, max: bw * 0.4, weight: 700, align: "center", spacing: 0.2 });
      } else {
        crest(p.team, p.teamLogo, bx + bw / 2, top + r1 * 0.42, crestSize);
        text(gameLine(p), bx + bw / 2, top + r1 * 0.9, { size: Math.min(20, r1 * 0.14), color: theme.muted, max: bw - pad * 2, weight: 700, align: "center", spacing: 0.12 });
      }
      // Red 2: broj dresa i ime u traci akcenta
      const r2y = top + r1;
      const r2 = inner * rows[1];
      box(bx + pad, r2y + r2 * 0.1, bw - pad * 2, r2 * 0.8, accentAlpha(0.16), 12);
      const tag = Math.min(r2 * 0.62, 90);
      // Fotografija lijevo u traci (krug), pa broj dresa i ime
      const face = Math.min(r2 * 0.46, 70);
      const shift = avatar(p, bx + pad + 14 + face, r2y + r2 / 2, face) ? face * 2 + 18 : 0;
      box(bx + pad + 14 + shift, r2y + (r2 - tag) / 2, tag * 1.3, tag, theme.accent, 10);
      text(p.number ?? "–", bx + pad + 14 + shift + tag * 0.65, r2y + r2 / 2, { size: tag * 0.72, color: inkOn(theme.accent), max: tag * 1.2, weight: 700, align: "center", face: "poster" });
      const nx = bx + pad + 14 + shift + tag * 1.3 + 22;
      const nmax = bw - pad * 2 - (nx - bx - pad) - 20;
      text(fullName(p), nx, r2y + r2 * 0.4, { size: Math.min(r2 * 0.34, 56), color: "#ffffff", max: nmax, weight: 700, face: "poster", spacing: 0.02 });
      text(`${p.team.toUpperCase()}  ·  ${season ? "IGRAČ SEZONE" : "MVP KOLA"}`, nx, r2y + r2 * 0.74, { size: Math.min(r2 * 0.14, 20), color: theme.accent, max: nmax, weight: 700, spacing: 0.1 });
      // Red 3: šest ćelija
      const r3y = r2y + r2 + inner * 0.03;
      const r3 = inner * rows[2] - inner * 0.03;
      const cells: { label: string; value: string }[] = [
        ...(["pts", "reb", "ast", "eff"] as const).map((key) => ({ label: `${statOf(key).unit}${perGame}`, value: statText(p, key, season) })),
        { label: "ŠUT IZ IGRE", value: p.fga ? `${p.fgm}/${p.fga}` : "–" },
        { label: season ? "MIN / UT" : "TRICE", value: season ? String(Math.round(p.seconds / 60 / Math.max(1, p.games))) : p.tpa ? `${p.tpm}/${p.tpa}` : "–" },
      ];
      const cols = 3;
      const cw = (bw - pad * 2) / cols;
      const chh = r3 / 2;
      cells.forEach((c, i) => {
        const cx = bx + pad + (i % cols) * cw;
        const cy = r3y + Math.floor(i / cols) * chh;
        box(cx + 6, cy + 6, cw - 12, chh - 12, "rgba(255,255,255,0.045)", 10);
        led(c.value, cx + cw / 2, cy + chh * 0.44, Math.min(chh * 0.44, cw * 0.36), cw - 30, i < 4 ? theme.accent : "#ffffff");
        text(c.label, cx + cw / 2, cy + chh * 0.8, { size: Math.min(17, chh * 0.12), color: "#c7cede", max: cw - 24, weight: 600, align: "center", spacing: 0.1 });
      });
    } else if (content.mode === "mvp") {
      // Plakat: linije terena i ogroman broj dresa iza, grb ekipe, ime dolje lijevo, brojke u traci
      const p = content.player;
      if (wide) {
        const side = width * 0.38;
        halfCourt(margin, contentTop, side, available, accentAlpha(0.25), 2);
        if (p.number) bigNumber(p.number, margin + side / 2, contentTop + available * 0.5, available * 0.86, side);
        if (!portrait(p, margin, contentTop, side, available + (h - bottom) * 0.5)) crest(p.team, p.teamLogo, margin + side / 2, contentTop + available * 0.5, Math.min(side * 0.5, available * 0.5));
        const tx = margin + side + 34;
        const tw = w - margin - tx;
        let ty = contentTop + 34;
        box(tx, ty - 24, 150, 34, theme.accent, 6);
        text(season ? "SEZONA" : "MVP", tx + 75, ty - 7, { size: 20, color: inkOn(theme.accent), max: 130, weight: 700, align: "center", face: "poster", spacing: 0.12 });
        ty += 30;
        ty += nameBlock(p, tx, ty, tw, 66);
        teamRow(p, tx, ty + 10, tw, 18);
        text(gameLine(p), tx, ty + 44, { size: 16, color: theme.accent, max: tw, weight: 700, spacing: 0.06 });
        panel(tx, bottom - 126, tw, 126, 16, true);
        statCells(p, ["pts", "reb", "ast", "eff"], tx, bottom - 126, tw, 126);
      } else {
        const barH = story ? 230 : options.format === "square" ? 150 : 176;
        const stageBottom = bottom - barH - (story ? 30 : 20);
        const stageH = stageBottom - contentTop;
        halfCourt(margin, contentTop, width, stageH, accentAlpha(0.22), 2.5);
        const glow = ctx.createRadialGradient(w * 0.68, contentTop + stageH * 0.42, 10, w * 0.68, contentTop + stageH * 0.42, stageH * 0.6);
        glow.addColorStop(0, accentAlpha(0.3));
        glow.addColorStop(1, accentAlpha(0));
        ctx.fillStyle = glow;
        ctx.fillRect(0, contentTop - 20, w, stageH + 40);
        if (p.number) bigNumber(p.number, w * 0.68, contentTop + stageH * 0.4, stageH * 0.78, w * 0.62);
        const crestSize = Math.min(stageH * 0.42, w * 0.36);
        const fw = w * 0.6;
        if (portrait(p, w - margin - fw + 30, contentTop, fw, stageH + 14)) {
          // Uz fotografiju grb ide manji, gore desno
          const small = Math.min(stageH * 0.17, 150);
          crest(p.team, p.teamLogo, w - margin - small / 2, contentTop + small / 2, small);
        } else crest(p.team, p.teamLogo, w * 0.68, contentTop + stageH * 0.4, crestSize);
        const nameSize = story ? 118 : options.format === "square" ? 84 : 104;
        const tw = width;
        const blockH = nameSize * 0.4 * 0.62 + nameSize * 1.12 + 92;
        let ty = stageBottom - blockH;
        box(margin, ty - 72, 170, 40, theme.accent, 6);
        text(season ? "SEZONA" : "MVP", margin + 85, ty - 52, { size: 24, color: inkOn(theme.accent), max: 150, weight: 700, align: "center", face: "poster", spacing: 0.12 });
        ty += 8;
        ty += nameBlock(p, margin, ty, tw, nameSize);
        teamRow(p, margin, ty + 18, w * 0.5, story ? 24 : 21);
        shadowed(() => text(gameLine(p), margin, ty + 60, { size: story ? 22 : 19, color: theme.accent, max: w * 0.52, weight: 700, spacing: 0.06 }));
        const shooting = shootingLine(p);
        if (shooting) shadowed(() => text(shooting, w - margin, ty + 60, { size: story ? 20 : 17, color: theme.muted, max: w * 0.4, weight: 600, align: "right", spacing: 0.06 }));
        panel(margin, bottom - barH, width, barH, Math.min(20, barH * 0.16), true);
        statCells(p, ["pts", "reb", "ast", "eff"], margin, bottom - barH, width, barH);
      }
    }

    // ── Petorka ─────────────────────────────────────────────

    if (content.mode === "five" && style === "pillars") {
      const players = content.players.slice(0, 5);
      const n = Math.max(1, players.length);
      const step = width / n;
      const center = Math.floor(n / 2);
      const titleSize = wide ? 76 : story ? 152 : options.format === "square" ? 112 : 136;
      const subtitleSize = wide ? 18 : 25;
      const titleH = (title ? titleSize * 1.12 : 0) + (subtitle ? subtitleSize * 1.8 : 0);
      const stageSpace = Math.max(1, available - titleH - 20);
      // Fotografija je ograničena širinom stuba, pa stub nije viši od toga (inače prazno između imena i glave)
      const stageH = Math.min(stageSpace, step * (wide ? 1.65 : story ? 3.4 : options.format === "square" ? 2.3 : 2.75));
      const stageY = contentTop + (stageSpace - stageH) * 0.45;
      const nameSize = Math.min(step * 0.21, wide ? 38 : 44);
      const nameH = nameSize * 1.8 + 18;
      const statsH = wide ? 32 : 46;
      const photoH = Math.max(1, stageH - nameH - statsH);
      const tileSize = Math.min(step * 0.43, wide ? 66 : 92);
      const lineup = players.map((p, rank) => ({ p, rank, slot: center + (rank % 2 ? -1 : 1) * Math.ceil(rank / 2) }));
      lineup.forEach(({ rank, slot }) => {
        const cx = margin + step * (slot + 0.5);
        const beam = ctx.createLinearGradient(0, stageY, 0, stageY + stageH);
        beam.addColorStop(0, accentAlpha(0));
        beam.addColorStop(0.15, accentAlpha(rank === 0 ? 0.54 : 0.28));
        beam.addColorStop(0.7, accentAlpha(rank === 0 ? 0.32 : 0.14));
        beam.addColorStop(1, accentAlpha(0));
        ctx.save();
        ctx.filter = `blur(${wide ? 8 : 16}px)`;
        box(cx - step * 0.58, stageY, step * 1.16, stageH, beam, step * 0.18);
        ctx.restore();
        const core = ctx.createLinearGradient(cx - step * 0.46, 0, cx + step * 0.46, 0);
        core.addColorStop(0, accentAlpha(0));
        core.addColorStop(0.5, accentAlpha(rank === 0 ? 0.22 : 0.09));
        core.addColorStop(1, accentAlpha(0));
        box(cx - step * 0.46, stageY + nameH * 0.4, step * 0.92, stageH - nameH * 0.4, core, 8);
      });
      lineup.forEach(({ p, slot }) => {
        const cx = margin + step * (slot + 0.5);
        const photoY = stageY + nameH;
        ctx.save();
        ctx.beginPath();
        ctx.rect(cx - step * 0.49, photoY, step * 0.98, photoH);
        ctx.clip();
        if (!portrait(p, cx - step * 0.53, photoY, step * 1.06, photoH, { radius: 12 })) {
          bigNumber(p.number ?? "–", cx, photoY + photoH * 0.48, Math.min(photoH * 0.72, step * 1.1), step * 0.86);
        }
        ctx.restore();
        nameBlock(p, cx, stageY + 12, step - 16, nameSize, "center");
        if (options.showLogos) {
          const tileY = stageY + stageH - statsH - tileSize * 0.88;
          ctx.save();
          ctx.shadowColor = "rgba(255,255,255,0.35)";
          ctx.shadowBlur = 14;
          box(cx - tileSize / 2, tileY, tileSize, tileSize, "rgba(255,255,255,0.24)", tileSize * 0.2);
          ctx.restore();
          const frost = ctx.createLinearGradient(0, tileY, 0, tileY + tileSize);
          frost.addColorStop(0, "rgba(255,255,255,0.35)");
          frost.addColorStop(1, "rgba(255,255,255,0.08)");
          box(cx - tileSize / 2, tileY, tileSize, tileSize, frost, tileSize * 0.2);
          ctx.save();
          ctx.strokeStyle = "rgba(255,255,255,0.65)";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.roundRect(cx - tileSize / 2, tileY, tileSize, tileSize, tileSize * 0.2);
          ctx.stroke();
          ctx.restore();
          crest(p.team, p.teamLogo, cx, tileY + tileSize / 2, tileSize * 0.76);
        }
        shadowed(() => text(`${statText(p, "pts", season)} PTS · ${statText(p, "eff", season)} IND${perGame}`, cx, stageY + stageH - statsH * 0.2, { size: wide ? 16 : 18, color: theme.ink, max: step - 12, weight: 700, align: "center", face: "poster" }));
      });
      const titleTop = bottom - titleH;
      if (subtitle) shadowed(() => text(subtitle, w / 2, titleTop + subtitleSize * 0.6, { size: subtitleSize, color: theme.headerMuted, max: width, weight: 600, align: "center", spacing: 0.12 }));
      if (title) {
        const cy = bottom - titleSize * 0.55;
        const gradient = ctx.createLinearGradient(0, cy - titleSize / 2, 0, cy + titleSize / 2);
        gradient.addColorStop(0, theme.headerInk);
        gradient.addColorStop(1, theme.accent);
        setFont(titleSize, 700, "poster", 0.01);
        ctx.save();
        ctx.fillStyle = gradient;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.shadowColor = accentAlpha(0.65);
        ctx.shadowBlur = wide ? 12 : 22;
        ctx.fillText(title, w / 2, cy, width);
        ctx.restore();
      }
    } else if (content.mode === "five" && style === "staggered") {
      const players = content.players.slice(0, 5);
      const n = Math.max(1, players.length);
      const step = width / n;
      const center = Math.floor(n / 2);
      const stageH = Math.min(available, width * 0.95);
      const labelH = Math.min(wide ? 52 : 76, stageH * 0.13);
      const statsH = Math.min(wide ? 82 : 106, stageH * 0.2);
      const photoSpace = stageH - labelH - statsH;
      const photoH = Math.min(photoSpace * 0.76, step * 2.2);
      const rise = Math.min(photoSpace * 0.22, step * 0.7);
      const blockH = photoH + rise + labelH + statsH;
      const y0 = contentTop + (available - blockH) * 0.5;
      const lineup = players.map((p, rank) => {
        const slot = center + (rank % 2 ? -1 : 1) * Math.ceil(rank / 2);
        const distance = Math.abs(slot - center) / Math.max(1, center, n - 1 - center);
        return { p, rank, cx: margin + step * (slot + 0.5), ph: photoH * (1 - distance * 0.22), labelY: y0 + photoH + rise * (1 - distance) };
      });
      [...lineup].sort((a, b) => b.rank - a.rank).forEach(({ p, rank, cx, ph, labelY }) => {
        const pw = step * (rank === 0 ? 1.38 : 1.16);
        ctx.save();
        ctx.beginPath();
        ctx.rect(margin, y0, width, blockH);
        ctx.clip();
        if (!portrait(p, cx - pw / 2, labelY - ph, pw, ph, { radius: 12 })) {
          bigNumber(p.number ?? "–", cx, labelY - ph * 0.52, ph * 0.8, step * 0.85);
        }
        crest(p.team, p.teamLogo, cx, labelY - Math.min(ph * 0.2, step * 0.23), Math.min(ph * 0.32, step * 0.4));
        ctx.restore();
      });
      lineup.forEach(({ p, cx, labelY }) => {
        const labelW = step * 0.94;
        const badgeR = Math.min(labelH * 0.24, 18);
        const labelX = cx - labelW / 2;
        box(labelX, labelY, labelW, labelH, "#ffffff", 5);
        text(lastName(p), cx - badgeR * 0.25, labelY + labelH * 0.35, { size: labelH * 0.43, color: "#111827", max: labelW - badgeR * 2 - 10, weight: 700, align: "center", face: "poster" });
        text(p.last ? p.first.toUpperCase() : "", cx, labelY + labelH * 0.77, { size: labelH * 0.21, color: "#4b5563", max: labelW - 16, weight: 600, align: "center", spacing: 0.05 });
        numberBadge(p, labelX + labelW - badgeR * 0.45, labelY + badgeR * 0.25, badgeR);
        const sy = labelY + labelH;
        (["pts", "eff"] as const).forEach((key, k) => {
          const sx = labelX + labelW * (k ? 0.75 : 0.25);
          shadowed(() => text(statText(p, key, season), sx, sy + statsH * 0.34, { size: Math.min(statsH * 0.54, labelW * 0.29), color: theme.accent, max: labelW * 0.46, weight: 700, align: "center", face: "poster" }));
          const pillW = labelW * 0.42;
          const pillH = statsH * 0.23;
          box(sx - pillW / 2, sy + statsH * 0.67, pillW, pillH, theme.panel, pillH / 2);
          text(`${statOf(key).short}${season ? "/UT" : ""}`, sx, sy + statsH * 0.785, { size: Math.min(15, pillH * 0.65), color: theme.ink, max: pillW - 8, weight: 700, align: "center", spacing: 0.05 });
        });
      });
    } else if (content.mode === "five" && style === "zigzag") {
      const players = content.players.slice(0, 5);
      const n = Math.max(1, players.length);
      const gap = wide ? 16 : 20;
      const baseH = Math.min(available / (1.12 + (n - 1) * 0.7), story ? 430 : 330);
      const stepY = n > 1 ? (available - baseH) / (n - 1) : 0;
      const heroW = width * 0.32;
      const columns = Math.ceil(Math.max(0, n - 1) / 2);
      const smallW = (width - heroW - columns * gap) / Math.max(1, columns);
      players.forEach((p, i) => {
        const left = i % 2 === 0;
        const bw = wide ? i === 0 ? heroW : smallW : width * (i === 0 ? 0.5 : 0.47);
        const bh = wide ? i === 0 ? available : (available - gap) / 2 : baseH * (i === 0 ? 1.12 : 1);
        const x = wide ? i === 0 ? margin : margin + heroW + gap + Math.floor((i - 1) / 2) * (smallW + gap) : left ? margin : w - margin - bw;
        const y = wide ? contentTop + (i > 0 && !left ? (available + gap) / 2 : 0) : contentTop + i * stepY + (n === 1 ? (available - bh) / 2 : 0);
        const barH = Math.min(48, bh * 0.17);
        const ph = bh - barH - 12;
        const sideW = bw * 0.21;
        const px = x + sideW;
        const pw = bw - sideW * 2;
        panel(x, y, bw, bh, 12, i === 0);
        ctx.save();
        ctx.beginPath();
        ctx.rect(px, y + 4, pw, ph);
        ctx.clip();
        if (!portrait(p, px, y + 4, pw, ph, { radius: 10 })) {
          bigNumber(p.number ?? "–", px + pw / 2, y + ph * 0.5, Math.min(ph * 0.8, pw * 1.2), pw * 0.9);
        }
        ctx.restore();
        const innerX = x + bw * (left ? 0.895 : 0.105);
        const outerX = x + bw * (left ? 0.105 : 0.895);
        const crestSize = Math.min(sideW * 0.82, ph * 0.3);
        crest(p.team, p.teamLogo, innerX, y + ph * 0.23, crestSize);
        text("INDEKS", innerX, y + ph * 0.51, { size: Math.min(14, sideW * 0.17), color: theme.muted, max: sideW - 6, weight: 700, align: "center", spacing: 0.03 });
        text(statText(p, "eff", season), innerX, y + ph * 0.72, { size: Math.min(ph * 0.27, sideW * 0.55), color: theme.accent, max: sideW - 6, weight: 700, align: "center", face: "poster" });
        (["pts", "ast", "reb"] as const).forEach((key, k) => {
          const sy = y + ph * (k / 3 + 0.12);
          text(statText(p, key, season), outerX, sy, { size: Math.min(ph * 0.17, sideW * 0.4), color: theme.ink, max: sideW - 6, weight: 700, align: "center", face: "poster" });
          text(statOf(key).short, outerX, sy + ph * 0.13, { size: Math.min(13, ph * 0.075), color: theme.muted, max: sideW - 6, weight: 700, align: "center", spacing: 0.04 });
        });
        box(x, y + bh - barH, bw, barH, theme.accent, 5);
        text(fullName(p), x + bw / 2, y + bh - barH / 2, { size: Math.min(28, barH * 0.56), color: inkOn(theme.accent), max: bw - 18, weight: 700, align: "center", face: "poster", spacing: 0.01 });
      });
    } else if (content.mode === "five" && style === "court") {
      // Na terenu: pet igrača na mjestima napada (centar pod košem, krila, uglovi, plej)
      const players = content.players;
      // Tamna podloga ispod nacrtanog terena, da se ne miješa s linijama na pozadini
      const m = Math.min(width / 15, available / 14);
      ctx.save();
      ctx.globalAlpha = 0.62;
      box(margin + (width - 15 * m) / 2 - 10, contentTop + (available - 14 * m) / 2 - 10, 15 * m + 20, 14 * m + 20, theme.bg, 18);
      ctx.restore();
      const at = halfCourt(margin, contentTop, width, available, accentAlpha(0.6), wide ? 2 : 3);
      const spots: [number, number][] = [[7.5, 4.4], [2.6, 7.4], [12.4, 7.4], [3.4, 11.6], [11.6, 11.6]];
      const r = wide ? 26 : story ? 52 : 44;
      const tagW = wide ? 190 : story ? 330 : 280;
      const tagH = wide ? 74 : story ? 132 : 112;
      players.slice(0, 5).forEach((p, i) => {
        const spot = at(...spots[i]);
        const cx = Math.min(Math.max(spot.x, margin + tagW / 2), w - margin - tagW / 2);
        const cy = spot.y;
        const ty = cy + r * 0.55;
        panel(cx - tagW / 2, ty, tagW, tagH, 14, i === 0);
        // Krug s fotografijom stoji iznad natpisa (dodiruje mu gornji rub), bez fotografije broj dresa na rubu
        const R = hasPhoto(p) ? r * 1.3 : r;
        marker(p, cx, hasPhoto(p) ? ty - R * 0.92 : cy, R);
        if (options.showLogos) crest(p.team, p.teamLogo, cx + r + tagW * 0.12, cy - r * 0.2, r * 1.15);
        const nameSize = tagH * 0.27;
        text(lastName(p), cx, ty + r * 0.45 + nameSize * 0.6, { size: nameSize, color: theme.ink, max: tagW - 20, weight: 700, align: "center", face: "poster", spacing: 0.01 });
        const sub = `${p.first.toUpperCase()} · ${p.team.toUpperCase()}`;
        text(sub, cx, ty + r * 0.45 + nameSize * 1.45, { size: Math.max(11, tagH * 0.105), color: theme.muted, max: tagW - 20, weight: 600, align: "center", spacing: 0.04 });
        const keys = ["pts", "reb", "ast", "eff"] as const;
        const line2 = keys.map((key) => `${statText(p, key, season)} ${statOf(key).short}`).join("  ");
        text(line2, cx, ty + tagH - tagH * 0.16, { size: Math.max(12, tagH * 0.14), color: theme.accent, max: tagW - 20, weight: 700, align: "center", face: "poster", spacing: 0.04 });
      });
    } else if (content.mode === "five" && style === "list") {
      // Lista: pet redova s brojkama u kolonama
      const players = content.players;
      const keys: SocialStatKey[] = ["pts", "reb", "ast", "eff"];
      const headerH = wide ? 34 : 46;
      const gap = 10;
      const rowH = Math.min(story ? 210 : 170, (available - headerH - gap * players.length) / Math.max(1, players.length));
      const y0 = contentTop + Math.max(0, available - headerH - players.length * (rowH + gap)) * 0.4;
      const statsW = width * (wide ? 0.42 : 0.44);
      const sx = margin + width - statsW;
      keys.forEach((key, k) => text(`${statOf(key).short}${perGame}`, sx + statsW / keys.length * (k + 0.5), y0 + headerH / 2, { size: wide ? 14 : 17, color: theme.accent, max: statsW / keys.length, weight: 700, align: "center", spacing: 0.1 }));
      players.forEach((p, i) => {
        const y = y0 + headerH + i * (rowH + gap);
        const cy = y + rowH / 2;
        panel(margin, y, width, rowH, 14, i === 0);
        const r = rowH * (hasPhoto(p) ? 0.38 : 0.3);
        marker(p, margin + 24 + r, cy, r);
        const logo = options.showLogos ? rowH * 0.42 : 0;
        if (logo) crest(p.team, p.teamLogo, margin + 24 + r * 2 + 18 + logo / 2, cy, logo);
        const nx = margin + 24 + r * 2 + 18 + logo + (logo ? 18 : 0);
        const nmax = sx - nx - 16;
        text(lastName(p), nx, cy - rowH * 0.1, { size: Math.min(rowH * 0.3, 46), color: theme.ink, max: nmax, weight: 700, face: "poster", spacing: 0.01 });
        text(`${p.first.toUpperCase()} · ${p.team.toUpperCase()}`, nx, cy + rowH * 0.2, { size: Math.min(rowH * 0.12, 18), color: theme.muted, max: nmax, weight: 600, spacing: 0.05 });
        keys.forEach((key, k) => text(statText(p, key, season), sx + statsW / keys.length * (k + 0.5), cy, { size: Math.min(rowH * 0.36, 54), color: key === "eff" ? theme.accent : theme.ink, max: statsW / keys.length - 8, weight: 700, align: "center", face: "poster" }));
      });
    } else if (content.mode === "five") {
      // Kartice: broj dresa iza grba, ime, ekipa i četiri brojke
      const players = content.players;
      const n = players.length;
      const cols = wide ? Math.min(5, n) : story ? 2 : Math.min(3, n);
      const rows = Math.ceil(n / cols);
      const gap = wide ? 16 : 22;
      const cardW = (width - (cols - 1) * gap) / cols;
      const cardH = Math.min((available - (rows - 1) * gap) / rows, cardW * 1.5);
      const y0 = contentTop + Math.max(0, available - rows * cardH - (rows - 1) * gap) / 2;
      players.forEach((p, i) => {
        const row = Math.floor(i / cols);
        const inRow = row === rows - 1 ? n - row * cols : cols;
        const x = (w - (inRow * cardW + (inRow - 1) * gap)) / 2 + (i - row * cols) * (cardW + gap);
        const y = y0 + row * (cardH + gap);
        panel(x, y, cardW, cardH, Math.min(18, cardW * 0.07), i === 0);
        // Odozdo: brojke, ekipa, ime; ostatak kartice je fotografija (ili broj dresa i grb), s razmakom do imena
        const pad = Math.min(18, cardW * 0.07);
        const nameSize = Math.min(cardW * 0.15, cardH * 0.09, 46);
        const statsH = Math.min(cardH * 0.2, 96);
        const textH = nameSize * 0.4 * 0.62 + nameSize * 1.12 + nameSize * 0.55;
        const topH = cardH - statsH - textH - pad * 2;
        if (p.number) bigNumber(p.number, x + cardW / 2, y + pad + topH * 0.5, topH * 0.9, cardW * 0.9);
        if (portrait(p, x + cardW * 0.08, y + pad, cardW * 0.84, topH, { radius: 14 })) {
          const small = Math.min(cardW * 0.2, 60);
          crest(p.team, p.teamLogo, x + cardW - small / 2 - 10, y + small / 2 + 10, small);
        } else crest(p.team, p.teamLogo, x + cardW / 2, y + pad + topH * 0.5, Math.min(topH * 0.62, cardW * 0.5));
        let ty = y + pad + topH + pad * 0.6 + nameSize * 0.2;
        ty += nameBlock(p, x + cardW / 2, ty, cardW - pad * 2, nameSize, "center");
        text(p.team.toUpperCase(), x + cardW / 2, ty + nameSize * 0.05, { size: Math.max(11, nameSize * 0.34), color: theme.muted, max: cardW - pad * 2, weight: 600, align: "center", spacing: 0.06 });
        const keys: SocialStatKey[] = cardW < 230 ? ["pts", "reb", "eff"] : ["pts", "reb", "ast", "eff"];
        line(x + pad, y + cardH - statsH, x + cardW - pad, y + cardH - statsH, theme.line, 1.5);
        statCells(p, keys, x + pad, y + cardH - statsH, cardW - pad * 2, statsH, "short");
      });
    }

    // ── Lideri ─────────────────────────────────────────────

    if (content.mode === "leaders" && style === "board") {
      // Tabla: red po kategoriji (oznaka, broj dresa, ime i ekipa, vrijednost), drugi i treći ispod imena
      const categories = content.categories.filter((c) => c.players.length);
      const n = Math.max(1, categories.length);
      const gap = hasPanel ? 10 : 0;
      const rowH = Math.min(story ? 220 : 170, (available - (n - 1) * gap) / n);
      const y0 = contentTop + Math.max(0, available - n * rowH - (n - 1) * gap) * 0.4;
      const labelW = width * 0.25;
      const valueW = width * 0.17;
      categories.forEach((category, i) => {
        const [leader, ...rest] = category.players;
        const y = y0 + i * (rowH + gap);
        const cy = y + rowH / 2;
        panel(margin, y, width, rowH, 14);
        box(margin, y, labelW, rowH, accentAlpha(0.16), 14);
        text(statOf(category.key).label.toUpperCase(), margin + 20, cy, { size: Math.min(rowH * 0.17, 28), color: theme.accent, max: labelW - 30, weight: 700, face: "poster", spacing: 0.04 });
        const r = rowH * (hasPhoto(leader) ? 0.3 : 0.22);
        marker(leader, margin + labelW + 22 + r, hasPhoto(leader) ? cy : cy - rowH * 0.08, r, false);
        const nx = margin + labelW + 22 + r * 2 + 18;
        const nmax = width - valueW - (nx - margin) - 10;
        text(fullName(leader), nx, cy - rowH * 0.2, { size: Math.min(rowH * 0.22, 38), color: theme.ink, max: nmax, weight: 700, face: "poster", spacing: 0.01 });
        const logo = options.showLogos ? rowH * 0.16 : 0;
        if (logo) crest(leader.team, leader.teamLogo, nx + logo / 2, cy + rowH * 0.04, logo);
        text(leader.team.toUpperCase(), nx + logo + (logo ? 8 : 0), cy + rowH * 0.04, { size: Math.min(rowH * 0.1, 17), color: theme.muted, max: nmax - logo, weight: 600, spacing: 0.05 });
        const runners = rest.slice(0, 2).map((q, k) => `${k + 2}. ${lastName(q)} ${statText(q, category.key, season)}`).join("   ");
        if (runners) text(runners, nx, cy + rowH * 0.28, { size: Math.min(rowH * 0.1, 17), color: theme.muted, max: nmax, weight: 600, spacing: 0.04 });
        text(statText(leader, category.key, season), margin + width - 22, cy - rowH * 0.06, { size: Math.min(rowH * 0.42, 74), color: theme.ink, max: valueW, weight: 700, align: "right", face: "poster" });
        text(`${statOf(category.key).short}${perGame}`, margin + width - 22, cy + rowH * 0.3, { size: Math.min(rowH * 0.09, 15), color: theme.muted, max: valueW, weight: 600, align: "right", spacing: 0.1 });
      });
    } else if (content.mode === "leaders") {
      // Pločice: kategorija, ogroman broj, grb ekipe desno, ime, drugi i treći
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
        const stat = statOf(category.key);
        const row = Math.floor(i / cols);
        const inRow = row === rows - 1 ? n - row * cols : cols;
        const x = (w - (inRow * tileW + (inRow - 1) * gap)) / 2 + (i - row * cols) * (tileW + gap);
        const y = y0 + row * (tileH + gap);
        const radius = Math.min(18, tileH * 0.08);
        panel(x, y, tileW, tileH, radius);
        const pad = Math.min(22, tileW * 0.05);
        // Broj dresa i grb desno gore
        let side = Math.min(tileW * 0.36, tileH * 0.5);
        const sx = x + tileW - pad - side / 2;
        const sy = y + pad + side / 2 + 4;
        if (hasPhoto(leader)) {
          // Fotografija desno do dna pločice, grb u gornjem desnom uglu
          const fw = tileW * 0.42;
          ctx.save();
          ctx.beginPath();
          ctx.roundRect(x, y, tileW, tileH, radius);
          ctx.clip();
          portrait(leader, x + tileW - fw - pad * 0.3, y + tileH * 0.14, fw, tileH * 0.86 - pad * 0.3, { radius: 12 });
          ctx.restore();
          const small = Math.min(tileH * 0.2, 56);
          crest(leader.team, leader.teamLogo, x + tileW - pad - small / 2, y + pad + small / 2, small);
          side = fw;
        } else {
          if (leader.number) bigNumber(leader.number, sx, sy, side * 1.15, side * 1.1);
          crest(leader.team, leader.teamLogo, sx, sy, side * 0.72);
        }
        const tw = tileW - pad * 2;
        const label = Math.min(26, tileH * 0.085);
        text(stat.label.toUpperCase(), x + pad, y + pad + label * 0.5, { size: label, color: theme.accent, max: tw - side, weight: 700, face: "poster", spacing: 0.06 });
        const valueSize = Math.min(tileH * 0.27, tileW * 0.3);
        const vy = y + pad + label + valueSize * 0.6;
        shadowed(() => text(statText(leader, category.key, season), x + pad, vy, { size: valueSize, color: theme.ink, max: tw - side, weight: 700, face: "poster" }));
        text(`${stat.unit}${season ? " PO UTAKMICI" : ""}`, x + pad, vy + valueSize * 0.58, { size: Math.max(11, label * 0.62), color: theme.muted, max: tw - side, weight: 600, spacing: 0.1 });
        const nameSize = Math.min(tileH * 0.1, 34);
        let ny = vy + valueSize * 0.58 + nameSize * 1.05;
        ny += nameBlock(leader, x + pad, ny, hasPhoto(leader) ? tw - side : tw, nameSize);
        const small = Math.max(12, Math.min(18, tileH * 0.058));
        // Drugi i treći samo ako ne dodiruju ime; naziv ekipe samo kad ima mjesta (grb je uvijek tu)
        const runnersTop = y + tileH - pad - 2 * small * 1.5;
        const shown = ny - nameSize * 0.3 < runnersTop ? rest.slice(0, 2) : [];
        const teamSize = Math.max(11, nameSize * 0.42);
        if (ny + nameSize * 0.1 + teamSize * 0.6 < (shown.length ? runnersTop : y + tileH - pad)) {
          text(leader.team.toUpperCase(), x + pad, ny + nameSize * 0.1, { size: teamSize, color: theme.muted, max: tw, weight: 600, spacing: 0.06 });
        }
        shown.forEach((q, k) => {
          const ry = y + tileH - pad - (shown.length - 1 - k) * small * 1.5 - small * 0.4;
          text(`${k + 2}. ${lastName(q)}`, x + pad, ry, { size: small, color: theme.muted, max: tw - 70 - (hasPhoto(leader) ? side : 0), weight: 600, spacing: 0.04 });
          text(statText(q, category.key, season), x + tileW - pad - (hasPhoto(leader) ? side + 8 : 0), ry, { size: small, color: theme.ink, max: 60, weight: 700, align: "right", face: "poster" });
        });
      });
    }

    // ── Top lista ─────────────────────────────────────────────

    if (content.mode === "top") {
      const stat = statOf(content.key);
      const all = content.players;
      /** Red liste: mjesto, broj dresa, grb, ime i ekipa, vrijednost */
      const listRow = (p: SocialStatPlayer, rank: number, y: number, rowH: number, index: number, last: boolean) => {
        const cy = y + rowH / 2;
        const first = rank === 1;
        rowSurface(margin, y, width, rowH, last, panelAlpha * (hasPanel && index % 2 ? 0.88 : 1), Math.min(12, rowH * 0.16));
        if (first) box(margin, y, 6, rowH, theme.accent, 3);
        const rankW = rowH * 0.8;
        text(String(rank), margin + rankW / 2, cy, { size: rowH * 0.42, color: first ? theme.accent : theme.muted, max: rankW, weight: 700, align: "center", face: "poster" });
        const r = rowH * (hasPhoto(p) ? 0.4 : 0.3);
        marker(p, margin + rankW + r, cy, r, first);
        const logo = options.showLogos ? rowH * 0.5 : 0;
        const lx = margin + rankW + r * 2 + 16;
        if (logo) crest(p.team, p.teamLogo, lx + logo / 2, cy, logo);
        const nx = lx + logo + (logo ? 16 : 0);
        const valueW = width * 0.18;
        const nameMax = width - (nx - margin) - valueW - 10;
        text(fullName(p), nx, cy - rowH * 0.13, { size: Math.min(rowH * 0.3, 40), color: theme.ink, max: nameMax, weight: 700, face: "poster", spacing: 0.01 });
        const detail = [p.team.toUpperCase(), season ? `${p.games} UT` : p.game ? `${p.game.teamScore}:${p.game.opponentScore} ${p.game.opponent.toUpperCase()}` : null].filter(Boolean).join("  ·  ");
        text(detail, nx, cy + rowH * 0.22, { size: Math.min(rowH * 0.15, 19), color: theme.muted, max: nameMax, weight: 600, spacing: 0.05 });
        text(statText(p, content.key, season), margin + width - 24, cy - rowH * 0.06, { size: rowH * 0.46, color: first ? theme.accent : theme.ink, max: valueW, weight: 700, align: "right", face: "poster" });
        text(`${stat.short}${perGame}`, margin + width - 24, cy + rowH * 0.3, { size: Math.min(rowH * 0.13, 16), color: theme.muted, max: valueW, weight: 600, align: "right", spacing: 0.1 });
      };

      if (style === "podium" && all.length >= 3 && content.firstRank === 1) {
        // Podij: drugi lijevo, prvi u sredini (najviši), treći desno; ostali u listi ispod
        const rest = all.slice(3);
        const listH = rest.length ? Math.min(available * (story ? 0.5 : 0.56), rest.length * (story ? 124 : wide ? 54 : 84)) : 0;
        const podiumH = available - listH - (rest.length ? 24 : 0);
        const colW = (width - 2 * 18) / 3;
        const order = [1, 0, 2];
        const heights = [0.62, 0.8, 0.5];
        order.forEach((idx, slot) => {
          const p = all[idx];
          const x = margin + slot * (colW + 18);
          const blockH = podiumH * heights[idx] * 0.55;
          const by = contentTop + podiumH - blockH;
          panel(x, by, colW, blockH, 16, idx === 0);
          bigNumber(String(idx + 1), x + colW / 2, by + blockH * 0.5, blockH * 0.85, colW * 0.8);
          const valueSize = Math.min(blockH * 0.34, colW * 0.34);
          text(statText(p, content.key, season), x + colW / 2, by + blockH * 0.42, { size: valueSize, color: idx === 0 ? theme.accent : theme.ink, max: colW - 20, weight: 700, align: "center", face: "poster" });
          text(`${stat.unit}${perGame}`, x + colW / 2, by + blockH * 0.42 + valueSize * 0.62, { size: Math.max(11, valueSize * 0.2), color: theme.muted, max: colW - 20, weight: 600, align: "center", spacing: 0.1 });
          // Iznad bloka: grb, broj i ime
          const crestSize = Math.min(colW * 0.48, podiumH * 0.22);
          const above = by - 14;
          const nameSize = Math.min(colW * 0.13, 40);
          const nameTop = above - nameSize * 1.9;
          nameBlock(p, x + colW / 2, nameTop, colW - 12, nameSize, "center");
          const photoH = Math.min(crestSize * 2, nameTop - nameSize * 0.6 - contentTop - 6);
          if (photoH > 60 && portrait(p, x + colW * 0.12, nameTop - nameSize * 0.6 - photoH, colW * 0.76, photoH, { radius: 14 })) {
            const small = Math.min(crestSize * 0.5, 54);
            crest(p.team, p.teamLogo, x + colW - small / 2 - 6, nameTop - nameSize * 0.6 - photoH + small / 2, small);
          } else {
            crest(p.team, p.teamLogo, x + colW / 2, nameTop - nameSize * 0.6 - crestSize / 2, crestSize);
            jersey(p, x + colW / 2 + crestSize * 0.46, nameTop - nameSize * 0.6 - crestSize * 0.12, Math.max(16, crestSize * 0.2), idx === 0);
          }
        });
        if (rest.length) {
          const rowH = (listH - (rest.length - 1) * 6) / rest.length;
          rest.forEach((p, i) => listRow(p, 4 + i, contentTop + podiumH + 24 + i * (rowH + 6), rowH, i, i === rest.length - 1));
        }
      } else {
        const n = Math.max(1, all.length);
        const gap = hasPanel ? 8 : 0;
        const rowH = Math.min(story ? 150 : wide ? 70 : 118, (available - (n - 1) * gap) / n);
        const y0 = contentTop + Math.max(0, available - n * rowH - (n - 1) * gap) * 0.35;
        all.forEach((p, i) => listRow(p, content.firstRank + i, y0 + i * (rowH + gap), rowH, i, i === n - 1));
      }
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

import type { SocialMatch } from "@/lib/data/social";
import { formatDate, formatTime, formatWeekday } from "@/lib/format";

export const SOCIAL_FORMATS = [
  { id: "portrait", name: "Objava · 4:5", detail: "Instagram / Facebook", width: 1080, height: 1350 },
  { id: "square", name: "Kvadrat · 1:1", detail: "Instagram / Facebook", width: 1080, height: 1080 },
  { id: "story", name: "Story · 9:16", detail: "Instagram / Facebook", width: 1080, height: 1920 },
  { id: "landscape", name: "Široka objava", detail: "Facebook", width: 1200, height: 630 },
] as const;

export const KSKS_LOGO = "/brand/ksks-logo-512.png";

/** Savez u zaglavlju slike; KSBIH lige (A1 žene, A2 jug) imaju i grb saveza kao vodeni žig iza utakmica */
export const SOCIAL_BRANDS = {
  ksks: { logo: KSKS_LOGO, name: "KSKS", lines: ["KOŠARKAŠKI SAVEZ", "KANTONA SARAJEVO"], footer: "Košarkaški savez Kantona Sarajevo", watermark: false },
  ksbih: { logo: "/competitions/ksbih.png", name: "KSBIH", lines: ["KOŠARKAŠKI SAVEZ", "BOSNE I HERCEGOVINE"], footer: "Košarkaški savez Bosne i Hercegovine", watermark: true },
} as const;
const ARENA = "/social/arena-background-v1.png";
const PARQUET = "/social/parquet-background-v1.png";

export const SOCIAL_TEMPLATES = [
  { id: "arena", name: "Noć u dvorani", description: "Dvorana pod reflektorima, zlatni detalji", bg: "#101827", panel: "rgba(15,25,43,0.90)", ink: "#ffffff", muted: "#c7d3e5", accent: "#ffc674", line: "#46546b", background: ARENA, overlay: "rgba(6,13,27,0.32)", headerInk: "#ffffff", headerMuted: "#d2d9e6" },
  { id: "paper", name: "Čisti raspored", description: "Bijelo-plavi službeni raspored", bg: "#edf2f8", panel: "#ffffff", ink: "#142b4a", muted: "#50647d", accent: "#1c4ccd", line: "#cbd7e6", background: null, overlay: "transparent", headerInk: "#142b4a", headerMuted: "#50647d" },
  { id: "court", name: "Na parketu", description: "Pravi parket i topli narandžasti tonovi", bg: "#633713", panel: "rgba(28,23,20,0.92)", ink: "#ffffff", muted: "#e0cbb7", accent: "#ffad66", line: "#7b5b40", background: PARQUET, overlay: "rgba(35,19,8,0.28)", headerInk: "#ffffff", headerMuted: "#f2dcc4" },
  { id: "royal", name: "KSKS Royal", description: "Boje saveza: ljubičasta i zlato", bg: "#211348", panel: "rgba(33,19,72,0.92)", ink: "#ffffff", muted: "#d9d0ec", accent: "#efc45b", line: "#655183", background: ARENA, overlay: "rgba(36,12,75,0.66)", headerInk: "#ffffff", headerMuted: "#e0d7ef" },
  { id: "gold", name: "Zlatni termin", description: "Crni parket, bronza i zlato", bg: "#17130d", panel: "rgba(23,20,15,0.94)", ink: "#fffaf0", muted: "#d8c7a7", accent: "#e9c675", line: "#736144", background: PARQUET, overlay: "rgba(8,8,10,0.68)", headerInk: "#fff4dc", headerMuted: "#e5cfa7" },
  { id: "ice", name: "Plavi reflektori", description: "Hladna plava dvorana i svijetli grbovi", bg: "#082a43", panel: "rgba(6,36,59,0.93)", ink: "#ffffff", muted: "#b8d8ea", accent: "#7fe2ff", line: "#3a738f", background: ARENA, overlay: "rgba(0,39,66,0.60)", headerInk: "#ffffff", headerMuted: "#c3e7f6" },
  { id: "editorial", name: "Sportski magazin", description: "Krem papir, bordo i izražena tipografija", bg: "#f5eee3", panel: "#fffdf8", ink: "#47221c", muted: "#776254", accent: "#8e3025", line: "#d3bb9c", background: null, overlay: "transparent", headerInk: "#47221c", headerMuted: "#776254" },
  { id: "derby", name: "Derbi večer", description: "Bordo dvorana za velike susrete", bg: "#3e1019", panel: "rgba(49,12,23,0.93)", ink: "#ffffff", muted: "#ebc9cf", accent: "#ffc18c", line: "#80505b", background: ARENA, overlay: "rgba(65,6,20,0.65)", headerInk: "#ffffff", headerMuted: "#f5d7dc" },
] as const;

export type SocialFormat = (typeof SOCIAL_FORMATS)[number]["id"];
export type SocialTemplate = (typeof SOCIAL_TEMPLATES)[number]["id"];
export type SocialBrand = keyof typeof SOCIAL_BRANDS;
export type SocialOptions = {
  brand: SocialBrand;
  format: SocialFormat;
  template: SocialTemplate;
  title: string;
  subtitle: string;
  footer: string;
  showHall: boolean;
  showCompetition: boolean;
  showLogos: boolean;
};

const imageCache = new Map<string, Promise<HTMLImageElement | null>>();
const crestBounds = new WeakMap<HTMLImageElement, { x: number; y: number; width: number; height: number }>();

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

export async function renderSocialImage(matches: SocialMatch[], options: SocialOptions, page: number, pages: number) {
  const format = SOCIAL_FORMATS.find((f) => f.id === options.format)!;
  const theme = SOCIAL_TEMPLATES.find((t) => t.id === options.template)!;
  const brand = SOCIAL_BRANDS[options.brand];
  const font = getComputedStyle(document.body).fontFamily;
  const postponedFont = getComputedStyle(document.body).getPropertyValue("--font-geist-mono").trim() || "monospace";
  const urls = options.showLogos ? [...new Set(matches.flatMap((m) => [m.homeLogo, m.awayLogo]).filter((url): url is string => Boolean(url)))] : [];
  const [loaded, brandLogo, background] = await Promise.all([
    Promise.all(urls.map(async (url) => [url, await loadImage(url)] as const)),
    loadImage(brand.logo),
    theme.background ? loadImage(theme.background) : Promise.resolve(null),
    document.fonts.load(`700 36px ${font}`, "ČĆŠĐŽčćšđž"),
    matches.some((match) => match.status === "postponed") ? document.fonts.load(`700 36px ${postponedFont}`, "ODGOĐENO") : Promise.resolve(),
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
  const margin = 54;
  const dense = matches.length > 3;
  const top = story ? 150 : wide || dense ? 28 : 42;

  function box(x: number, y: number, width: number, height: number, fill: string, radius = 18) {
    ctx!.fillStyle = fill;
    ctx!.beginPath();
    ctx!.roundRect(x, y, width, height, radius);
    ctx!.fill();
  }

  function text(value: string, x: number, y: number, size: number, color: string, maxWidth: number, weight = 600, align: CanvasTextAlign = "left") {
    ctx!.fillStyle = color;
    ctx!.textAlign = align;
    ctx!.textBaseline = "middle";
    let fitted = size;
    ctx!.font = `${weight} ${fitted}px ${font}`;
    while (ctx!.measureText(value).width > maxWidth && fitted > size * 0.7) {
      fitted -= 1;
      ctx!.font = `${weight} ${fitted}px ${font}`;
    }
    ctx!.fillText(value, x, y, maxWidth);
  }

  function postponedLabel(x: number, y: number, size: number, maxWidth: number) {
    ctx!.save();
    const letters = [..."ODGOĐENO"];
    let fitted = size;
    ctx!.font = `700 ${fitted}px ${postponedFont}`;
    while (ctx!.measureText("ODGOĐENO").width + fitted * 0.08 * (letters.length - 1) > maxWidth && fitted > 8) {
      fitted -= 1;
      ctx!.font = `700 ${fitted}px ${postponedFont}`;
    }
    const spacing = fitted * 0.08;
    const widths = letters.map((letter) => ctx!.measureText(letter).width);
    const width = widths.reduce((sum, value) => sum + value, 0) + spacing * (letters.length - 1);
    ctx!.fillStyle = theme.background ? "#ff7474" : "#b91c1c";
    ctx!.textAlign = "left";
    ctx!.textBaseline = "middle";
    let cursor = x - width / 2;
    letters.forEach((letter, index) => {
      ctx!.fillText(letter, cursor, y);
      cursor += widths[index] + spacing;
    });
    ctx!.restore();
  }

  function contain(image: HTMLImageElement, x: number, y: number, size: number, padding = 0) {
    const scale = (size - padding * 2) / Math.max(image.naturalWidth, image.naturalHeight);
    const width = image.naturalWidth * scale;
    const height = image.naturalHeight * scale;
    ctx!.drawImage(image, x + (size - width) / 2, y + (size - height) / 2, width, height);
  }

  /** Crta samo vidljivi (neprovidni) dio slike, centriran u kvadratu */
  function containVisible(image: HTMLImageElement, x: number, y: number, size: number, padding = 0) {
    const bounds = visibleBounds(image);
    const scale = (size - padding * 2) / Math.max(bounds.width, bounds.height);
    const width = bounds.width * scale;
    const height = bounds.height * scale;
    ctx!.drawImage(image, bounds.x, bounds.y, bounds.width, bounds.height, x + (size - width) / 2, y + (size - height) / 2, width, height);
  }

  function crest(name: string, url: string | null, centerX: number, centerY: number, size: number) {
    if (!options.showLogos) return;
    const x = centerX - size / 2;
    const y = centerY - size / 2;
    box(x, y, size, size, "#ffffff", size * 0.17);
    const logo = url ? logos.get(url) : null;
    if (logo) containVisible(logo, x, y, size, 4);
    else text(name.trim().split(/\s+/).map((word) => word[0]).slice(0, 2).join(""), centerX, centerY, size * 0.30, "#25354b", size - 16, 800, "center");
  }

  function teamName(name: string, x: number, y: number, width: number, size: number) {
    ctx!.font = `700 ${size}px ${font}`;
    if (ctx!.measureText(name).width <= width) {
      text(name, x, y, size, theme.ink, width, 700, "center");
      return;
    }
    const words = name.trim().split(/\s+/);
    let split = 1;
    let best = Infinity;
    for (let i = 1; i < words.length; i++) {
      const widthA = ctx!.measureText(words.slice(0, i).join(" ")).width;
      const widthB = ctx!.measureText(words.slice(i).join(" ")).width;
      const score = Math.max(widthA, widthB);
      if (score < best) { best = score; split = i; }
    }
    text(words.slice(0, split).join(" "), x, y - size * 0.55, size, theme.ink, width, 700, "center");
    text(words.slice(split).join(" "), x, y + size * 0.65, size, theme.ink, width, 700, "center");
  }

  ctx.fillStyle = theme.bg;
  ctx.fillRect(0, 0, w, h);
  if (background) {
    const scale = Math.max(w / background.naturalWidth, h / background.naturalHeight);
    const bw = background.naturalWidth * scale;
    const bh = background.naturalHeight * scale;
    ctx.drawImage(background, (w - bw) / 2, (h - bh) / 2, bw, bh);
    ctx.fillStyle = theme.overlay;
    ctx.fillRect(0, 0, w, h);
  } else {
    ctx.save();
    ctx.globalAlpha = 0.08;
    ctx.strokeStyle = theme.accent;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(w - 50, 90, 260, 0, Math.PI * 2);
    ctx.arc(w - 50, 90, 185, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  const brandSize = wide || dense ? 82 : 98;
  box(margin, top, brandSize, brandSize, "#ffffff", 18);
  // KSBIH grb ima mnogo praznog prostora oko sebe, pa se crta samo vidljivi dio
  if (options.brand === "ksbih") containVisible(brandLogo, margin, top, brandSize, 6);
  else contain(brandLogo, margin, top, brandSize, 6);
  const brandX = margin + brandSize + 22;
  text(brand.name, brandX, top + brandSize * 0.33, wide ? 25 : 30, theme.headerInk, 160, 800);
  text(brand.lines[0], brandX, top + brandSize * 0.65, 16, theme.headerMuted, 380, 700);
  text(brand.lines[1], brandX, top + brandSize * 0.85, 16, theme.headerMuted, 380, 700);
  if (wide) {
    text(options.title.trim() || "Raspored utakmica", 490, top + 35, 43, theme.headerInk, w - 490 - margin, 800);
    if (options.subtitle.trim()) text(options.subtitle.trim(), 490, top + 77, 21, theme.headerMuted, w - 490 - margin, 500);
  } else {
    text(options.title.trim() || "Raspored utakmica", margin, top + (dense ? 122 : 151), dense ? 58 : 66, theme.headerInk, w - margin * 2, 800);
    if (options.subtitle.trim()) text(options.subtitle.trim(), margin, top + (dense ? 167 : 204), dense ? 22 : 25, theme.headerMuted, w - margin * 2, 500);
    else box(margin, top + (dense ? 163 : 198), 84, 5, theme.accent, 2);
  }

  const contentTop = top + (wide ? 116 : dense ? 196 : 246);
  const bottom = h - (story ? 200 : wide ? 62 : 96);
  const available = bottom - contentTop;
  const gap = dense ? 12 : 22;
  const solo = matches.length === 1;
  const columns = wide && matches.length > 3 ? 2 : 1;
  const rowCount = Math.ceil(matches.length / columns);
  const rowHeight = (available - (rowCount - 1) * gap) / Math.max(1, rowCount);
  const cardWidth = (w - margin * 2 - (columns - 1) * gap) / columns;

  // Vodeni žig: veliki grb saveza iza utakmica; kartice su tada providnije da se vidi
  if (brand.watermark) {
    const size = Math.min(w - margin * 2, available) * 0.92;
    ctx.save();
    ctx.globalAlpha = theme.background ? 0.3 : 0.16;
    containVisible(brandLogo, (w - size) / 2, contentTop + (available - size) / 2, size);
    ctx.restore();
  }
  const cardAlpha = brand.watermark ? (theme.background ? 0.62 : 0.72) : 1;

  matches.forEach((m, index) => {
    const postponed = m.status === "postponed";
    const dateLabel = postponed ? "Novi termin naknadno" : `${formatWeekday(m.startsAt).toUpperCase()} · ${formatDate(m.date)}`;
    const y = contentTop + Math.floor(index / columns) * (rowHeight + gap);
    const x = margin + (index % columns) * (cardWidth + gap);
    const center = x + cardWidth / 2;
    ctx.save();
    ctx.globalAlpha = cardAlpha;
    box(x, y, cardWidth, rowHeight, theme.panel, rowHeight < 160 ? 14 : 24);
    ctx.restore();
    if (rowHeight < 300 || columns > 1) {
      const badgeSize = Math.min(180, rowHeight * 0.84, cardWidth * 0.13);
      const middle = y + rowHeight * 0.51;
      const nameSize = Math.min(30, cardWidth * 0.029, rowHeight * 0.24);
      const metaSize = Math.min(19, cardWidth * 0.022, rowHeight * 0.14);
      crest(m.home, m.homeLogo, x + 12 + badgeSize / 2, middle, badgeSize);
      crest(m.away, m.awayLogo, x + cardWidth - 12 - badgeSize / 2, middle, badgeSize);
      teamName(m.home, x + cardWidth * 0.265, middle, cardWidth * 0.22, nameSize);
      teamName(m.away, x + cardWidth * 0.735, middle, cardWidth * 0.22, nameSize);
      if (options.showCompetition) text([m.competition, m.round == null ? null : `${m.round}. kolo`].filter(Boolean).join(" · "), center, y + rowHeight * 0.13, metaSize, theme.muted, cardWidth * 0.67, 600, "center");
      if (postponed) postponedLabel(center, middle - rowHeight * 0.03, Math.min(30, cardWidth * 0.03, rowHeight * 0.23), cardWidth * 0.22);
      else text(formatTime(m.startsAt), center, middle - rowHeight * 0.03, Math.min(48, cardWidth * 0.045, rowHeight * 0.30), theme.accent, cardWidth * 0.22, 800, "center");
      text(dateLabel, center, y + rowHeight * 0.72, Math.min(18, cardWidth * 0.019, rowHeight * 0.13), theme.muted, cardWidth * 0.23, 600, "center");
      if (options.showHall && !postponed) text(m.hall ?? "Dvorana nije određena", center, y + rowHeight * 0.90, metaSize, theme.muted, cardWidth * 0.67, 500, "center");
      return;
    }
    box(margin + 26, y + 23, 5, 22, theme.accent, 2);
    const meta = options.showCompetition ? [m.competition, m.round == null ? null : `${m.round}. kolo`].filter(Boolean).join(" · ") : postponed ? "ODGOĐENA UTAKMICA" : "NAREDNA UTAKMICA";
    text(meta, w / 2, y + 34, solo && !wide ? 26 : 21, theme.muted, cardWidth - 130, 600, "center");
    const leftX = margin + cardWidth * 0.22;
    const rightX = w - leftX;
    const badgeSize = solo ? (wide ? 190 : 280) : Math.min(180, rowHeight * 0.50);
    const badgeY = solo ? y + rowHeight * 0.44 : y + 55 + badgeSize / 2;
    crest(m.home, m.homeLogo, leftX, badgeY, badgeSize);
    crest(m.away, m.awayLogo, rightX, badgeY, badgeSize);
    const nameY = options.showLogos ? badgeY + badgeSize / 2 + (solo ? 42 : 28) : badgeY;
    const nameSize = solo ? (wide ? 31 : 38) : 28;
    const nameWidth = cardWidth * (options.showLogos ? 0.35 : 0.30);
    teamName(m.home, leftX, nameY, nameWidth, nameSize);
    teamName(m.away, rightX, nameY, nameWidth, nameSize);
    text(dateLabel, w / 2, badgeY - (solo ? 59 : 34), solo ? 23 : 18, theme.muted, cardWidth * 0.25, 600, "center");
    if (postponed) postponedLabel(w / 2, badgeY + (solo ? 2 : 9), solo ? 38 : 30, cardWidth * 0.25);
    else text(formatTime(m.startsAt), w / 2, badgeY + (solo ? 2 : 9), solo ? (wide ? 64 : 82) : 48, theme.accent, cardWidth * 0.25, 800, "center");
    text("VS", w / 2, badgeY + (solo ? 65 : 52), 17, theme.muted, 90, 700, "center");
    if (options.showHall && !postponed) text(m.hall ?? "Dvorana nije određena", w / 2, y + rowHeight - 28, solo ? 24 : 20, theme.muted, cardWidth - 100, 500, "center");
  });

  const footerY = h - (story ? 142 : wide ? 29 : 44);
  ctx.strokeStyle = theme.line;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(margin, footerY - 26);
  ctx.lineTo(w - margin, footerY - 26);
  ctx.stroke();
  text(options.footer.trim(), margin, footerY, 19, theme.headerMuted, w - margin * 2 - 100, 600);
  if (pages > 1) text(`${page + 1} / ${pages}`, w - margin, footerY, 20, theme.headerMuted, 90, 700, "right");
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((value) => value ? resolve(value) : reject(new Error("Slika nije mogla biti sačuvana.")), "image/png");
  });
  return { blob, missingLogos: loaded.filter(([, logo]) => !logo).length };
}

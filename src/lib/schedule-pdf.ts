// PDF satnice kola za klubove (A4): naslovna strana s grbom pa tabela utakmica po takmičenju,
// kao šablon "Satnice N kolo" Takmičarske komisije. Font je Geist iz src/app/_og (standardni PDF fontovi nemaju č, ć, đ).
import { readFile } from "node:fs/promises";
import path from "node:path";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, rgb, type PDFFont, type PDFImage, type PDFPage } from "pdf-lib";
import type { ScheduleCompetition, ScheduleMatch } from "@/lib/data/admin";
import { matchesLabel } from "@/lib/finance";
import { formatDate, formatTime, isoToSarajevo, MATCH_STATUS_LABEL, WEEKDAYS_LONG, type Position } from "@/lib/format";

export const A4 = { w: 595.28, h: 841.89 };
export const M = 42; // margina
export const W = A4.w - 2 * M;

// Kolone tabele: broj utakmice, termin, ekipe i službena lica (oznaka pa ime)
const COL_NO = 74;
const COL_TIME = 124;
const COL_LABEL = 88;
const TEAM_ROW = 24;
const OFFICIAL_ROW = 17;
export const BLOCK_GAP = 8;

export const C = {
  fg: rgb(0.059, 0.059, 0.067),
  muted: rgb(0.361, 0.361, 0.4),
  faint: rgb(0.42, 0.447, 0.502),
  line: rgb(0.8, 0.81, 0.83),
  frame: rgb(0.55, 0.56, 0.6),
  panel2: rgb(0.945, 0.953, 0.961),
  orange: rgb(0.718, 0.278, 0.035),
};

/** Kako se ispisuju sudije i komesar: imena delegiranih, prazna polja za upis ili nikako */
export type OfficialsMode = "names" | "blank" | "none";

export type ScheduleOptions = {
  title: string;
  cover: boolean;
  time: boolean;
  hall: boolean;
  officials: OfficialsMode;
  note: string;
  signature: string;
};

export type ScheduleSection = { competition: ScheduleCompetition; round: number; matches: ScheduleMatch[]; free: string[] };

/** Oznake kao u šablonu: prvi sudija je glavni */
export const OFFICIAL_LABEL: Partial<Record<Position, string>> = {
  commissioner: "Komesar",
  referee_1: "Glavni sudija",
  referee_2: "Sudija",
  referee_3: "Sudija",
};

export type Fonts = { regular: PDFFont; bold: PDFFont };

export const asset = (p: string) => readFile(path.join(process.cwd(), p));
export const upper = (s: string) => s.toLocaleUpperCase("bs");

/** "2026/27" → "2026/2027" */
export function seasonLabel(season: string | null) {
  const m = season && /^(\d{4})\/(\d{2})$/.exec(season);
  return m ? `${m[1]}/${m[1].slice(0, 2)}${m[2]}` : season;
}

/** Dani utakmica: "24. 10. 2026." ili "24. – 25. 10. 2026." */
function dateRange(matches: ScheduleMatch[]) {
  const days = matches.map((m) => isoToSarajevo(m.startsAt).date).sort();
  const first = days[0];
  const last = days[days.length - 1];
  if (first === last) return formatDate(first);
  if (first.slice(0, 7) === last.slice(0, 7)) return `${Number(first.slice(8))}. – ${formatDate(last)}`;
  return `${formatDate(first)} – ${formatDate(last)}`;
}

export async function schedulePdf(sections: ScheduleSection[], opts: ScheduleOptions) {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  doc.setTitle(`Satnice — ${opts.title}`);
  doc.setAuthor("Košarkaški savez Kantona Sarajevo");

  const [regular, bold, crest] = await Promise.all([
    asset("src/app/_og/Geist-500.woff").then((b) => doc.embedFont(b, { subset: true })),
    asset("src/app/_og/Geist-700.woff").then((b) => doc.embedFont(b, { subset: true })),
    asset("public/brand/ksks-logo-1024.png").then((b) => doc.embedPng(b)),
  ]);
  const f = { regular, bold };

  const all = sections.flatMap((s) => s.matches);
  const league = sections.every((s) => s.competition.youth) ? "Omladinska liga Kantona Sarajevo" : "Košarkaški savez Kantona Sarajevo";
  const season = seasonLabel(sections[0]?.competition.season ?? null);
  const dates = all.length > 0 ? dateRange(all) : "";

  if (opts.cover) drawCover(doc.addPage([A4.w, A4.h]), f, crest, { league, season, title: opts.title, dates, competitions: sections.map((s) => s.competition.name) });

  const first = doc.getPageCount();
  let page = doc.addPage([A4.w, A4.h]);
  let y = drawPageHeader(page, f, crest, { league, season, title: opts.title, dates });
  const bottom = M + 24;
  const newPage = () => {
    page = doc.addPage([A4.w, A4.h]);
    y = drawPageHeader(page, f, crest, { league, season, title: opts.title, dates });
  };

  for (const s of sections) {
    const blocks = [...s.matches]
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt) || a.number - b.number)
      .map((m) => ({ m, h: blockHeight(m, opts) }));
    // Naslov takmičenja ne ostaje sam na dnu strane
    if (y - 30 - (blocks[0]?.h ?? 0) < bottom) newPage();
    y = drawSectionTitle(page, f, s, y);
    for (const { m, h } of blocks) {
      if (y - h < bottom) newPage();
      drawMatch(page, f, m, opts, y, h);
      y -= h + BLOCK_GAP;
    }
    if (s.free.length > 0) {
      if (y - 28 < bottom) newPage();
      y = drawFree(page, f, s.free, y);
    }
    y -= 18;
  }

  if (opts.note.trim()) {
    const lines = wrap(opts.note.trim(), f.regular, 9.5, W - 24);
    const h = 30 + lines.length * 13;
    if (y - h < bottom) newPage();
    page.drawRectangle({ x: M, y: y - h, width: W, height: h, color: C.panel2 });
    page.drawText("NAPOMENA", { x: M + 12, y: y - 17, size: 7.5, font: f.bold, color: C.faint });
    lines.forEach((l, i) => page.drawText(l, { x: M + 12, y: y - 32 - i * 13, size: 9.5, font: f.regular, color: C.fg }));
    y -= h + 18;
  }

  if (opts.signature.trim()) {
    if (y - 40 < bottom) newPage();
    page.drawText(opts.signature.trim(), { x: M, y: y - 22, size: 10.5, font: f.regular, color: C.fg });
  }

  // Podnožje (bez naslovne): savez lijevo, broj strane desno
  const pages = doc.getPages().slice(first);
  pages.forEach((p, i) => {
    p.drawText("Košarkaški savez Kantona Sarajevo  ·  Takmičarska komisija", { x: M, y: M - 14, size: 7.5, font: f.regular, color: C.faint });
    const label = `Strana ${i + 1} / ${pages.length}`;
    p.drawText(label, { x: A4.w - M - f.regular.widthOfTextAtSize(label, 7.5), y: M - 14, size: 7.5, font: f.regular, color: C.faint });
  });

  return doc.save();
}

/** Naslovna: liga i sezona, veliki grb, naslov kola, dani i takmičenja */
function drawCover(
  page: PDFPage,
  f: Fonts,
  crest: PDFImage,
  { league, season, title, dates, competitions }: { league: string; season: string | null; title: string; dates: string; competitions: string[] },
) {
  centered(page, upper(league), f.bold, 15, A4.h - 92, C.fg);
  if (season) centered(page, `TAKMIČARSKA SEZONA ${season}`, f.bold, 12.5, A4.h - 116, C.muted);
  drawContained(page, crest, (A4.w - 300) / 2, A4.h - 500, 300, 350);
  const size = sizeToFit(upper(title), f.bold, 28, 14, W);
  centered(page, upper(title), f.bold, size, 262, C.fg);
  if (dates) centered(page, dates, f.regular, 13, 234, C.muted);
  if (competitions.length > 1) centered(page, competitions.join("  ·  "), f.regular, 10, 212, C.faint);
  centered(page, "Košarkaški savez Kantona Sarajevo", f.regular, 8, M, C.faint);
}

/** Zaglavlje strane satnice: grb, liga, naslov kola, sezona i dani desno; vraća vrh sadržaja */
export function drawPageHeader(
  page: PDFPage,
  f: Fonts,
  crest: PDFImage,
  { league, season, title, dates, dateLabel = "TERMIN KOLA" }: { league: string; season: string | null; title: string; dates: string; dateLabel?: string },
) {
  const top = A4.h - M;
  drawContained(page, crest, M, top - 44, 38, 44);
  const x = M + 50;
  page.drawText(upper(league), { x, y: top - 12, size: 7.5, font: f.bold, color: C.faint });
  page.drawText(fit(upper(title), f.bold, 17, W - 50 - 140), { x, y: top - 31, size: 17, font: f.bold, color: C.fg });
  if (season) page.drawText(`Takmičarska sezona ${season}`, { x, y: top - 44, size: 8.5, font: f.regular, color: C.muted });
  if (dates) {
    page.drawText(dateLabel, { x: A4.w - M - f.bold.widthOfTextAtSize(dateLabel, 7), y: top - 12, size: 7, font: f.bold, color: C.faint });
    page.drawText(dates, { x: A4.w - M - f.bold.widthOfTextAtSize(dates, 11), y: top - 28, size: 11, font: f.bold, color: C.fg });
  }
  page.drawLine({ start: { x: M, y: top - 56 }, end: { x: A4.w - M, y: top - 56 }, thickness: 0.75, color: C.line });
  return top - 80;
}

/** "1. KOLO – PIONIRI — GRUPA 1" i broj utakmica desno */
function drawSectionTitle(page: PDFPage, f: Fonts, s: ScheduleSection, y: number) {
  const count = matchesLabel(s.matches.length);
  const countW = f.regular.widthOfTextAtSize(count, 8.5);
  page.drawText(fit(`${s.round}. KOLO – ${upper(s.competition.name)}`, f.bold, 12, W - countW - 16), { x: M, y: y - 12, size: 12, font: f.bold, color: C.fg });
  page.drawText(count, { x: A4.w - M - countW, y: y - 12, size: 8.5, font: f.regular, color: C.muted });
  return y - 24;
}

function officialRows(m: ScheduleMatch, opts: ScheduleOptions) {
  return opts.officials === "none" ? [] : m.officials.filter((o) => OFFICIAL_LABEL[o.position]);
}

/** Redovi termina: puni naziv dana, datum, vrijeme (odgođena bez vremena), dvorana, stanje (odgođena/otkazana) */
function timeLines(m: ScheduleMatch, opts: ScheduleOptions) {
  const { date } = isoToSarajevo(m.startsAt);
  // Puni naziv dana u svom redu: "PONEDJELJAK, 26. 10. 2026." ne stane u kolonu termina
  const weekday = WEEKDAYS_LONG[new Date(`${date}T12:00:00Z`).getUTCDay()];
  const lines: { text: string; size: number; bold: boolean; color: typeof C.fg }[] = [
    { text: upper(weekday), size: 9, bold: true, color: C.fg },
    { text: formatDate(date), size: 9, bold: true, color: C.fg },
  ];
  if (opts.time && m.status !== "postponed") lines.push({ text: formatTime(m.startsAt), size: 14, bold: true, color: C.fg });
  if (opts.hall) lines.push(m.hall ? { text: upper(m.hall), size: 8.5, bold: false, color: C.fg } : { text: "Dvorana naknadno", size: 8.5, bold: false, color: C.faint });
  if (m.status === "postponed" || m.status === "cancelled") lines.push({ text: upper(MATCH_STATUS_LABEL[m.status]), size: 8.5, bold: true, color: C.orange });
  return lines;
}

const lineHeight = (size: number) => size * 1.35;

function blockHeight(m: ScheduleMatch, opts: ScheduleOptions) {
  const rows = officialRows(m, opts).length;
  const text = timeLines(m, opts).reduce((h, l) => h + lineHeight(l.size), 0) + 16;
  return Math.max(rows > 0 ? TEAM_ROW + rows * OFFICIAL_ROW : 40, text, 44);
}

/** Jedna utakmica kao u šablonu: broj | termin | domaćin – gost, ispod komesar i sudije; y = vrh bloka */
function drawMatch(page: PDFPage, f: Fonts, m: ScheduleMatch, opts: ScheduleOptions, y: number, h: number) {
  const rows = officialRows(m, opts);
  const x0 = M;
  const x1 = M + COL_NO;
  const x2 = x1 + COL_TIME;
  const x3 = M + W;
  const bottom = y - h;
  const teamH = rows.length > 0 ? TEAM_ROW : h;
  const rowH = rows.length > 0 ? (h - teamH) / rows.length : 0;

  // Podloge: broj i termin, red ekipa
  page.drawRectangle({ x: x0, y: bottom, width: x2 - x0, height: h, color: C.panel2 });
  page.drawRectangle({ x: x2, y: y - teamH, width: x3 - x2, height: teamH, color: C.panel2 });

  // Broj utakmice
  const no = m.number == null ? "" : String(m.number).padStart(2, "0");
  const midY = bottom + h / 2;
  centeredIn(page, "UTAKMICA", f.bold, 7, x0, x1, midY + 6, C.faint);
  centeredIn(page, no, f.bold, 18, x0, x1, midY - 13, C.fg);

  // Termin, okomito centriran
  const lines = timeLines(m, opts);
  const textH = lines.reduce((s, l) => s + lineHeight(l.size), 0);
  let ty = midY + textH / 2;
  for (const l of lines) {
    ty -= lineHeight(l.size);
    centeredIn(page, fit(l.text, l.bold ? f.bold : f.regular, l.size, COL_TIME - 10), l.bold ? f.bold : f.regular, l.size, x1, x2, ty + l.size * 0.3, l.color);
  }

  // Ekipe
  const half = (x3 - x2) / 2;
  const teamY = y - teamH / 2 - 3.5;
  const teamSize = (name: string) => sizeToFit(upper(name), f.bold, 10.5, 7.5, half - 12);
  centeredIn(page, fit(upper(m.home), f.bold, teamSize(m.home), half - 12), f.bold, teamSize(m.home), x2, x2 + half, teamY, C.fg);
  centeredIn(page, fit(upper(m.away), f.bold, teamSize(m.away), half - 12), f.bold, teamSize(m.away), x2 + half, x3, teamY, C.fg);
  page.drawLine({ start: { x: x2 + half, y }, end: { x: x2 + half, y: y - teamH }, thickness: 0.6, color: C.line });

  // Komesar i sudije
  rows.forEach((o, i) => {
    const top = y - teamH - i * rowH;
    page.drawLine({ start: { x: x2, y: top }, end: { x: x3, y: top }, thickness: 0.6, color: C.line });
    const label = OFFICIAL_LABEL[o.position]!;
    const ly = top - rowH / 2 - 3;
    page.drawText(label, { x: x2 + COL_LABEL - 8 - f.regular.widthOfTextAtSize(label, 8), y: ly, size: 8, font: f.regular, color: C.muted });
    if (opts.officials === "names" && o.name) page.drawText(fit(o.name, f.regular, 9.5, x3 - x2 - COL_LABEL - 16), { x: x2 + COL_LABEL + 8, y: ly, size: 9.5, font: f.regular, color: C.fg });
  });
  if (rows.length > 0) page.drawLine({ start: { x: x2 + COL_LABEL, y: y - teamH }, end: { x: x2 + COL_LABEL, y: bottom }, thickness: 0.6, color: C.line });

  // Kolone i okvir
  page.drawLine({ start: { x: x1, y }, end: { x: x1, y: bottom }, thickness: 0.6, color: C.line });
  page.drawLine({ start: { x: x2, y }, end: { x: x2, y: bottom }, thickness: 0.6, color: C.line });
  page.drawRectangle({ x: x0, y: bottom, width: W, height: h, borderColor: C.frame, borderWidth: 0.8 });
}

/** Slobodna ekipa kola (neparan broj ekipa) ispod utakmica takmičenja */
function drawFree(page: PDFPage, f: Fonts, free: string[], y: number) {
  const h = 28;
  page.drawRectangle({ x: M, y: y - h, width: W, height: h, color: C.panel2, borderColor: C.frame, borderWidth: 0.8 });
  const label = free.length === 1 ? "SLOBODNA EKIPA" : "SLOBODNE EKIPE";
  page.drawText(label, { x: M + 12, y: y - h / 2 - 2.5, size: 7.5, font: f.bold, color: C.faint });
  const x = M + 12 + f.bold.widthOfTextAtSize(label, 7.5) + 14;
  page.drawText(fit(free.map(upper).join(", "), f.bold, 11, M + W - 12 - x), { x, y: y - h / 2 - 4, size: 11, font: f.bold, color: C.fg });
  return y - h - BLOCK_GAP;
}

export function centered(page: PDFPage, text: string, font: PDFFont, size: number, y: number, color: typeof C.fg) {
  page.drawText(text, { x: (A4.w - font.widthOfTextAtSize(text, size)) / 2, y, size, font, color });
}

export function centeredIn(page: PDFPage, text: string, font: PDFFont, size: number, from: number, to: number, y: number, color: typeof C.fg) {
  page.drawText(text, { x: from + (to - from - font.widthOfTextAtSize(text, size)) / 2, y, size, font, color });
}

/** Slika unutar okvira, cijela vidljiva, centrirana */
export function drawContained(page: PDFPage, image: PDFImage, x: number, y: number, w: number, h: number) {
  const s = Math.min(w / image.width, h / image.height);
  const dw = image.width * s;
  const dh = image.height * s;
  page.drawImage(image, { x: x + (w - dw) / 2, y: y + (h - dh) / 2, width: dw, height: dh });
}

/** Najveća veličina fonta (od max do min) u kojoj tekst stane u širinu */
export function sizeToFit(text: string, font: PDFFont, max: number, min: number, width: number) {
  let size = max;
  while (size > min && font.widthOfTextAtSize(text, size) > width) size -= 0.5;
  return size;
}

/** Tekst skraćen s "…" da stane u širinu */
export function fit(text: string, font: PDFFont, size: number, width: number) {
  if (font.widthOfTextAtSize(text, size) <= width) return text;
  let t = text;
  while (t.length > 1 && font.widthOfTextAtSize(`${t}…`, size) > width) t = t.slice(0, -1);
  return `${t.trimEnd()}…`;
}

/** Tekst u redove do širine (novi red u tekstu ostaje novi red) */
export function wrap(text: string, font: PDFFont, size: number, width: number) {
  const out: string[] = [];
  for (const para of text.split(/\r?\n/)) {
    let line = "";
    for (const word of para.split(/\s+/).filter(Boolean)) {
      const next = line ? `${line} ${word}` : word;
      if (line && font.widthOfTextAtSize(next, size) > width) {
        out.push(line);
        line = word;
      } else line = next;
    }
    out.push(line);
  }
  return out;
}

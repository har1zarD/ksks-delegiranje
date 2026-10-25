// PDF bilten (A4), kao bilten Takmičarske komisije: naslovna sa sadržajem, registracija utakmica (rezultat, četvrtine,
// komesar, sudije, primjedbe), odluke, tabela i nominacija narednog kola. Izgled i pomoćnici su iz satnica (schedule-pdf).
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, type PDFImage, type PDFPage } from "pdf-lib";
import type { BulletinMatch } from "@/lib/data/admin";
import { A1_ZENE_ID } from "@/lib/a1-zene-raspored";
import { A2_JUG_ID } from "@/lib/a2-jug-raspored";
import type { BulletinOfficials } from "@/lib/bulletin";
import { formatDate, MATCH_STATUS_LABEL, todayISO } from "@/lib/format";
import {
  A4,
  asset,
  BLOCK_GAP,
  C,
  centered,
  centeredIn,
  drawContained,
  drawPageHeader,
  fit,
  M,
  OFFICIAL_LABEL,
  sizeToFit,
  upper,
  W,
  wrap,
  type Fonts,
} from "@/lib/schedule-pdf";

export type BulletinStanding = { name: string; played: number; won: number; lost: number; pointsFor: number; pointsAgainst: number; diff: number; points: number };

type Group<T> = { name: string; items: T[] };

/** Utakmica u registraciji: primjedbe, komesar i sudije kako ih je admin potvrdio u bilderu */
export type RegistrationMatch = BulletinMatch & BulletinOfficials & { remarks: string };

/** Savez biltena: KSBiH lige nose logo lige i naziv KSBiH, ostalo KSKS */
export type BulletinBrand = { org: string; logo: string; ksbih: boolean };

const KSBIH = "Košarkaški savez Bosne i Hercegovine";
/** A1 liga KSBiH (takmičenje tekuće sezone) */
const A1_KSBIH_ID = "a6358eb7-260f-48d4-95d2-7988b9bca13c";
// Logoi lige obrezani na vidljivi dio (public/competitions/pdf), da u zaglavlju ne budu sitni
const KSBIH_LOGO: Record<string, string> = {
  [A1_KSBIH_ID]: "public/competitions/pdf/ksbih-a1.png",
  [A2_JUG_ID]: "public/competitions/pdf/ksbih-a2.png",
  [A1_ZENE_ID]: "public/competitions/pdf/ksbih-a1-zene.png",
};

/** Jedna KSBiH liga: njen logo; više KSBiH liga: logo KSBiH; ima li KSKS takmičenja: KSKS */
export function bulletinBrand(competitionIds: string[]): BulletinBrand {
  if (competitionIds.length === 0 || !competitionIds.every((id) => id in KSBIH_LOGO)) {
    return { org: "Košarkaški savez Kantona Sarajevo", logo: "public/brand/ksks-logo-1024.png", ksbih: false };
  }
  return { org: KSBIH, logo: competitionIds.length === 1 ? KSBIH_LOGO[competitionIds[0]] : "public/competitions/pdf/ksbih.png", ksbih: true };
}

export type BulletinPdfInput = {
  brand: BulletinBrand;
  league: string;
  season: string | null;
  number: string;
  title: string;
  signature: string;
  cover: boolean;
  registration: { round: number | null; groups: Group<RegistrationMatch>[] } | null;
  decisions: string[] | null;
  standings: Group<BulletinStanding>[] | null;
  nominations: { round: number; names: boolean; groups: Group<BulletinMatch>[] } | null;
};

// Blok utakmice u registraciji: broj | ekipe, komesar, sudije | rezultat; ispod primjedbe
const COL_NO = 74;
const COL_LABEL = 72;
const COL_SCORE = 120;
const TEAM_ROW = 24;
const OFFICIAL_ROW = 18;
const REMARK_SIZE = 9;
const REMARK_LINE = 12.5;
const PERIOD_SIZE = 7.5;
const PERIOD_LINE = 10;

const roundOrdinal = (round: number | null) => (round ? ` ${round}. KOLA` : "");

export async function bulletinPdf(input: BulletinPdfInput) {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const heading = input.number.trim() ? `Bilten br. ${input.number.trim()}` : "Bilten";
  doc.setTitle(`${heading} — ${input.title}`);
  doc.setAuthor(input.brand.org);

  const [regular, bold, crest] = await Promise.all([
    asset("src/app/_og/Geist-500.woff").then((b) => doc.embedFont(b, { subset: true })),
    asset("src/app/_og/Geist-700.woff").then((b) => doc.embedFont(b, { subset: true })),
    asset(input.brand.logo).then((b) => doc.embedPng(b)),
  ]);
  const f = { regular, bold };
  const issued = formatDate(todayISO());

  // Dijelovi koji se ispisuju, numerisani redom kao u sadržaju
  const parts: { title: string; draw: () => void }[] = [];
  const reg = input.registration;
  if (reg && reg.groups.length > 0) parts.push({ title: `Registracija utakmica${roundOrdinal(reg.round).toLowerCase()}`, draw: () => drawRegistration(reg.groups) });
  const decisions = input.decisions;
  if (decisions && decisions.length > 0) parts.push({ title: "Odluke", draw: () => drawDecisions(decisions) });
  const standings = input.standings;
  if (standings && standings.length > 0) parts.push({ title: "Tabela", draw: () => drawStandings(standings) });
  const nom = input.nominations;
  if (nom && nom.groups.length > 0) parts.push({ title: `Nominacija utakmica${roundOrdinal(nom.round).toLowerCase()}`, draw: () => drawNominations(nom) });

  if (input.cover) drawCover(doc.addPage([A4.w, A4.h]), f, crest, { ...input, heading, issued, contents: parts.map((p) => p.title) });

  const first = doc.getPageCount();
  // Širi logo KSBiH lige (grb + "A2") dobija širi okvir u zaglavlju
  const header = { league: input.title, season: input.season, title: heading, dates: issued, dateLabel: "DATUM", logoW: Math.min(60, Math.max(38, (44 * crest.width) / crest.height)) };
  let page = doc.addPage([A4.w, A4.h]);
  let y = drawPageHeader(page, f, crest, header);
  const bottom = M + 24;
  const newPage = () => {
    page = doc.addPage([A4.w, A4.h]);
    y = drawPageHeader(page, f, crest, header);
  };
  /** Nova strana kad `h` ne stane do dna */
  const room = (h: number) => {
    if (y - h < bottom) newPage();
  };

  let n = 0;
  /** "1. REGISTRACIJA UTAKMICA 3. KOLA"; ne ostaje sam na dnu strane (`next` = visina prvog bloka ispod) */
  const partTitle = (title: string, next: number) => {
    room(34 + next);
    n += 1;
    page.drawText(fit(`${n}. ${upper(title)}`, f.bold, 13, W), { x: M, y: y - 13, size: 13, font: f.bold, color: C.fg });
    y -= 30;
  };
  const groupTitle = (name: string, next: number) => {
    room(22 + next);
    page.drawText(fit(upper(name), f.bold, 9, W), { x: M, y: y - 9, size: 9, font: f.bold, color: C.muted });
    y -= 20;
  };

  function drawRegistration(groups: Group<RegistrationMatch>[]) {
    const blocks = groups.map((g) => ({ name: g.name, items: g.items.map((m) => ({ m, h: registrationHeight(f, m) })) }));
    partTitle(parts[n].title, blocks[0].items[0]?.h ?? 0);
    for (const g of blocks) {
      if (groups.length > 1) groupTitle(g.name, g.items[0]?.h ?? 0);
      for (const { m, h } of g.items) {
        room(h);
        drawRegistrationMatch(page, f, m, y, h);
        y -= h + BLOCK_GAP;
      }
      y -= 10;
    }
  }

  function drawDecisions(items: string[]) {
    const size = 10;
    const line = 14;
    const wrapped = items.map((d) => wrap(d, f.regular, size, W - 22));
    partTitle(parts[n].title, wrapped[0].length * line);
    wrapped.forEach((lines, i) => {
      room(lines.length * line + 4);
      const no = `${i + 1}.`;
      page.drawText(no, { x: M + 14 - f.bold.widthOfTextAtSize(no, size), y: y - size, size, font: f.bold, color: C.fg });
      lines.forEach((l, j) => page.drawText(l, { x: M + 22, y: y - size - j * line, size, font: f.regular, color: C.fg }));
      y -= lines.length * line + 5;
    });
    y -= 14;
  }

  function drawStandings(tables: Group<BulletinStanding>[]) {
    partTitle(parts[n].title, STANDINGS_HEAD + 2 * STANDINGS_ROW);
    for (const t of tables) {
      if (tables.length > 1) groupTitle(t.name, STANDINGS_HEAD + 2 * STANDINGS_ROW);
      room(STANDINGS_HEAD + STANDINGS_ROW);
      y = drawStandingsHead(page, f, y);
      t.items.forEach((row, i) => {
        if (y - STANDINGS_ROW < bottom) {
          newPage();
          y = drawStandingsHead(page, f, y);
        }
        y = drawStandingsRow(page, f, row, i + 1, y);
      });
      y -= 18;
    }
  }

  function drawNominations(nominations: NonNullable<BulletinPdfInput["nominations"]>) {
    const blocks = nominations.groups.map((g) => ({ name: g.name, items: g.items.map((m) => ({ m, h: nominationHeight(m) })) }));
    partTitle(parts[n].title, blocks[0].items[0]?.h ?? 0);
    for (const g of blocks) {
      if (nominations.groups.length > 1) groupTitle(g.name, g.items[0]?.h ?? 0);
      for (const { m, h } of g.items) {
        room(h);
        drawNominationMatch(page, f, m, nominations.names, y, h);
        y -= h + BLOCK_GAP;
      }
      y -= 10;
    }
  }

  for (const p of parts) p.draw();

  if (input.signature.trim()) {
    room(40);
    page.drawText(input.signature.trim(), { x: M, y: y - 22, size: 10.5, font: f.regular, color: C.fg });
  }

  // Podnožje (bez naslovne): savez lijevo, broj strane desno
  const pages = doc.getPages().slice(first);
  pages.forEach((p, i) => {
    p.drawText(`${input.brand.org}  ·  ${heading}`, { x: M, y: M - 14, size: 7.5, font: f.regular, color: C.faint });
    const label = `Strana ${i + 1} / ${pages.length}`;
    p.drawText(label, { x: A4.w - M - f.regular.widthOfTextAtSize(label, 7.5), y: M - 14, size: 7.5, font: f.regular, color: C.faint });
  });

  return doc.save();
}

/** Naslovna: liga i sezona, grb, "BILTEN BR. 3", takmičenje, datum i sadržaj */
function drawCover(
  page: PDFPage,
  f: Fonts,
  crest: PDFImage,
  {
    brand,
    league,
    season,
    heading,
    title,
    issued,
    contents,
  }: { brand: BulletinBrand; league: string; season: string | null; heading: string; title: string; issued: string; contents: string[] },
) {
  centered(page, upper(league), f.bold, 15, A4.h - 92, C.fg);
  if (season) centered(page, `TAKMIČARSKA SEZONA ${season}`, f.bold, 12.5, A4.h - 116, C.muted);
  drawContained(page, crest, (A4.w - 300) / 2, A4.h - 420, 300, 260);
  centered(page, upper(heading), f.bold, 30, A4.h - 480, C.fg);
  const size = sizeToFit(upper(title), f.bold, 15, 9, W);
  centered(page, fit(upper(title), f.bold, size, W), f.bold, size, A4.h - 506, C.muted);
  centered(page, issued, f.regular, 11, A4.h - 526, C.faint);

  if (contents.length > 0) {
    const x = A4.w / 2 - 130;
    let y = A4.h - 590;
    page.drawText("S A D R Ž A J", { x, y, size: 9, font: f.bold, color: C.faint });
    page.drawLine({ start: { x, y: y - 8 }, end: { x: x + 260, y: y - 8 }, thickness: 0.6, color: C.line });
    y -= 30;
    contents.forEach((c, i) => {
      page.drawText(`${i + 1}.`, { x, y, size: 12, font: f.bold, color: C.fg });
      page.drawText(fit(c, f.regular, 12, 236), { x: x + 24, y, size: 12, font: f.regular, color: C.fg });
      y -= 22;
    });
  }
  centered(page, brand.org, f.regular, 8, M, C.faint);
}

// ───────── Registracija ─────────

function periodLines(f: Fonts, m: BulletinMatch) {
  if (!m.score || m.periods.length === 0) return [];
  return wrap(m.periods.map((p) => `${p.home}:${p.away}`).join(", "), f.regular, PERIOD_SIZE, COL_SCORE - 12);
}

function remarkLines(f: Fonts, m: RegistrationMatch, x1: number) {
  return wrap(m.remarks.trim() || "Bez primjedbi.", f.regular, REMARK_SIZE, M + W - x1 - 20);
}

function topHeight(f: Fonts, m: BulletinMatch) {
  return TEAM_ROW + Math.max(2 * OFFICIAL_ROW, 30 + periodLines(f, m).length * PERIOD_LINE);
}

function registrationHeight(f: Fonts, m: RegistrationMatch) {
  return topHeight(f, m) + 24 + remarkLines(f, m, M + COL_NO).length * REMARK_LINE;
}

/** Jedna utakmica: broj | domaćin – gost, komesar, sudije | rezultat i četvrtine; ispod primjedbe; y = vrh bloka */
function drawRegistrationMatch(page: PDFPage, f: Fonts, m: RegistrationMatch, y: number, h: number) {
  const x0 = M;
  const x1 = M + COL_NO;
  const x3 = M + W;
  const xs = x3 - COL_SCORE;
  const bottom = y - h;
  const top = topHeight(f, m);
  const midTop = y - top;

  // Podloge: broj, red ekipa (i zaglavlje rezultata)
  page.drawRectangle({ x: x0, y: bottom, width: COL_NO, height: h, color: C.panel2 });
  page.drawRectangle({ x: x1, y: y - TEAM_ROW, width: x3 - x1, height: TEAM_ROW, color: C.panel2 });

  // Broj utakmice
  const midY = bottom + h / 2;
  centeredIn(page, "UTAKMICA", f.bold, 7, x0, x1, midY + 6, C.faint);
  centeredIn(page, m.number == null ? "" : String(m.number).padStart(2, "0"), f.bold, 18, x0, x1, midY - 13, C.fg);

  // Ekipe
  const half = (xs - x1) / 2;
  const teamY = y - TEAM_ROW / 2 - 3.5;
  for (const [name, from, to] of [
    [m.home, x1, x1 + half],
    [m.away, x1 + half, xs],
  ] as const) {
    const size = sizeToFit(upper(name), f.bold, 10.5, 7.5, half - 12);
    centeredIn(page, fit(upper(name), f.bold, size, half - 12), f.bold, size, from, to, teamY, C.fg);
  }
  page.drawLine({ start: { x: x1 + half, y }, end: { x: x1 + half, y: y - TEAM_ROW }, thickness: 0.6, color: C.line });
  centeredIn(page, "REZULTAT", f.bold, 7.5, xs, x3, teamY + 0.5, C.faint);

  // Komesar i sudije
  const names = { commissioner: m.commissioner.trim() || "—", referees: m.referees.trim() || "—" };
  const rowH = (top - TEAM_ROW) / 2;
  (
    [
      ["Komesar", names.commissioner],
      ["Sudije", names.referees],
    ] as const
  ).forEach(([label, value], i) => {
    const rowTop = y - TEAM_ROW - i * rowH;
    page.drawLine({ start: { x: x1, y: rowTop }, end: { x: xs, y: rowTop }, thickness: 0.6, color: C.line });
    const ly = rowTop - rowH / 2 - 3;
    page.drawText(label, { x: x1 + COL_LABEL - 8 - f.regular.widthOfTextAtSize(label, 8), y: ly, size: 8, font: f.regular, color: C.muted });
    page.drawText(fit(value, f.regular, 9.5, xs - x1 - COL_LABEL - 14), { x: x1 + COL_LABEL + 8, y: ly, size: 9.5, font: f.regular, color: C.fg });
  });
  page.drawLine({ start: { x: x1 + COL_LABEL, y: y - TEAM_ROW }, end: { x: x1 + COL_LABEL, y: midTop }, thickness: 0.6, color: C.line });

  // Rezultat i četvrtine (neodigrana: stanje utakmice)
  const lines = periodLines(f, m);
  const scoreArea = top - TEAM_ROW;
  const contentH = 18 + (lines.length > 0 ? 6 + lines.length * PERIOD_LINE : 0);
  let sy = y - TEAM_ROW - (scoreArea - contentH) / 2;
  if (m.score) {
    centeredIn(page, `${m.score.home} : ${m.score.away}`, f.bold, 16, xs, x3, sy - 14, C.fg);
    sy -= 24;
    for (const l of lines) {
      centeredIn(page, l, f.regular, PERIOD_SIZE, xs, x3, sy - PERIOD_SIZE, C.muted);
      sy -= PERIOD_LINE;
    }
  } else {
    const label = m.status === "scheduled" ? "—" : upper(MATCH_STATUS_LABEL[m.status]);
    centeredIn(page, label, f.bold, 10, xs, x3, sy - 12, m.status === "scheduled" ? C.faint : C.orange);
  }
  page.drawLine({ start: { x: xs, y }, end: { x: xs, y: midTop }, thickness: 0.6, color: C.line });

  // Primjedbe
  page.drawLine({ start: { x: x1, y: midTop }, end: { x: x3, y: midTop }, thickness: 0.6, color: C.line });
  page.drawText("PRIMJEDBE", { x: x1 + 10, y: midTop - 13, size: 7, font: f.bold, color: C.faint });
  remarkLines(f, m, x1).forEach((l, i) => page.drawText(l, { x: x1 + 10, y: midTop - 26 - i * REMARK_LINE, size: REMARK_SIZE, font: f.regular, color: C.fg }));

  // Kolona broja i okvir
  page.drawLine({ start: { x: x1, y }, end: { x: x1, y: bottom }, thickness: 0.6, color: C.line });
  page.drawRectangle({ x: x0, y: bottom, width: W, height: h, borderColor: C.frame, borderWidth: 0.8 });
}

// ───────── Nominacija ─────────

/** Komesar i sudije koje utakmica ima (i nedelegirani: prazno polje) */
const nominationRows = (m: BulletinMatch) => m.officials.filter((o) => OFFICIAL_LABEL[o.position]);

function nominationHeight(m: BulletinMatch) {
  return Math.max(TEAM_ROW + nominationRows(m).length * OFFICIAL_ROW, 44);
}

/** Utakmica narednog kola bez termina: broj | domaćin – gost, ispod komesar i sudije (imena ili prazno); y = vrh bloka */
function drawNominationMatch(page: PDFPage, f: Fonts, m: BulletinMatch, names: boolean, y: number, h: number) {
  const x0 = M;
  const x1 = M + COL_NO;
  const x3 = M + W;
  const bottom = y - h;
  const rows = nominationRows(m);
  const teamH = rows.length > 0 ? TEAM_ROW : h;
  const rowH = rows.length > 0 ? (h - teamH) / rows.length : 0;

  page.drawRectangle({ x: x0, y: bottom, width: COL_NO, height: h, color: C.panel2 });
  page.drawRectangle({ x: x1, y: y - teamH, width: x3 - x1, height: teamH, color: C.panel2 });

  const midY = bottom + h / 2;
  centeredIn(page, "UTAKMICA", f.bold, 7, x0, x1, midY + 6, C.faint);
  centeredIn(page, m.number == null ? "" : String(m.number).padStart(2, "0"), f.bold, 18, x0, x1, midY - 13, C.fg);

  const half = (x3 - x1) / 2;
  const teamY = y - teamH / 2 - 3.5;
  for (const [name, from, to] of [
    [m.home, x1, x1 + half],
    [m.away, x1 + half, x3],
  ] as const) {
    const size = sizeToFit(upper(name), f.bold, 10.5, 7.5, half - 12);
    centeredIn(page, fit(upper(name), f.bold, size, half - 12), f.bold, size, from, to, teamY, C.fg);
  }
  page.drawLine({ start: { x: x1 + half, y }, end: { x: x1 + half, y: y - teamH }, thickness: 0.6, color: C.line });

  rows.forEach((o, i) => {
    const top = y - teamH - i * rowH;
    page.drawLine({ start: { x: x1, y: top }, end: { x: x3, y: top }, thickness: 0.6, color: C.line });
    const label = OFFICIAL_LABEL[o.position]!;
    const ly = top - rowH / 2 - 3;
    page.drawText(label, { x: x1 + COL_LABEL + 16 - f.regular.widthOfTextAtSize(label, 8), y: ly, size: 8, font: f.regular, color: C.muted });
    if (names && o.name) page.drawText(fit(o.name, f.regular, 9.5, x3 - x1 - COL_LABEL - 40), { x: x1 + COL_LABEL + 32, y: ly, size: 9.5, font: f.regular, color: C.fg });
  });
  if (rows.length > 0) page.drawLine({ start: { x: x1 + COL_LABEL + 24, y: y - teamH }, end: { x: x1 + COL_LABEL + 24, y: bottom }, thickness: 0.6, color: C.line });

  page.drawLine({ start: { x: x1, y }, end: { x: x1, y: bottom }, thickness: 0.6, color: C.line });
  page.drawRectangle({ x: x0, y: bottom, width: W, height: h, borderColor: C.frame, borderWidth: 0.8 });
}

// ───────── Tabela ─────────

const STANDINGS_HEAD = 24;
const STANDINGS_ROW = 19;
const RANK_W = 28;
const NUM_W = 46;
const STANDINGS_COLS = [
  { label: "OU", value: (r: BulletinStanding) => r.played },
  { label: "P", value: (r: BulletinStanding) => r.won },
  { label: "I", value: (r: BulletinStanding) => r.lost },
  { label: "KOŠ +", value: (r: BulletinStanding) => r.pointsFor },
  { label: "KOŠ −", value: (r: BulletinStanding) => r.pointsAgainst },
  { label: "+/−", value: (r: BulletinStanding) => (r.diff > 0 ? `+${r.diff}` : r.diff) },
  { label: "BOD", value: (r: BulletinStanding) => r.points },
];
const numX = (i: number) => M + W - (STANDINGS_COLS.length - i) * NUM_W;

function drawStandingsHead(page: PDFPage, f: Fonts, y: number) {
  page.drawRectangle({ x: M, y: y - STANDINGS_HEAD, width: W, height: STANDINGS_HEAD, color: C.panel2 });
  const ty = y - STANDINGS_HEAD / 2 - 2.5;
  page.drawText("EKIPA", { x: M + RANK_W + 6, y: ty, size: 7.5, font: f.bold, color: C.faint });
  STANDINGS_COLS.forEach((c, i) => centeredIn(page, c.label, f.bold, 7.5, numX(i), numX(i) + NUM_W, ty, C.faint));
  page.drawLine({ start: { x: M, y: y - STANDINGS_HEAD }, end: { x: M + W, y: y - STANDINGS_HEAD }, thickness: 0.8, color: C.frame });
  return y - STANDINGS_HEAD;
}

function drawStandingsRow(page: PDFPage, f: Fonts, r: BulletinStanding, rank: number, y: number) {
  const ty = y - STANDINGS_ROW / 2 - 3;
  centeredIn(page, `${rank}.`, f.bold, 9, M, M + RANK_W, ty, C.muted);
  page.drawText(fit(upper(r.name), f.bold, 9, numX(0) - M - RANK_W - 12), { x: M + RANK_W + 6, y: ty, size: 9, font: f.bold, color: C.fg });
  STANDINGS_COLS.forEach((c, i) => {
    const last = i === STANDINGS_COLS.length - 1;
    centeredIn(page, String(c.value(r)), last ? f.bold : f.regular, 9, numX(i), numX(i) + NUM_W, ty, C.fg);
  });
  page.drawLine({ start: { x: M, y: y - STANDINGS_ROW }, end: { x: M + W, y: y - STANDINGS_ROW }, thickness: 0.5, color: C.line });
  return y - STANDINGS_ROW;
}

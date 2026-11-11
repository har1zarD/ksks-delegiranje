// Word bilten (.docx), isti sadržaj i raspored kao PDF (bulletin-pdf): naslovna sa sadržajem, zaglavlje i podnožje strane,
// registracija utakmica, tabela, odluke i nominacija. Tabele umjesto crtanja, da se u Wordu može dalje uređivati.
import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Header,
  HeightRule,
  ImageRun,
  Packer,
  PageNumber,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  TextRun,
  VerticalAlignTable,
  VerticalMergeType,
  WidthType,
  type ISectionOptions,
} from "docx";
import type { BulletinPdfInput, BulletinStanding, NominationMatch, RegistrationMatch } from "@/lib/bulletin-pdf";
import { formatDate, MATCH_STATUS_LABEL, todayISO } from "@/lib/format";
import { formatScore } from "@/lib/quarter-points";
import { A4, asset, M, OFFICIAL_LABEL, upper, W } from "@/lib/schedule-pdf";

// Boje kao C u schedule-pdf
const FG = "0F0F11";
const MUTED = "5C5C66";
const FAINT = "6B7280";
const LINE = "CCCFD4";
const FRAME = "8C8F99";
const PANEL = "F1F3F5";
const ORANGE = "B74709";
const FONT = "Arial";

/** pt → twip (Word mjeri širine i razmake u dvadesetinama tačke) */
const tw = (pt: number) => Math.round(pt * 20);
const PAGE_W = tw(W);

type TextOpts = { size?: number; bold?: boolean; color?: string };
const run = (text: string, { size = 10, bold = false, color = FG }: TextOpts = {}) => new TextRun({ text, size: size * 2, bold, color, font: FONT });

type ParaOpts = TextOpts & { align?: (typeof AlignmentType)[keyof typeof AlignmentType]; before?: number; after?: number; keepNext?: boolean };
const para = (text: string, { align, before = 0, after = 0, keepNext, ...t }: ParaOpts = {}) =>
  new Paragraph({ children: [run(text, t)], alignment: align, spacing: { before: tw(before), after: tw(after) }, keepNext, keepLines: true });

const border = (color: string, size = 4) => ({ style: BorderStyle.SINGLE, size, color });
const NONE = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const NO_BORDERS = { top: NONE, bottom: NONE, left: NONE, right: NONE, insideHorizontal: NONE, insideVertical: NONE };
/** Okvir bloka tamniji, unutrašnje linije svijetle (kao u PDF-u) */
const BLOCK_BORDERS = { top: border(FRAME, 6), bottom: border(FRAME, 6), left: border(FRAME, 6), right: border(FRAME, 6), insideHorizontal: border(LINE), insideVertical: border(LINE) };

type CellOpts = { span?: number; merge?: "restart" | "continue"; fill?: boolean; margin?: number };
function cell(children: Paragraph[], width: number, { span, merge, fill, margin = 6 }: CellOpts = {}) {
  return new TableCell({
    children: children.length > 0 ? children : [new Paragraph({})],
    width: { size: tw(width), type: WidthType.DXA },
    columnSpan: span,
    verticalMerge: merge === "restart" ? VerticalMergeType.RESTART : merge === "continue" ? VerticalMergeType.CONTINUE : undefined,
    shading: fill ? { fill: PANEL, type: ShadingType.CLEAR, color: "auto" } : undefined,
    verticalAlign: VerticalAlignTable.CENTER,
    margins: { top: tw(1), bottom: tw(1), left: tw(margin), right: tw(margin) },
  });
}

/** Blok utakmice: redovi se ne lome i ostaju na istoj strani (keepNext na svim osim zadnjeg reda) */
function block(columns: number[], rows: TableCell[][], heights: number[] = []) {
  return new Table({
    width: { size: PAGE_W, type: WidthType.DXA },
    columnWidths: columns.map(tw),
    layout: TableLayoutType.FIXED,
    borders: BLOCK_BORDERS,
    rows: rows.map(
      (children, i) =>
        new TableRow({ children, cantSplit: true, height: heights[i] ? { value: tw(heights[i]), rule: HeightRule.ATLEAST } : undefined }),
    ),
  });
}

/** Razmak između blokova (BLOCK_GAP) */
const gap = (pt = 8) => new Paragraph({ spacing: { before: 0, after: 0, line: tw(pt), lineRule: "exact" }, children: [] });

/** Širina i visina PNG-a iz zaglavlja (IHDR) */
const pngSize = (b: Buffer) => ({ w: b.readUInt32BE(16), h: b.readUInt32BE(20) });

/** Logo smanjen da stane u okvir (pt), u pikselima za Word (96 dpi) */
function logo(data: Buffer, maxW: number, maxH: number) {
  const { w, h } = pngSize(data);
  const k = Math.min(maxW / w, maxH / h);
  return new ImageRun({ type: "png", data, transformation: { width: Math.round((w * k * 96) / 72), height: Math.round((h * k * 96) / 72) } });
}

const COL_NO = 74;
const roundOrdinal = (round: number | null) => (round ? ` ${round}. kola` : "");
const matchNo = (n: number | null) => (n == null ? "" : String(n).padStart(2, "0"));
/** Broj utakmice; spaja se nadolje kroz redove bloka (merge) */
const numberCell = (n: number | null, merge?: "restart") =>
  cell([para("UTAKMICA", { size: 7, bold: true, color: FAINT, align: AlignmentType.CENTER, keepNext: true }), para(matchNo(n), { size: 18, bold: true, align: AlignmentType.CENTER, keepNext: true })], COL_NO, {
    merge,
    fill: true,
  });
/** Ekipa u jednom redu kao u PDF-u (sizeToFit): dugo ime se smanjuje do 7,5 pt (procjena širine verzala u Arialu) */
const team = (name: string, width: number) => {
  const text = upper(name);
  const size = Math.max(7.5, Math.min(10.5, Math.floor(((width - 14) / (text.length * 0.7)) * 2) / 2));
  return para(text, { size, bold: true, align: AlignmentType.CENTER, keepNext: true });
};

// ───────── Registracija ─────────

const COL_LABEL = 72;
const COL_SCORE = 120;

function registrationBlock(m: RegistrationMatch) {
  const half = (W - COL_NO - COL_SCORE) / 2;
  const cols = [COL_NO, COL_LABEL, half - COL_LABEL, half, COL_SCORE];
  const label = (t: string) => para(t, { size: 8, color: MUTED, align: AlignmentType.RIGHT, keepNext: true });
  const value = (t: string) => para(t.trim() || "—", { size: 9.5, keepNext: true });

  const score: Paragraph[] = [];
  if (m.score) {
    score.push(para(`${formatScore(m.score.home)} : ${formatScore(m.score.away)}`, { size: 16, bold: true, align: AlignmentType.CENTER, keepNext: true }));
    if (m.periods.length > 0) score.push(para(m.periods.map((p) => `${p.home}:${p.away}`).join(", "), { size: 7.5, color: MUTED, align: AlignmentType.CENTER, before: 3, keepNext: true }));
  } else {
    const played = m.status !== "scheduled";
    score.push(para(played ? upper(MATCH_STATUS_LABEL[m.status]) : "—", { size: 10, bold: true, color: played ? ORANGE : FAINT, align: AlignmentType.CENTER, keepNext: true }));
  }

  const remarks = (m.remarks.trim() || "Bez primjedbi.").split(/\r?\n/).map((l) => para(l, { size: 9 }));
  const cont = (w: number, span?: number) => cell([], w, { merge: "continue", fill: true, span });
  return block(
    cols,
    [
      [numberCell(m.number, "restart"), cell([team(m.home, half)], half, { span: 2, fill: true }), cell([team(m.away, half)], half, { fill: true }), cell([para("REZULTAT", { size: 7.5, bold: true, color: FAINT, align: AlignmentType.CENTER, keepNext: true })], COL_SCORE, { fill: true })],
      [cont(COL_NO), cell([label("Komesar")], COL_LABEL), cell([value(m.commissioner)], cols[2] + half, { span: 2 }), cell(score, COL_SCORE, { merge: "restart" })],
      [cont(COL_NO), cell([label("Sudije")], COL_LABEL), cell([value(m.referees)], cols[2] + half, { span: 2 }), cell([], COL_SCORE, { merge: "continue" })],
      [cont(COL_NO), cell([para("PRIMJEDBE", { size: 7, bold: true, color: FAINT, after: 2, keepNext: true }), ...remarks], W - COL_NO, { span: 4, margin: 10 })],
    ],
    [24, 20, 20],
  );
}

// ───────── Nominacija ─────────

const COL_DATE = 112;

function nominationBlock(m: NominationMatch, names: boolean) {
  const half = (W - COL_NO - COL_DATE) / 2;
  const labelW = COL_LABEL + 24;
  const cols = [COL_NO, COL_DATE, labelW, half - labelW, half];
  const rows = m.officials.filter((o) => OFFICIAL_LABEL[o.position]);
  const when = [para(m.date, { size: 9.5, bold: true, align: AlignmentType.CENTER, keepNext: true })];
  if (m.hall) when.push(para(upper(m.hall), { size: 8, align: AlignmentType.CENTER, before: 3, keepNext: true }));

  const merge = rows.length > 0 ? "restart" : undefined;
  const first = [
    numberCell(m.number, merge),
    cell(when, COL_DATE, { merge, fill: true }),
    cell([team(m.home, half)], half, { span: 2, fill: true }),
    cell([team(m.away, half)], half, { fill: true }),
  ];
  const officials = rows.map((o) => [
    cell([], COL_NO, { merge: "continue", fill: true }),
    cell([], COL_DATE, { merge: "continue", fill: true }),
    cell([para(OFFICIAL_LABEL[o.position]!, { size: 8, color: MUTED, align: AlignmentType.RIGHT, keepNext: true })], labelW),
    cell([para(names && o.name ? o.name : "", { size: 9.5, keepNext: true })], W - COL_NO - COL_DATE - labelW, { span: 2 }),
  ]);
  return block(cols, [first, ...officials], [24, ...rows.map(() => 18)]);
}

// ───────── Tabela ─────────

const RANK_W = 28;
const NUM_W = 46;
const STANDINGS_COLS: { label: string; value: (r: BulletinStanding) => string | number }[] = [
  { label: "OU", value: (r) => r.played },
  { label: "P", value: (r) => r.won },
  { label: "I", value: (r) => r.lost },
  { label: "KOŠ +", value: (r) => formatScore(r.pointsFor) },
  { label: "KOŠ −", value: (r) => formatScore(r.pointsAgainst) },
  { label: "+/−", value: (r) => (r.diff > 0 ? `+${formatScore(r.diff)}` : formatScore(r.diff)) },
  { label: "BOD", value: (r) => formatScore(r.points) },
];

function standingsTable(rows: BulletinStanding[]) {
  const nameW = W - RANK_W - STANDINGS_COLS.length * NUM_W;
  const cols = [RANK_W, nameW, ...STANDINGS_COLS.map(() => NUM_W)];
  const center = (t: string, o: TextOpts = {}) => para(t, { size: 9, align: AlignmentType.CENTER, ...o });
  const head = new TableRow({
    tableHeader: true,
    cantSplit: true,
    height: { value: tw(24), rule: HeightRule.ATLEAST },
    children: [
      cell([], RANK_W, { fill: true }),
      cell([para("EKIPA", { size: 7.5, bold: true, color: FAINT })], nameW, { fill: true }),
      ...STANDINGS_COLS.map((c) => cell([center(c.label, { size: 7.5, bold: true, color: FAINT })], NUM_W, { fill: true })),
    ],
  });
  const body = rows.map(
    (r, i) =>
      new TableRow({
        cantSplit: true,
        height: { value: tw(19), rule: HeightRule.ATLEAST },
        children: [
          cell([center(`${i + 1}.`, { bold: true, color: MUTED })], RANK_W),
          cell([para(upper(r.name), { size: 9, bold: true })], nameW),
          ...STANDINGS_COLS.map((c, j) => cell([center(String(c.value(r)), { bold: j === STANDINGS_COLS.length - 1 })], NUM_W)),
        ],
      }),
  );
  return new Table({
    width: { size: PAGE_W, type: WidthType.DXA },
    columnWidths: cols.map(tw),
    layout: TableLayoutType.FIXED,
    borders: { ...NO_BORDERS, insideHorizontal: border(LINE), bottom: border(LINE) },
    rows: [head, ...body],
  });
}

// ───────── Dokument ─────────

/** Zaglavlje strane: grb, liga, naslov, sezona; datum desno; linija ispod */
function pageHeader(crest: Buffer, input: BulletinPdfInput, heading: string, issued: string) {
  const rest = W - 50 - 140;
  const left = [para(upper(input.title), { size: 7.5, bold: true, color: FAINT }), para(upper(heading), { size: 17, bold: true })];
  if (input.season) left.push(para(`Takmičarska sezona ${input.season}`, { size: 8.5, color: MUTED }));
  const c = (children: Paragraph[], w: number) =>
    new TableCell({ children, width: { size: tw(w), type: WidthType.DXA }, verticalAlign: VerticalAlignTable.TOP, margins: { top: 0, bottom: tw(8), left: 0, right: 0 } });
  return new Table({
    width: { size: PAGE_W, type: WidthType.DXA },
    columnWidths: [tw(50), tw(rest), tw(140)],
    layout: TableLayoutType.FIXED,
    borders: { ...NO_BORDERS, bottom: border(LINE, 6) },
    rows: [
      new TableRow({
        children: [
          c([new Paragraph({ children: [logo(crest, 38, 44)] })], 50),
          c(left, rest),
          c([para("DATUM", { size: 7, bold: true, color: FAINT, align: AlignmentType.RIGHT }), para(issued, { size: 11, bold: true, align: AlignmentType.RIGHT })], 140),
        ],
      }),
    ],
  });
}

/** Podnožje: savez · bilten lijevo, broj strane (u dijelu bez naslovne) desno */
function pageFooter(org: string, heading: string) {
  const c = (p: Paragraph, w: number) => new TableCell({ children: [p], width: { size: tw(w), type: WidthType.DXA }, margins: { top: 0, bottom: 0, left: 0, right: 0 } });
  const pages = new TextRun({ children: ["Strana ", PageNumber.CURRENT, " / ", PageNumber.TOTAL_PAGES_IN_SECTION], size: 15, color: FAINT, font: FONT });
  return new Table({
    width: { size: PAGE_W, type: WidthType.DXA },
    columnWidths: [tw(W - 120), tw(120)],
    layout: TableLayoutType.FIXED,
    borders: NO_BORDERS,
    rows: [new TableRow({ children: [c(para(`${org}  ·  ${heading}`, { size: 7.5, color: FAINT }), W - 120), c(new Paragraph({ alignment: AlignmentType.RIGHT, children: [pages] }), 120)] })],
  });
}

const PAGE = { size: { width: tw(A4.w), height: tw(A4.h) }, margin: { top: tw(M), bottom: tw(M), left: tw(M), right: tw(M), header: tw(M), footer: tw(M - 22) } };

export async function bulletinDocx(input: BulletinPdfInput) {
  const crest = await asset(input.brand.logo);
  const heading = input.number.trim() ? `Bilten br. ${input.number.trim()}` : "Bilten";
  const issued = formatDate(todayISO());

  // Dijelovi redom kao u PDF-u (odluke ispod tabele)
  const parts: { title: string; body: () => (Paragraph | Table)[] }[] = [];
  const reg = input.registration;
  const multi = (n: number) => n > 1;
  const groupTitle = (name: string) => para(upper(name), { size: 9, bold: true, color: MUTED, before: 4, after: 6, keepNext: true });
  if (reg && reg.groups.length > 0)
    parts.push({
      title: `Registracija utakmica${roundOrdinal(reg.round)}`,
      body: () => reg.groups.flatMap((g) => [...(multi(reg.groups.length) ? [groupTitle(g.name)] : []), ...g.items.flatMap((m) => [registrationBlock(m), gap()]), gap(10)]),
    });
  const standings = input.standings;
  if (standings && standings.length > 0)
    parts.push({ title: "Tabela", body: () => standings.flatMap((t) => [...(multi(standings.length) ? [groupTitle(t.name)] : []), standingsTable(t.items), gap(18)]) });
  const decisions = input.decisions;
  if (decisions && decisions.length > 0)
    parts.push({
      title: "Odluke",
      body: () => [
        ...decisions.map(
          (d, i) =>
            new Paragraph({
              children: [run(`${i + 1}.`, { bold: true }), run(`\t${d}`)],
              indent: { left: tw(22), hanging: tw(22) },
              tabStops: [{ type: "left", position: tw(22) }],
              spacing: { after: tw(5), line: tw(14), lineRule: "atLeast" },
            }),
        ),
        gap(14),
      ],
    });
  const nom = input.nominations;
  if (nom && nom.groups.length > 0)
    parts.push({
      title: `Nominacija utakmica${roundOrdinal(nom.round)}`,
      body: () => nom.groups.flatMap((g) => [...(multi(nom.groups.length) ? [groupTitle(g.name)] : []), ...g.items.flatMap((m) => [nominationBlock(m, nom.names), gap()]), gap(10)]),
    });

  const body: (Paragraph | Table)[] = parts.flatMap((p, i) => [para(`${i + 1}. ${upper(p.title)}`, { size: 13, bold: true, after: 10, keepNext: true }), ...p.body()]);
  if (input.signature.trim()) body.push(para(input.signature.trim(), { size: 10.5, before: 12 }));

  const sections: ISectionOptions[] = [];
  if (input.cover) {
    const contents = parts.map((p, i) => new Paragraph({ indent: { left: tw(W / 2 - 130) }, spacing: { after: tw(10) }, children: [run(`${i + 1}.  `, { size: 12, bold: true }), run(p.title, { size: 12 })] }));
    sections.push({
      properties: { page: PAGE },
      footers: { default: new Footer({ children: [para(input.brand.org, { size: 8, color: FAINT, align: AlignmentType.CENTER })] }) },
      children: [
        para(upper(input.league), { size: 15, bold: true, align: AlignmentType.CENTER, before: 30 }),
        ...(input.season ? [para(`TAKMIČARSKA SEZONA ${input.season}`, { size: 12.5, bold: true, color: MUTED, align: AlignmentType.CENTER, before: 6 })] : []),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: tw(40), after: tw(30) }, children: [logo(crest, 300, 260)] }),
        para(upper(heading), { size: 30, bold: true, align: AlignmentType.CENTER }),
        para(upper(input.title), { size: 15, bold: true, color: MUTED, align: AlignmentType.CENTER, before: 4 }),
        para(issued, { size: 11, color: FAINT, align: AlignmentType.CENTER, before: 4 }),
        ...(contents.length > 0
          ? [
              new Paragraph({
                indent: { left: tw(W / 2 - 130), right: tw(W / 2 - 130) },
                spacing: { before: tw(46), after: tw(14) },
                border: { bottom: { ...border(LINE, 4), space: 4 } },
                children: [run("S A D R Ž A J", { size: 9, bold: true, color: FAINT })],
              }),
              ...contents,
            ]
          : []),
      ],
    });
  }
  sections.push({
    properties: { page: { ...PAGE, margin: { ...PAGE.margin, top: tw(M + 80) }, pageNumbers: { start: 1 } } },
    headers: { default: new Header({ children: [pageHeader(crest, input, heading, issued)] }) },
    footers: { default: new Footer({ children: [pageFooter(input.brand.org, heading)] }) },
    children: body,
  });

  const doc = new Document({
    title: `${heading} — ${input.title}`,
    creator: input.brand.org,
    styles: { default: { document: { run: { font: FONT, size: 20, color: FG }, paragraph: { spacing: { before: 0, after: 0 } } } } },
    sections,
  });
  return Packer.toBuffer(doc);
}

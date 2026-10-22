// PDF licenci kluba (A4, 8 kartica po strani): ista kartica kao na stranici kluba.
// Font je Geist iz src/app/_og (kao OG slika) jer standardni PDF fontovi nemaju č, ć, đ.
import { readFile } from "node:fs/promises";
import path from "node:path";
import fontkit from "@pdf-lib/fontkit";
import { clip, endPath, PDFDocument, popGraphicsState, pushGraphicsState, rectangle, rgb, type PDFFont, type PDFImage, type PDFPage } from "pdf-lib";
import type { ClubLicenses, License } from "@/lib/data/licenses";
import { formatDate } from "@/lib/format";

const A4 = { w: 595.28, h: 841.89 };
const M = 36; // margina
const GAP = 12;
const COLS = 2;
const ROWS = 4;
const CARD_W = (A4.w - 2 * M - GAP * (COLS - 1)) / COLS;
const CARD_H = 156;
const HEAD_H = 22;
const FOOT_H = 26;
const PHOTO = { w: 66, h: 88 };

const C = {
  fg: rgb(0.059, 0.059, 0.067),
  muted: rgb(0.361, 0.361, 0.4),
  faint: rgb(0.42, 0.447, 0.502),
  line: rgb(0.886, 0.898, 0.914),
  panel2: rgb(0.945, 0.953, 0.961),
  // Za štampu: ivica kartice je linija za rezanje, unutrašnje linije moraju ostati vidljive na papiru
  cut: rgb(0.2, 0.2, 0.22),
  divider: rgb(0.66, 0.68, 0.71),
};

type Fonts = { regular: PDFFont; bold: PDFFont };
type Images = { ksks: PDFImage; club: PDFImage | null; photos: Map<string, PDFImage> };

/** Prozirnost KSKS grba iza kartica (isti grb je i u zaglavlju strane i kartice) */
const WATERMARK_OPACITY = 0.06;

const asset = (p: string) => readFile(path.join(process.cwd(), p));

async function fetchBytes(url: string) {
  try {
    const res = await fetch(url, { cache: "no-store" });
    return res.ok ? new Uint8Array(await res.arrayBuffer()) : null;
  } catch {
    return null;
  }
}

/** PNG ili JPEG po potpisu fajla; ostalo (SVG, WebP) PDF ne može ugraditi */
async function embedImage(doc: PDFDocument, bytes: Uint8Array | null) {
  if (!bytes) return null;
  if (bytes[0] === 0x89 && bytes[1] === 0x50) return doc.embedPng(bytes);
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return doc.embedJpg(bytes);
  return null;
}

export async function licensesPdf({ competition, club, players, officials }: ClubLicenses) {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  doc.setTitle(`Licence — ${club.name} — ${competition.name}`);
  doc.setAuthor("Košarkaški savez Kantona Sarajevo");

  const all = [...players, ...officials];
  const [regular, bold, ksks, clubImg, ...photos] = await Promise.all([
    asset("src/app/_og/Geist-500.woff").then((b) => doc.embedFont(b, { subset: true })),
    asset("src/app/_og/Geist-700.woff").then((b) => doc.embedFont(b, { subset: true })),
    asset("public/brand/ksks-logo-1024.png").then((b) => doc.embedPng(b)),
    club.logoUrl ? fetchBytes(club.logoUrl).then((b) => embedImage(doc, b)) : null,
    ...all.map((l) => (l.photoUrl ? fetchBytes(l.photoUrl).then((b) => embedImage(doc, b)) : null)),
  ]);
  const fonts = { regular, bold };
  const images: Images = {
    ksks,
    club: clubImg,
    photos: new Map(all.flatMap((l, i) => (photos[i] ? [[l.id, photos[i]] as const] : []))),
  };

  const sections = [
    { title: "Igrači", list: players },
    { title: "Službena lica", list: officials },
  ].filter((s) => s.list.length > 0);

  // Svaka sekcija počinje na novoj strani
  for (const section of sections) {
    for (let i = 0; i < section.list.length; i += COLS * ROWS) {
      const page = doc.addPage([A4.w, A4.h]);
      // Grb saveza preko cijele strane, prvi da bude iza svega
      drawContained(page, ksks, M, M, A4.w - 2 * M, A4.h - 2 * M, WATERMARK_OPACITY);
      const top = drawPageHeader(page, fonts, images, { competition, club }, `${section.title} (${section.list.length})`);
      section.list.slice(i, i + COLS * ROWS).forEach((l, j) => {
        const x = M + (j % COLS) * (CARD_W + GAP);
        const y = top - Math.floor(j / COLS) * (CARD_H + GAP);
        drawCard(page, fonts, images, { competition, club }, l, x, y);
      });
    }
  }

  const pages = doc.getPages();
  pages.forEach((page, i) => {
    page.drawText("Košarkaški savez Kantona Sarajevo", { x: M, y: M - 14, size: 7.5, font: regular, color: C.faint });
    const label = `Strana ${i + 1} / ${pages.length}`;
    page.drawText(label, { x: A4.w - M - regular.widthOfTextAtSize(label, 7.5), y: M - 14, size: 7.5, font: regular, color: C.faint });
  });

  return doc.save();
}

/** Zaglavlje strane: grb i naziv kluba, takmičenje i sezona, grb saveza; vraća vrh prve kartice */
function drawPageHeader(page: PDFPage, f: Fonts, img: Images, { competition, club }: Pick<ClubLicenses, "competition" | "club">, section: string) {
  const top = A4.h - M;
  let x = M;
  if (img.club) {
    drawContained(page, img.club, M, top - 36, 36, 36);
    x += 46;
  }
  page.drawText(club.name, { x, y: top - 17, size: 17, font: f.bold, color: C.fg });
  const sub = ["Lista licenciranih igrača i službenih lica", competition.name, competition.season && `sezona ${competition.season}`].filter(Boolean).join("  ·  ");
  page.drawText(sub, { x, y: top - 32, size: 8.5, font: f.regular, color: C.muted });
  drawContained(page, img.ksks, A4.w - M - 54, top - 36, 54, 36);

  page.drawLine({ start: { x: M, y: top - 48 }, end: { x: A4.w - M, y: top - 48 }, thickness: 0.75, color: C.line });
  page.drawText(section, { x: M, y: top - 68, size: 11, font: f.bold, color: C.fg });
  return top - 80;
}

/** Kartica licence; (x, y) = gornji lijevi ugao */
function drawCard(page: PDFPage, f: Fonts, img: Images, { competition, club }: Pick<ClubLicenses, "competition" | "club">, l: License, x: number, y: number) {
  const bottom = y - CARD_H;
  // Bez bijele podloge (strana je bijela), da se grb iza vidi; ivica se crta na kraju, preko svega

  // Zaglavlje: grb saveza, takmičenje i sezona
  page.drawRectangle({ x, y: y - HEAD_H, width: CARD_W, height: HEAD_H, color: C.panel2, opacity: 0.7 });
  page.drawLine({ start: { x, y: y - HEAD_H }, end: { x: x + CARD_W, y: y - HEAD_H }, thickness: 0.6, color: C.divider });
  drawContained(page, img.ksks, x + 8, y - HEAD_H + 3, 24, 16);
  const hx = x + 38;
  const season = competition.season ?? "";
  const seasonW = f.regular.widthOfTextAtSize(season, 7.5);
  page.drawText(fit(competition.name.toLocaleUpperCase("bs"), f.bold, 7, CARD_W - (hx - x) - seasonW - 18), { x: hx, y: y - 14, size: 7, font: f.bold, color: C.fg });
  if (season) page.drawText(season, { x: x + CARD_W - 8 - seasonW, y: y - 14, size: 7.5, font: f.regular, color: C.muted });

  // Fotografija (popunjava okvir, lice u gornjem dijelu)
  const px = x + 10;
  const py = y - HEAD_H - 10 - PHOTO.h;
  const photo = img.photos.get(l.id);
  page.drawRectangle({ x: px, y: py, width: PHOTO.w, height: PHOTO.h, color: C.panel2 });
  if (photo) drawCover(page, photo, px, py, PHOTO.w, PHOTO.h);
  else page.drawText("bez fotografije", { x: px + (PHOTO.w - f.regular.widthOfTextAtSize("bez fotografije", 6.5)) / 2, y: py + PHOTO.h / 2 - 2, size: 6.5, font: f.regular, color: C.faint });
  page.drawRectangle({ x: px, y: py, width: PHOTO.w, height: PHOTO.h, borderColor: C.divider, borderWidth: 0.6 });

  // Podaci
  const tx = px + PHOTO.w + 12;
  const tw = x + CARD_W - 10 - tx;
  const player = l.kind === "player";
  const top = y - HEAD_H - 10;
  page.drawText((player ? "Igrač" : (l.role ?? "Službeno lice")).toLocaleUpperCase("bs"), { x: tx, y: top - 7, size: 6.5, font: f.bold, color: C.faint });
  const last = l.lastName.toLocaleUpperCase("bs");
  const lastSize = sizeToFit(last, f.bold, 13, 9, tw);
  page.drawText(fit(last, f.bold, lastSize, tw), { x: tx, y: top - 22, size: lastSize, font: f.bold, color: C.fg });
  page.drawText(fit(l.firstName, f.regular, 10, tw), { x: tx, y: top - 35, size: 10, font: f.regular, color: C.fg });

  if (player) {
    const facts: [string, string | null][] = [
      ["Rođen", l.birthDate && formatDate(l.birthDate)],
      ["Mjesto", l.birthPlace],
      ["Visina", l.heightCm ? `${l.heightCm} cm` : null],
      ["Pozicija", l.position],
    ];
    const colW = (tw - 8) / 2;
    facts.forEach(([label, value], i) => {
      const fx = tx + (i % 2) * (colW + 8);
      const fy = top - 54 - Math.floor(i / 2) * 22;
      page.drawText(label, { x: fx, y: fy, size: 6.5, font: f.regular, color: C.faint });
      page.drawText(fit(value || "—", f.regular, 8.5, colW), { x: fx, y: fy - 10, size: 8.5, font: f.regular, color: C.fg });
    });
  }

  // Podnožje: klub i broj licence
  page.drawLine({ start: { x, y: bottom + FOOT_H }, end: { x: x + CARD_W, y: bottom + FOOT_H }, thickness: 0.6, color: C.divider });
  let fx = x + 8;
  if (img.club) {
    drawContained(page, img.club, fx, bottom + 5, 24, 16);
    fx += 30;
  }
  const no = l.licenseNo ?? "—";
  const noW = f.bold.widthOfTextAtSize(no, 8);
  const noLabel = "Br. licence ";
  const noLabelW = f.regular.widthOfTextAtSize(noLabel, 7.5);
  page.drawText(no, { x: x + CARD_W - 8 - noW, y: bottom + 10, size: 8, font: f.bold, color: C.fg });
  page.drawText(noLabel, { x: x + CARD_W - 8 - noW - noLabelW, y: bottom + 10, size: 7.5, font: f.regular, color: C.muted });
  page.drawText(fit(club.name, f.bold, 8, x + CARD_W - 16 - noW - noLabelW - fx), { x: fx, y: bottom + 10, size: 8, font: f.bold, color: C.fg });

  // Ivica kartice (linija za rezanje)
  page.drawRectangle({ x, y: bottom, width: CARD_W, height: CARD_H, borderColor: C.cut, borderWidth: 1 });
}

/** Slika unutar okvira, cijela vidljiva, centrirana */
function drawContained(page: PDFPage, image: PDFImage, x: number, y: number, w: number, h: number, opacity = 1) {
  const s = Math.min(w / image.width, h / image.height);
  const dw = image.width * s;
  const dh = image.height * s;
  page.drawImage(image, { x: x + (w - dw) / 2, y: y + (h - dh) / 2, width: dw, height: dh, opacity });
}

/** Slika popunjava okvir (višak se odsijeca); vertikalno je fokus na 30% od vrha, kao object-[50%_30%] */
function drawCover(page: PDFPage, image: PDFImage, x: number, y: number, w: number, h: number) {
  const s = Math.max(w / image.width, h / image.height);
  const dw = image.width * s;
  const dh = image.height * s;
  page.pushOperators(pushGraphicsState(), rectangle(x, y, w, h), clip(), endPath());
  page.drawImage(image, { x: x - (dw - w) / 2, y: y - (dh - h) * 0.7, width: dw, height: dh });
  page.pushOperators(popGraphicsState());
}

/** Najveća veličina fonta (od max do min) u kojoj tekst stane u širinu */
function sizeToFit(text: string, font: PDFFont, max: number, min: number, width: number) {
  let size = max;
  while (size > min && font.widthOfTextAtSize(text, size) > width) size -= 0.5;
  return size;
}

/** Tekst skraćen s "…" da stane u širinu */
function fit(text: string, font: PDFFont, size: number, width: number) {
  if (font.widthOfTextAtSize(text, size) <= width) return text;
  let t = text;
  while (t.length > 1 && font.widthOfTextAtSize(`${t}…`, size) > width) t = t.slice(0, -1);
  return `${t.trimEnd()}…`;
}

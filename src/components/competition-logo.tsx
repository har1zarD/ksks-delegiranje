import Image, { type StaticImageData } from "next/image";
import { Trophy } from "lucide-react";
import juniori from "../../public/competitions/juniori.png";
import kadetiG1 from "../../public/competitions/kadeti-g1.png";
import kadetiG2 from "../../public/competitions/kadeti-g2.png";
import pioniriG1 from "../../public/competitions/pioniri-g1.png";
import pioniriG2 from "../../public/competitions/pioniri-g2.png";
import minibasket from "../../public/competitions/minibasket.png";
import unobasket from "../../public/competitions/unobasket.png";

const youthLogos: Record<string, StaticImageData> = {
  juniori,
  "kadeti-g1": kadetiG1,
  "kadeti-g2": kadetiG2,
  "pioniri-g1": pioniriG1,
  "pioniri-g2": pioniriG2,
  minibasket,
  unobasket,
};

/** Ime fajla u /public/competitions (bez .png) ili null */
export function logoOf(name: string, category?: string) {
  const key = `${name} ${category ?? ""}`.toLocaleLowerCase("bs");
  if (key.includes("eurocup")) return "eurocup";
  if (/\baba\b/.test(key)) return "aba";
  if (key.includes("a1") && /žen|zen/.test(key)) return "ksbih-a1-zene";
  if (key.includes("a1")) return "ksbih-a1";
  if (key.includes("a2")) return "ksbih-a2";
  if (key.includes("premijer") || /prvenstvo.*bih/.test(key)) return "ksbih";
  const group = /\b(?:grupa|g)\s*([12])\b/.exec(key)?.[1];
  if (key.includes("pionir")) return group ? `pioniri-g${group}` : "pioniri";
  if (key.includes("kadet")) return group ? `kadeti-g${group}` : "kadeti";
  if (key.includes("junior")) return "juniori";
  if (key.includes("minibasket")) return "minibasket";
  if (key.includes("unobasket")) return "unobasket";
  return null;
}

export function CompetitionLogo({ name, category, size }: { name: string; category?: string; size?: number }) {
  const logo = logoOf(name, category);
  const width = size ?? 48;
  const height = size ?? 32;
  return (
    <span aria-hidden="true" className="inline-flex shrink-0 items-center justify-center" style={{ width, height }}>
      {logo ? (
        <Image src={youthLogos[logo] ?? `/competitions/${logo}.png`} alt="" width={width} height={height} sizes={`${width}px`} className="size-full object-contain" />
      ) : (
        <Trophy className="size-7 text-fg-muted" strokeWidth={1.6} />
      )}
    </span>
  );
}

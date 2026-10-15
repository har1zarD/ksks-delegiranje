import Image from "next/image";
import { Trophy } from "lucide-react";

function logoOf(name: string, category?: string) {
  const key = `${name} ${category ?? ""}`.toLocaleLowerCase("bs");
  if (key.includes("eurocup")) return "eurocup";
  if (/\baba\b/.test(key)) return "aba";
  if (key.includes("premijer")) return "premijer";
  if (key.includes("a1") && /žen|zen/.test(key)) return "a1-zene";
  if (key.includes("a1")) return "a1";
  if (key.includes("a2")) return "a2";
  if (key.includes("pionir")) return "pioniri";
  if (key.includes("kadet")) return "kadeti";
  if (key.includes("junior")) return "juniori";
  if (key.includes("minibasket")) return "minibasket";
  if (key.includes("unobasket")) return "unobasket";
  return null;
}

export function CompetitionLogo({ name, category }: { name: string; category?: string }) {
  const logo = logoOf(name, category);
  return (
    <span aria-hidden="true" className="inline-flex h-8 w-12 shrink-0 items-center justify-center">
      {logo ? (
        <Image src={`/competitions/${logo}.png`} alt="" width={48} height={32} sizes="48px" className="size-full object-contain" />
      ) : (
        <Trophy className="size-7 text-fg-muted" strokeWidth={1.6} />
      )}
    </span>
  );
}

import Link from "next/link";
import { ChevronLeft, ChevronRight, UserRound } from "lucide-react";
import { PageLink, PageStep } from "@/components/filter-nav";
import { ClubLogo } from "@/components/team-name";
import { cx } from "@/components/ui";
import { slug } from "@/lib/format";

// Zajednički dijelovi FIBA stranica: tabele statistike (kao EuroLeague / ABA liga), linkovi igrača i ekipa, forma, stranice.

/** Tabela statistike: prva kolona (igrač/ekipa) ostaje vidljiva pri vodoravnom skrolu na telefonu */
export const TABLE_WRAP = "overflow-x-auto rounded-lg border border-line bg-panel shadow-panel [scrollbar-width:thin]";
export const TH = "whitespace-nowrap px-2 py-2.5 text-right text-[11px] font-semibold tracking-wide text-fg-faint";
export const TD = "scoreboard whitespace-nowrap px-2 py-2.5 text-right text-[14px]";
/** Prva kolona: lijepi se lijevo, s pozadinom da sadržaj ispod ne prosijava */
export const STICKY = "sticky left-0 z-[1] bg-panel";

export const playerHref = (id: string) => `/fiba/igrac/${id}`;
/** Stranica ekipe u kategoriji (sezona: bez nje najnovija) */
export const teamHref = (category: string, name: string, season?: string | null) =>
  `/fiba/ekipa/${category}/${slug(name)}${season ? `?sezona=${encodeURIComponent(season)}` : ""}`;

/** Igrač kao link na njegovu stranicu (bez ID-a samo ime) */
export function PlayerLink({ id, name, className }: { id: string | null; name: string; className?: string }) {
  if (!id) return <span className={className}>{name}</span>;
  return (
    <Link href={playerHref(id)} className={cx("underline-offset-2 hover:underline", className)}>
      {name}
    </Link>
  );
}

const PHOTO_SIZE = { xs: "size-7", sm: "size-9", md: "size-12", lg: "size-16", xl: "size-20 sm:size-24" } as const;

/** Fotografija igrača s licence (lige saveza) u krugu; bez fotografije prazan krug */
export function PlayerPhoto({ src, name, size = "sm", className }: { src?: string | null; name: string; size?: keyof typeof PHOTO_SIZE; className?: string }) {
  const box = cx(PHOTO_SIZE[size], "shrink-0 rounded-full bg-panel-2 ring-1 ring-inset ring-line", className);
  if (!src) {
    return (
      <span aria-hidden="true" className={cx(box, "grid place-items-center text-fg-faint")}>
        <UserRound className="size-1/2" strokeWidth={1.5} />
      </span>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element -- privremeni link fotografije s licence (privatni bucket)
  return <img src={src} alt={name} loading="lazy" decoding="async" className={cx(box, "object-cover object-[50%_20%]")} />;
}

/** Ekipa s logom kao link na stranicu ekipe */
export function TeamLink({ category, name, logo, className, season }: { category: string | null; name: string; logo: string | null; className?: string; season?: string | null }) {
  const body = (
    <>
      <ClubLogo src={logo} />
      <span className="min-w-0 truncate" title={name}>{name}</span>
    </>
  );
  const cls = cx("flex min-w-0 items-center gap-2", className);
  return category ? (
    <Link href={teamHref(category, name, season)} className={cx(cls, "hover:[&>span:last-child]:underline")}>
      {body}
    </Link>
  ) : (
    <span className={cls}>{body}</span>
  );
}

/** Zadnjih 5 utakmica: P (pobjeda, puno) / I (poraz, prigušeno) */
export function FormDots({ form }: { form: boolean[] }) {
  return (
    <span className="inline-flex gap-1" aria-label={`Forma: ${form.map((w) => (w ? "pobjeda" : "poraz")).join(", ")}`}>
      {form.map((won, i) => (
        <span
          key={i}
          aria-hidden
          className={cx(
            "grid size-5 place-items-center rounded-[4px] text-[10px] font-bold",
            won ? "bg-mint/15 text-mint" : "bg-crest/10 text-crest",
          )}
        >
          {won ? "P" : "I"}
        </span>
      ))}
    </span>
  );
}

/** Pobjeda / poraz uz rezultat u historiji */
export function ResultMark({ won }: { won: boolean }) {
  return <span className={cx("inline-block w-4 text-[12px] font-bold", won ? "text-mint" : "text-crest")}>{won ? "P" : "I"}</span>;
}

/** Stranice liste: prethodna, brojevi (s opisom ispod), sljedeća */
export function Pager({ pages, page, href, label = "Stranice" }: { pages: React.ReactNode[]; page: number; href: (page: number) => string; label?: string }) {
  if (pages.length < 2) return null;
  return (
    <nav aria-label={label} className="flex items-center justify-center gap-2 pt-2 sm:gap-3">
      <PageStep href={page > 1 ? href(page - 1) : null} label="Prethodna stranica">
        <ChevronLeft className="size-5" />
      </PageStep>
      <div className="-my-1 min-w-0 overflow-x-auto py-1 [scrollbar-width:none]">
        <div className="inline-flex gap-0.5 rounded-lg bg-track p-[3px]">
          {pages.map((p, i) => (
            <PageLink key={i} href={href(i + 1)} page={i + 1} active={page === i + 1}>
              <span className="scoreboard text-[18px] font-semibold leading-tight">{i + 1}</span>
              {p && <span className="whitespace-nowrap text-[12px] font-semibold">{p}</span>}
            </PageLink>
          ))}
        </div>
      </div>
      <PageStep href={page < pages.length ? href(page + 1) : null} label="Sljedeća stranica">
        <ChevronRight className="size-5" />
      </PageStep>
    </nav>
  );
}

/** Velika brojka s opisom (prosjeci igrača, zaglavlje ekipe) */
export function BigStat({ label, value, sub }: { label: string; value: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div className="min-w-0 px-4 py-3.5 sm:px-5">
      <dt className="text-[12px] font-semibold text-fg-muted">{label}</dt>
      <dd className="scoreboard mt-1.5 text-[26px] font-semibold leading-none tracking-[-0.03em] sm:text-[30px]">{value}</dd>
      {sub && <dd className="scoreboard mt-1 text-[12px] text-fg-faint">{sub}</dd>}
    </div>
  );
}

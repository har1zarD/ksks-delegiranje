import { Check, Clock, Mail, MailCheck, MailX } from "lucide-react";
import type { StaffingSummary } from "@/lib/data/admin";
import { POSITION_LABEL } from "@/lib/format";
import { cx, Status } from "@/components/ui";

/** Stanje delegiranja utakmice */
export function StaffingBadge({ staffing }: { staffing: StaffingSummary }) {
  const { missing, pending } = staffing;
  if (missing.length > 0) return <Status tone="orange">Nedostaje {missing.length}</Status>;
  if (pending > 0) return <Status tone="gold">{pending} čeka</Status>;
  return <Status tone="mint">Popunjeno</Status>;
}

const sentAt = (iso: string) =>
  new Date(iso).toLocaleString("bs-BA", { timeZone: "Europe/Sarajevo", day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit" });

/**
 * Da li je nominacija otišla emailom. Aktiviranje (published_at) šalje nominaciju svima;
 * delegiranja dodana poslije toga čekaju "Objavi izmjene" (`unnotified`). `compact` = na telefonu samo ikona.
 */
export function EmailStatus({ publishedAt, unnotified, compact }: { publishedAt: string | null; unnotified: number; compact?: boolean }) {
  const s = !publishedAt
    ? { icon: MailX, label: "Email nije poslan", title: "Utakmica nije aktivirana: nominacija nije poslana", tone: "border-line bg-panel-2 text-fg-muted" }
    : unnotified > 0
      ? { icon: Mail, label: "Izmjene nisu poslane", title: `Nisu obaviješteni: ${unnotified} (objavi izmjene na utakmici)`, tone: "border-amber/40 bg-amber/15 text-amber-ink" }
      : { icon: MailCheck, label: "Email poslan", title: `Nominacija poslana emailom ${sentAt(publishedAt)}`, tone: "border-mint/25 bg-mint/10 text-mint" };
  const Icon = s.icon;
  return (
    <span title={s.title} className={cx("inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border py-0.5 text-[12px] font-semibold", compact ? "px-1.5 sm:px-2" : "px-2", s.tone)}>
      <Icon className="size-3.5" aria-hidden="true" />
      <span className={compact ? "sr-only sm:not-sr-only" : undefined}>{s.label}</span>
    </span>
  );
}

/** "Haris Velić" → "Velić H." */
function shortName(name: string) {
  const w = name.trim().split(/\s+/);
  return w.length > 1 ? `${w[w.length - 1]} ${w[0][0]}.` : name;
}

/** Kvačica = potvrdio nominaciju, sat = još nije odgovorio */
function AnswerIcon({ accepted }: { accepted: boolean }) {
  return accepted ? (
    <span className="grid size-4 shrink-0 place-items-center rounded-full bg-mint text-white" title="Potvrdio">
      <Check className="size-2.5" strokeWidth={4} aria-hidden="true" />
    </span>
  ) : (
    <span className="grid size-4 shrink-0 place-items-center rounded-full bg-amber/20 text-amber-ink" title="Čeka odgovor">
      <Clock className="size-2.5" strokeWidth={3} aria-hidden="true" />
    </span>
  );
}

/**
 * Delegirani na utakmici (stanje i email su u jezičku na vrhu kartice; `sm:pt-5` = tabela ne ide pod jezičak).
 * Telefon: imena u red ("Velić H.").
 * Od `sm`: mala tabela (pozicija | stanje | ime), iste širine u svakom redu liste pa su kolone poravnate.
 */
export function StaffingCrew({ staffing }: { staffing: StaffingSummary }) {
  const { people } = staffing;
  if (people.length === 0) return null;
  return (
    <div className="sm:w-72 sm:pt-5">
      <ul className="flex flex-wrap gap-x-3 gap-y-1 text-[13px] sm:hidden">
        {people.map((p) => (
          <li key={p.position} className="flex items-center gap-1.5" title={`${p.name}, ${POSITION_LABEL[p.position]}`}>
            <AnswerIcon accepted={p.accepted} />
            <span className={cx("whitespace-nowrap", p.accepted ? "font-medium text-fg" : "text-fg-muted")}>
              {shortName(p.name)}
              <span className="sr-only">{p.accepted ? ", potvrdio" : ", čeka odgovor"}</span>
            </span>
          </li>
        ))}
      </ul>
      <ul className="hidden grid-cols-[6.5rem_auto_minmax(0,1fr)] items-center gap-x-2 gap-y-1.5 text-[13px] sm:grid">
        {people.map((p) => (
          <li key={p.position} className="col-span-3 grid grid-cols-subgrid items-center">
            <span className="truncate text-[12px] text-fg-faint">{POSITION_LABEL[p.position]}</span>
            <AnswerIcon accepted={p.accepted} />
            <span className={cx("truncate", p.accepted ? "font-medium text-fg" : "text-fg-muted")}>
              {p.name}
              <span className="sr-only">{p.accepted ? ", potvrdio" : ", čeka odgovor"}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

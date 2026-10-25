import { TeamName } from "@/components/team-name";
import Link from "next/link";
import { ChevronDown, ChevronLeft, ChevronRight, Search, Wallet, CheckCircle2, Clock } from "lucide-react";
import {
  formatKM,
  formatMonth,
  matchesLabel,
  shiftMonth,
  type PayrollFilter,
  type PayrollMatch,
  type PayrollPerson,
} from "@/lib/finance";
import { formatDayMonth, matchNo, POSITION_LABEL } from "@/lib/format";
import { cx, inputClass } from "@/components/ui";
import { FilterForm, FilterLink, FilterSegment, FilterSegments } from "@/components/filter-nav";
import { MarkAllPaid, PaidBadge, PaidToggle } from "@/components/paid-toggle";
import { PayrollMatchCard } from "./match-card";

type Params = Record<string, string | undefined>;

/** Link s izmijenjenim parametrima (undefined = ukloni) */
function withParams(basePath: string, current: Params, change: Params) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...current, ...change })) if (v) q.set(k, v);
  const s = q.toString();
  return `${basePath}${s ? `?${s}` : ""}`;
}

/** Period: ‹ mjesec › ili "Sve" (cijela evidencija); `children` stoji desno u istom redu */
export function PeriodPicker({ period, basePath, params = {}, children }: { period: string; basePath: string; params?: Params; children?: React.ReactNode }) {
  const all = period === "sve";
  const month = all ? undefined : period;
  const link = (m: string) => withParams(basePath, params, { mjesec: m });
  const arrow = "grid size-9 place-items-center rounded-md text-fg-muted hover:bg-panel-2 hover:text-fg";
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-3">
      {month ? (
        <div className="-ml-2 inline-flex items-center">
          <FilterLink href={link(shiftMonth(month, -1))} className={arrow} aria-label="Prethodni mjesec">
            <ChevronLeft className="size-[18px]" />
          </FilterLink>
          <span className="min-w-32 text-center font-display text-[17px] font-semibold capitalize">{formatMonth(month)}</span>
          <FilterLink href={link(shiftMonth(month, 1))} className={arrow} aria-label="Sljedeći mjesec">
            <ChevronRight className="size-[18px]" />
          </FilterLink>
        </div>
      ) : (
        <span className="pr-1 font-display text-[17px] font-semibold">Sve utakmice</span>
      )}
      <FilterSegments>
        <FilterSegment href={withParams(basePath, params, { mjesec: undefined })} active={!all}>
          Mjesec
        </FilterSegment>
        <FilterSegment href={withParams(basePath, params, { mjesec: "sve" })} active={all}>
          Sve
        </FilterSegment>
      </FilterSegments>
      {children && <div className="w-full sm:ml-auto sm:w-auto">{children}</div>}
    </div>
  );
}

/** Prikaz po utakmicama (podrazumijevano) ili po osobama; prelaz na utakmice otvara neisplaćene */
export function PayrollViews({ basePath, params }: { basePath: string; params: Params }) {
  return (
    <FilterSegments>
      <FilterSegment href={withParams(basePath, params, { prikaz: undefined, isplata: "neisplaceno" })} active={params.prikaz !== "osobe"}>
        Po utakmicama
      </FilterSegment>
      <FilterSegment href={withParams(basePath, params, { prikaz: "osobe" })} active={params.prikaz === "osobe"}>
        Po osobama
      </FilterSegment>
    </FilterSegments>
  );
}

const GROUPS = [
  { value: undefined, label: "Svi" },
  { value: "sudije", label: "Sudije" },
  { value: "sto", label: "Pomoćne sudije" },
  { value: "komesari", label: "Komesari" },
] as const;

const PAID = [
  { value: undefined, label: "Sve" },
  { value: "neisplaceno", label: "Nije isplaćeno" },
  { value: "isplaceno", label: "Isplaćeno" },
] as const;

/** Grupa, isplata i pretraga (ekipa, osoba, takmičenje, broj utakmice) u jednom redu. Bez JS-a: linkovi i GET forma. */
export function PayrollFilters({ basePath, params, groups = true }: { basePath: string; params: Params; groups?: boolean }) {
  return (
    <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
      {groups && (
        <FilterSegments>
          {GROUPS.map((g) => (
            <FilterSegment key={g.label} href={withParams(basePath, params, { grupa: g.value })} active={params.grupa === g.value}>
              {g.label}
            </FilterSegment>
          ))}
        </FilterSegments>
      )}
      <FilterSegments>
        {PAID.map((p) => (
          <FilterSegment key={p.label} href={withParams(basePath, params, { isplata: p.value })} active={params.isplata === p.value}>
            {p.label}
          </FilterSegment>
        ))}
      </FilterSegments>
      <FilterForm action={basePath} className="relative w-full lg:ml-auto lg:w-72 xl:w-80" role="search">
        {Object.entries(params).map(([k, v]) => k !== "q" && v && <input key={k} type="hidden" name={k} value={v} />)}
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-faint" />
        <input
          name="q"
          type="search"
          defaultValue={params.q ?? ""}
          placeholder="Ekipa, osoba ili broj utakmice"
          aria-label="Pretraga"
          className={cx(inputClass, "pl-9")}
        />
      </FilterForm>
    </div>
  );
}

/** Zarađeno / Isplaćeno / Duguje se */
export function PayrollSummary({
  total,
  paid,
  unpaid,
  note,
  aside,
}: {
  total: number;
  paid: number;
  unpaid: number;
  note?: React.ReactNode;
  aside?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-line bg-panel px-4 shadow-panel sm:px-6">
      {/* Telefon: Zarađeno preko cijele širine, Isplaćeno i Duguje se jedno do drugog */}
      <dl className="grid grid-cols-2 gap-x-4 gap-y-4 py-4 sm:grid-cols-3 sm:gap-x-6 sm:py-5">
        <Amount icon={<Wallet />} label="Zarađeno" value={total} className="col-span-2 sm:col-span-1" />
        <Amount icon={<CheckCircle2 />} label="Isplaćeno" value={paid} tone="text-mint" />
        <Amount icon={<Clock />} label="Duguje se" value={unpaid} tone={unpaid > 0 ? "text-crest" : "text-fg-muted"} />
      </dl>
      {(note || aside) && (
        <div className="flex flex-col gap-3 border-t border-line py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-[13px] text-fg-muted">{note}</div>
          {aside}
        </div>
      )}
    </div>
  );
}

function Amount({ label, value, tone, icon, className }: { label: string; value: number; tone?: string; icon: React.ReactNode; className?: string }) {
  return (
    <div className={cx("min-w-0", className)}>
      <dt className="mb-1.5 flex items-center gap-1.5 text-[12px] font-medium text-fg-muted sm:text-[13px]"><span aria-hidden="true" className="[&>svg]:size-3.5 [&>svg]:stroke-[1.7]">{icon}</span>{label}</dt>
      <dd className={cx("scoreboard truncate whitespace-nowrap text-[20px] font-semibold leading-tight sm:text-[24px]", tone)}>{formatKM(value)}</dd>
    </div>
  );
}

/** Stavke osobe: datum, utakmica, iznos, isplata (admin može mijenjati) */
export function PayrollItems({ person, editable }: { person: PayrollPerson; editable?: boolean }) {
  return (
    <ul className="divide-y divide-line">
      {person.items.map((i) => (
        // Telefon: utakmica preko cijele širine, iznos i isplata u redu ispod; od sm: datum lijevo, iznos desno
        <li key={i.assignmentId} className="flex flex-col gap-2 py-3 text-[14px] sm:flex-row sm:items-center sm:gap-3">
          <span className="scoreboard hidden w-12 shrink-0 whitespace-nowrap text-[17px] font-semibold text-fg-muted sm:block">{formatDayMonth(i.startsAt)}</span>
          {/* Klik na utakmicu: admin ide na uređivanje, službeno lice na stranicu utakmice */}
          <Link href={editable ? `/admin/utakmice/${i.matchId}` : `/utakmice/${i.matchId}`} className="group/match min-w-0 flex-1">
            <span className="flex min-w-0 flex-col gap-1 font-semibold group-hover/match:underline group-hover/match:underline-offset-4">
              <TeamName name={i.home?.name ?? "Domaćin"} logoUrl={i.home?.club?.logo_url} />
              <TeamName name={i.away?.name ?? "Gost"} logoUrl={i.away?.club?.logo_url} />
            </span>
            <span className="mt-1 block text-[13px] text-fg-muted">
              <span className="sm:hidden">{formatDayMonth(i.startsAt)}, </span>
              <span className="font-semibold text-fg">{matchNo(i.number)}</span>, {i.competition}
              {i.kind && ` (${i.kind})`}, {POSITION_LABEL[i.position].toLowerCase()}
              {i.position.startsWith("referee") && (i.refereeCount === 3 ? " (trojka)" : " (dvojka)")}
            </span>
          </Link>
          <span className="flex items-center justify-between gap-3 sm:shrink-0 sm:justify-end sm:gap-4">
            <span className={cx("scoreboard whitespace-nowrap text-[17px] font-semibold", i.amount == null && "text-[13px] text-orange")}>
              {i.amount == null ? "cijena nije određena" : formatKM(i.amount)}
            </span>
            {editable ? <PaidToggle id={i.assignmentId} paid={Boolean(i.paidAt)} /> : <PaidBadge paid={Boolean(i.paidAt)} />}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Osobe: zarađeno i dug; otvaranjem stavke s isplatom; link na detalje osobe */
export function PayrollTable({ people, personHref, open }: { people: PayrollPerson[]; personHref: (id: string) => string; open?: boolean }) {
  return (
    <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-panel shadow-panel [&>*]:px-4 sm:[&>*]:px-6">
      {people.map((p) => (
        <li key={p.profileId}>
          <details className="group" open={open}>
            <summary className="-mx-4 flex cursor-pointer list-none items-center gap-3 px-4 py-4 transition-colors hover:bg-panel-2 sm:-mx-6 sm:px-6 [&::-webkit-details-marker]:hidden">
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{p.name}</span>
                <span className="block text-[13px] text-fg-muted">
                  {matchesLabel(p.items.length)}
                  {p.missing > 0 && <span className="text-orange">, {p.missing} bez cijene</span>}
                </span>
              </span>
              <span className="flex flex-col items-end gap-0.5">
                <span className="scoreboard whitespace-nowrap text-[20px] font-semibold">{formatKM(p.total)}</span>
                {/* Stavka bez cijene je 0 KM, pa se "sve isplaćeno" gleda po broju neisplaćenih, ne po iznosu */}
                <span className={cx("whitespace-nowrap text-[12px] font-semibold", p.unpaidCount > 0 ? "text-crest" : "text-mint")}>
                  {p.unpaid > 0 ? `Duguje se ${formatKM(p.unpaid)}` : p.unpaidCount > 0 ? "Nije isplaćeno" : "Sve isplaćeno"}
                </span>
              </span>
              <ChevronDown className="size-5 shrink-0 text-fg-faint transition-transform group-open:rotate-180" />
            </summary>
            <div className="pb-4 sm:pl-4">
              <PayrollItems person={p} editable />
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
                <Link href={personHref(p.profileId)} className="text-[14px] font-semibold text-fg underline-offset-4 hover:underline">
                  Svi podaci za {p.name}
                </Link>
                <MarkAllPaid
                  ids={p.items.filter((i) => !i.paidAt).map((i) => i.assignmentId)}
                  amount={p.unpaid}
                />
              </div>
            </div>
          </details>
        </li>
      ))}
    </ul>
  );
}

/** Male kartice utakmica: ekipe, ko je radio, iznos i isplata po osobi; isplata cijele utakmice odjednom; klik na utakmicu = ručne cijene */
export function PayrollMatches({ matches }: { matches: PayrollMatch[] }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {matches.map((m) => (
        <PayrollMatchCard key={m.matchId} match={m} />
      ))}
    </ul>
  );
}

/** Opis aktivnog filtera za prazno stanje */
export function describeFilter(f: PayrollFilter) {
  const parts = [f.paid === "paid" ? "isplaćenih" : f.paid === "unpaid" ? "neisplaćenih" : "", f.q ? `za „${f.q}”` : ""].filter(Boolean);
  return parts.length ? ` ${parts.join(" ")}` : "";
}

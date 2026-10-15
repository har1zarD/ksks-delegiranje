// Skeleti za <Suspense>: iste kartice, razmaci i visine redova kao sadržaj koji se učitava,
// pa se ništa ne pomjera kad podaci stignu. Tekst se zamjenjuje "kosti" iste visine reda (Text).
import { CARD, cx, ROWS } from "@/components/ui";

/** Siva pločica koja pulsira */
export function Bone({ className }: { className?: string }) {
  return <span aria-hidden className={cx("block animate-pulse rounded-md bg-line", className)} />;
}

/**
 * Red teksta: `className` nosi istu tipografiju kao pravi tekst (veličina, prored),
 * pa red ima tačno njegovu visinu; `w` je širina kosti.
 */
export function Text({ className, w = "w-24" }: { className?: string; w?: string }) {
  return (
    <span aria-hidden className={cx("block", className)}>
      <span className={cx("inline-block h-[0.72em] max-w-full animate-pulse rounded-[3px] bg-line align-middle", w)} />
    </span>
  );
}

/** Omot skeleta: čitači ekrana čuju "Učitavam" */
export function Skeleton({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div role="status" aria-busy="true" aria-label="Učitavam" className={className}>
      {children}
    </div>
  );
}

/** Ponovi n puta (za redove liste) */
export function times<T>(n: number, render: (i: number) => T) {
  return Array.from({ length: n }, (_, i) => render(i));
}

// ───────── Dijelovi stranice ─────────

/** PageHeader kad i naslov dolazi iz podataka */
export function PageHeaderSkeleton({ subtitle = true, icon }: { subtitle?: boolean; icon?: boolean }) {
  return (
    <div className="mb-6 flex items-start gap-3.5 border-b border-line pb-6 sm:mb-8 sm:gap-4">
      {icon && <Bone className="size-11 shrink-0 rounded-lg sm:size-12" />}
      <div className="min-w-0">
        <Text className="font-display text-[28px] font-semibold leading-tight sm:text-[32px]" w="w-56" />
        {subtitle && <Text className="mt-1.5 text-[14px] leading-relaxed" w="w-72" />}
      </div>
    </div>
  );
}

/** SectionTitle; `count` = značka s brojem uz naslov, `icon` = ikonica ispred naslova */
export function SectionTitleSkeleton({ w = "w-36", count, action, icon }: { w?: string; count?: boolean; action?: React.ReactNode; icon?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 pb-3">
      <div className="flex min-w-0 items-center gap-2.5 font-display text-[18px] font-semibold">
        {icon && <Bone className="size-[18px] shrink-0 rounded-[4px]" />}
        <Text w={w} />
        {count && (
          <span className="inline-flex min-w-6 shrink-0 items-center justify-center rounded-md border border-line bg-panel px-1.5 py-0.5 text-[12px]">
            <Text w="w-2" />
          </span>
        )}
      </div>
      {action}
    </div>
  );
}

/** Segmenti (filteri): staza s pilulama */
export function SegmentsSkeleton({ widths, className }: { widths: string[]; className?: string }) {
  return (
    <div className={cx("-mx-4 overflow-hidden px-4 sm:mx-0 sm:px-0", className)}>
      <div className="inline-flex gap-0.5 rounded-lg bg-track p-[3px]">
        {widths.map((w, i) => (
          <span key={i} className={cx("rounded-md px-3.5 py-2.5 sm:py-1.5", i === 0 && "bg-panel-3 shadow-segment")}>
            <Text className="text-[14px]" w={w} />
          </span>
        ))}
      </div>
    </div>
  );
}

/** Dugme (visina kao Button) */
export function ButtonSkeleton({ className }: { className?: string }) {
  return <Bone className={cx("h-11 rounded-lg sm:h-10", className)} />;
}

/** Dugme bez podloge (destructive / plain, npr. "Ukloni"): samo tekst */
export function TextButtonSkeleton({ w = "w-14", className }: { w?: string; className?: string }) {
  return (
    <span className={cx("flex h-11 shrink-0 items-center px-2 sm:h-10", className)}>
      <Text className="text-[15px] font-semibold sm:text-[14px]" w={w} />
    </span>
  );
}

/** Polje forme: pravi naziv (statičan) i prazan okvir polja; `icon` kao u Field */
export function FieldSkeleton({ label, hint, className, icon }: { label?: string; hint?: boolean; className?: string; icon?: React.ReactNode }) {
  const box = <span aria-hidden className="block h-11 rounded-lg border border-line-strong bg-panel sm:h-10" />;
  return (
    <div className={cx("flex min-w-0 flex-col gap-1.5", className)}>
      {label ? <span className="text-[13px] font-medium text-fg-muted">{label}</span> : <Text className="text-[13px]" w="w-20" />}
      {icon ? (
        <span className="relative block">
          <span aria-hidden className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-fg-muted [&>svg]:size-4">{icon}</span>
          {box}
        </span>
      ) : box}
      {hint && <Text className="text-[12px]" w="w-48" />}
    </div>
  );
}

/** Status: tačka + tekst */
export function StatusSkeleton({ w = "w-20" }: { w?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[13px]">
      <Bone className="size-2 shrink-0 rounded-full" />
      <Text className="text-[13px]" w={w} />
    </span>
  );
}

/** Stat: (ikonica i) opis, pa broj kao na semaforu */
export function StatSkeleton({ w = "w-14", label = "w-24", icon }: { w?: string; label?: string; icon?: boolean }) {
  return (
    <div className="min-w-0">
      {icon ? (
        <div className="mb-3 flex items-center gap-2">
          <Bone className="size-4 shrink-0" />
          <Text className="text-[13px] font-medium" w={label} />
        </div>
      ) : (
        <Text className="mb-3 text-[13px] font-medium" w={label} />
      )}
      <Text className="scoreboard text-[28px] font-semibold leading-none sm:text-[32px]" w={w} />
    </div>
  );
}

// ───────── Utakmica u redu liste (MatchLine) ─────────

/** DateTile: dan, datum, mjesec; ispod crte vrijeme */
export function DateTileSkeleton({ size = "md", className }: { size?: "md" | "lg"; className?: string }) {
  const lg = size === "lg";
  const label = cx("leading-none", lg ? "text-[11px]" : "text-[10px]");
  return (
    <div className={cx("flex shrink-0 flex-col overflow-hidden rounded-lg border border-line text-center", lg ? "w-[76px] sm:w-[92px]" : "w-14", className)}>
      <div className={cx("flex flex-col items-center bg-panel-2", lg ? "gap-1.5 py-2.5 sm:gap-2 sm:py-3" : "gap-1 py-2")}>
        <Text className={label} w="w-6" />
        <Text className={cx("scoreboard font-semibold leading-none", lg ? "text-[32px] sm:text-[42px]" : "text-[24px]")} w={lg ? "w-10" : "w-7"} />
        <Text className={label} w="w-6" />
      </div>
      <div className={cx("flex justify-center border-t border-line bg-panel", lg ? "py-1.5" : "py-1")}>
        <Text className={cx("scoreboard font-semibold", lg ? "text-[15px] sm:text-[16px]" : "text-[13px]")} w="w-10" />
      </div>
    </div>
  );
}

const TEAM_W = ["w-40", "w-32", "w-44", "w-36", "w-28", "w-40"];

/** ClubLogo: isti okvir 48×32, kost u sredini */
export function ClubLogoSkeleton({ className }: { className?: string }) {
  return (
    <span aria-hidden className={cx("inline-flex h-8 w-12 shrink-0 items-center justify-center", className)}>
      <Bone className="size-7 rounded-md" />
    </span>
  );
}

/** TeamName: logo i naziv u redu visine logoa; `className` nosi tipografiju naziva, `logo` okvir logoa */
export function TeamNameSkeleton({ w = "w-32", className, logo }: { w?: string; className?: string; logo?: string }) {
  return (
    <span className={cx("flex min-w-0 items-center gap-2", className)}>
      <ClubLogoSkeleton className={logo} />
      <Text className="min-w-0" w={w} />
    </span>
  );
}

/**
 * Kao MatchLine: datum lijevo, takmičenje, dvije ekipe (+ rezultat), dvorana.
 * `meta` = red ispod (npr. pozicija), `aside` = desno (npr. stanje delegiranja).
 */
export function MatchLineSkeleton({
  i = 0,
  score,
  meta,
  aside,
  label = true,
  hall = true,
}: {
  i?: number;
  score?: boolean;
  meta?: React.ReactNode;
  aside?: React.ReactNode;
  /** Red s takmičenjem i kolom (nema ga kad je to već u naslovu sekcije) */
  label?: boolean;
  hall?: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-2 sm:gap-x-4">
      <DateTileSkeleton />
      <div className="min-w-0 flex-1 basis-40">
        {label && <Text className="text-[12px] font-semibold" w="w-32" />}
        <div className={cx("mt-1 grid items-center gap-x-3 gap-y-1", score ? "grid-cols-[1fr_auto]" : "grid-cols-1")}>
          <TeamNameSkeleton className="text-[17px] font-semibold leading-snug" w={TEAM_W[i % TEAM_W.length]} />
          {score && <Text className="scoreboard text-[22px] font-semibold leading-tight" w="w-8" />}
          <TeamNameSkeleton className="text-[17px] font-semibold leading-snug" w={TEAM_W[(i + 3) % TEAM_W.length]} />
          {score && <Text className="scoreboard text-[22px] font-semibold leading-tight" w="w-8" />}
        </div>
        {hall && (
          <div className="mt-1 flex items-center gap-1 text-[13px]">
            <Bone className="size-3.5 shrink-0 rounded-full" />
            <Text className="text-[13px]" w="w-28" />
          </div>
        )}
        {meta && <div className="mt-2 text-[14px]">{meta}</div>}
      </div>
      {aside && <div className="ml-auto shrink-0 self-center">{aside}</div>}
    </div>
  );
}

/** Lista utakmica u kartici (Rows), red po utakmici */
export function MatchRowsSkeleton({
  count = 3,
  row = "py-4",
  ...line
}: {
  count?: number;
  /** Razmak reda, isti kao u pravoj listi */
  row?: string;
} & Omit<Parameters<typeof MatchLineSkeleton>[0], "i">) {
  return (
    <ul className={ROWS}>
      {times(count, (i) => (
        <li key={i} className={cx("flex items-center", row)}>
          <MatchLineSkeleton i={i} {...line} />
        </li>
      ))}
    </ul>
  );
}

// ───────── Tabela takmičenja ─────────

/** Kao StandingsTable: zaglavlje i redovi istih visina i kolona */
export function StandingsSkeleton({ rows = 8 }: { rows?: number }) {
  const num = "w-9 py-3 pr-1.5 sm:w-12";
  return (
    <div className={cx(CARD, "overflow-hidden")}>
      <table className="w-full">
        <thead>
          <tr className="border-b border-line bg-panel-2 text-left text-[12px] font-semibold text-fg-muted">
            <th className="w-12 py-3 pl-4 font-semibold sm:pl-5">#</th>
            <th className="py-3 pr-2 font-semibold">Ekipa</th>
            <th className={cx(num, "text-right font-semibold")}>U</th>
            <th className={cx(num, "text-right font-semibold")}>P</th>
            <th className="hidden w-12 py-3 pr-2 text-right font-semibold sm:table-cell">I</th>
            <th className="hidden w-16 py-3 pr-2 text-right font-semibold md:table-cell">K+</th>
            <th className="hidden w-16 py-3 pr-2 text-right font-semibold md:table-cell">K−</th>
            <th className="w-12 py-3 pr-1.5 text-right font-semibold sm:w-16">+/−</th>
            <th className="w-12 py-3 pr-4 text-right font-semibold sm:w-16 sm:pr-5">B</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {times(rows, (i) => (
            <tr key={i}>
              <td className="py-3 pl-4 pr-2 sm:pl-5">
                <Text className="scoreboard text-[20px] font-semibold" w="w-4" />
              </td>
              <td className="max-w-0 py-3 pr-2 font-display text-[18px] font-semibold sm:text-[20px]">
                <TeamNameSkeleton w={TEAM_W[i % TEAM_W.length]} logo="max-sm:w-8" />
              </td>
              <NumCell />
              <NumCell />
              <NumCell className="hidden sm:table-cell" />
              <NumCell className="hidden md:table-cell" w="w-8" />
              <NumCell className="hidden md:table-cell" w="w-8" />
              <NumCell w="w-7" />
              <NumCell className="pr-4 sm:pr-5" text="text-[22px]" />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function NumCell({ className, w = "w-5", text = "text-[18px]" }: { className?: string; w?: string; text?: string }) {
  return (
    <td className={cx("px-1.5 py-3 text-right sm:px-2", className)}>
      <Text className={cx("scoreboard font-semibold", text)} w={w} />
    </td>
  );
}

// ───────── Naknade (PeriodPicker, PayrollSummary, PayrollItems) ─────────

export function PeriodPickerSkeleton() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="inline-flex items-center gap-1">
        <span className="grid size-10 place-items-center">
          <Bone className="size-5" />
        </span>
        <span className="flex min-w-36 justify-center">
          <Text className="font-display text-[20px] font-semibold" w="w-28" />
        </span>
        <span className="grid size-10 place-items-center">
          <Bone className="size-5" />
        </span>
      </div>
      <SegmentsSkeleton widths={["w-14", "w-8"]} className="sm:ml-2" />
    </div>
  );
}

/** `aside` = dugmad desno od napomene (npr. CSV, Označi isplaćeno) */
export function PayrollSummarySkeleton({ aside = true }: { aside?: boolean }) {
  return (
    <div className={cx(CARD, "px-4 sm:px-6")}>
      <dl className="grid grid-cols-1 gap-x-6 gap-y-5 py-5 sm:grid-cols-3 sm:py-6">
        {["Zarađeno", "Isplaćeno", "Duguje se"].map((label) => (
          <div key={label} className="min-w-0">
            <div className="mb-3 flex items-center gap-2 text-[13px] font-medium text-fg-muted"><Bone className="size-4 shrink-0" />{label}</div>
            <Text className="scoreboard mt-1 text-[26px] font-semibold leading-none sm:text-[30px]" w="w-32" />
          </div>
        ))}
      </dl>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line py-4">
        <Text className="text-[13px]" w="w-56" />
        {aside && <ButtonSkeleton className="w-36" />}
      </div>
    </div>
  );
}

/** Stavke osobe (datum, utakmica, iznos, isplata) */
export function PayrollItemsSkeleton({ count = 5 }: { count?: number }) {
  return (
    <ul className="divide-y divide-line">
      {times(count, (i) => (
        <li key={i} className="flex items-center gap-3 py-3 text-[14px]">
          <Text className="scoreboard w-12 shrink-0 text-[17px] font-semibold" w="w-10" />
          <span className="min-w-0 flex-1">
            <span className="flex min-w-0 flex-col gap-1 font-semibold">
              <TeamNameSkeleton w={TEAM_W[i % TEAM_W.length]} />
              <TeamNameSkeleton w={TEAM_W[(i + 3) % TEAM_W.length]} />
            </span>
            <Text className="text-[13px]" w="w-60" />
          </span>
          <span className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-4">
            <Text className="scoreboard text-[17px] font-semibold" w="w-16" />
            <Bone className="h-6 w-24" />
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Filteri naknada: grupe, isplata, pretraga */
export function PayrollFiltersSkeleton({ groups = true }: { groups?: boolean }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        {groups && <SegmentsSkeleton widths={["w-7", "w-12", "w-28", "w-16"]} />}
        <SegmentsSkeleton widths={["w-7", "w-24", "w-16"]} />
      </div>
      <span aria-hidden className="block h-11 max-w-md rounded-lg border border-line-strong bg-panel sm:h-10" />
    </div>
  );
}

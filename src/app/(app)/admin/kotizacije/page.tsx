import { TeamName } from "@/components/team-name";
import { Suspense } from "react";
import { ChevronDown, Receipt, CheckCircle2, Clock, CircleAlert, Users } from "lucide-react";
import { getFeeOverview } from "@/lib/data/finance";
import { FEE_STATE_LABEL, formatAmount, formatKM, round2, type FeeState } from "@/lib/finance";
import { formatDate } from "@/lib/format";
import { ConfirmButton } from "@/components/confirm-button";
import { Bone, SectionTitleSkeleton, Skeleton, StatusSkeleton, Text, times } from "@/components/skeleton";
import { Empty, PageHeader, Rows, ROWS, SectionTitle, Stat, Status } from "@/components/ui";
import { deletePayment } from "./actions";
import { PaymentForm } from "./payment-form";

export const metadata = { title: "Kotizacije — KSKS" };

const STATE_TONE: Record<FeeState, "mint" | "orange" | "gold" | "muted"> = {
  none: "muted",
  paid: "mint",
  late: "orange",
  partial: "gold",
  unpaid: "muted",
};

export default function FeesPage() {
  return (
    <>
      <PageHeader icon={<Receipt />} title="Kotizacije" subtitle="Uplate ekipa po takmičenju i rokovi za prvi dio." />
      <Suspense fallback={<FeesSkeleton />}>
        <Fees />
      </Suspense>
    </>
  );
}

async function Fees() {
  const { today, competitions, clubs } = await getFeeOverview();
  if (competitions.length === 0) return <Empty icon={<Receipt />}>Nema takmičenja u tekućoj sezoni.</Empty>;

  const totalDue = round2(clubs.reduce((s, c) => s + c.due, 0));
  const totalPaid = round2(clubs.reduce((s, c) => s + c.paid, 0));
  const late = competitions.reduce((n, c) => n + c.teams.filter((t) => t.state === "late").length, 0);

  return (
    <div className="flex flex-col gap-12">
      <dl className="grid grid-cols-2 gap-x-6 gap-y-6 rounded-lg border border-line bg-panel shadow-panel px-4 sm:px-5 py-6 sm:grid-cols-4">
        <Stat icon={<Receipt />} label="Ukupno kotizacija" value={formatAmount(totalDue)} unit="KM" />
        <Stat icon={<CheckCircle2 />} label="Uplaćeno" value={formatAmount(totalPaid)} unit="KM" tone="mint" />
        <Stat icon={<Clock />} label="Preostalo" value={formatAmount(Math.max(round2(totalDue - totalPaid), 0))} unit="KM" tone="gold" />
        <Stat icon={<CircleAlert />} label="Ekipa kasni" value={late} tone={late > 0 ? "orange" : undefined} />
      </dl>

      {competitions.map((c) => (
        <section key={c.id}>
          <SectionTitle>{c.name}</SectionTitle>
          <p className="-mt-1 flex flex-wrap gap-x-4 gap-y-1 pb-4 text-[14px] text-fg-muted">
            {c.fee == null ? (
              <span>Kotizacija nije određena</span>
            ) : (
              <>
                <span>
                  Kotizacija <span className="scoreboard whitespace-nowrap text-[16px] font-semibold text-fg">{formatKM(c.fee)}</span>
                </span>
                {c.firstPart != null && (
                  <span>
                    Prvi dio <span className="scoreboard whitespace-nowrap text-[16px] font-semibold text-fg">{formatKM(c.firstPart)}</span>
                  </span>
                )}
                {c.dueOn && <span>Rok {formatDate(c.dueOn)}</span>}
              </>
            )}
          </p>
          {c.teams.length === 0 ? (
            <Empty icon={<Receipt />}>Takmičenje nema ekipa.</Empty>
          ) : (
            <Rows>
              {c.teams.map((t) => (
                <li key={t.id}>
                  <details className="group">
                    <summary className="-mx-4 flex cursor-pointer list-none items-center gap-3 px-4 py-4 transition-colors hover:bg-panel-2 sm:-mx-6 sm:px-6 [&::-webkit-details-marker]:hidden">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-display text-[19px] font-semibold leading-tight"><TeamName name={t.name} logoUrl={t.club?.logo_url} /></span>
                        <span className="mt-1 block">
                          <Status tone={STATE_TONE[t.state]}>{FEE_STATE_LABEL[t.state]}</Status>
                        </span>
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="scoreboard whitespace-nowrap block text-[22px] font-semibold leading-none">{formatKM(t.paid)}</span>
                        {t.state !== "paid" && t.state !== "none" && (
                          <span className="mt-1 block text-[12px] text-fg-faint">
                            još <span className="scoreboard whitespace-nowrap text-[14px] font-semibold text-fg-muted">{formatKM(t.remaining)}</span>
                          </span>
                        )}
                      </span>
                      <ChevronDown className="size-5 shrink-0 text-fg-faint transition-transform group-open:rotate-180" />
                    </summary>
                    <div className="flex flex-col gap-4 border-t border-line py-4 pl-4">
                      {t.payments.length > 0 ? (
                        <ul className="divide-y divide-line">
                          {t.payments.map((p) => (
                            <li key={p.id} className="flex items-center gap-3 py-2.5">
                              <span className="min-w-0 flex-1">
                                <span className="scoreboard whitespace-nowrap block text-[18px] font-semibold">{formatKM(p.amount_km)}</span>
                                <span className="block truncate text-[13px] text-fg-muted">
                                  {formatDate(p.paid_on)}
                                  {p.note && `, ${p.note}`}
                                </span>
                              </span>
                              <form action={deletePayment}>
                                <input type="hidden" name="id" value={p.id} />
                                <ConfirmButton title={`Obrisati uplatu od ${formatKM(p.amount_km)}?`} confirmLabel="Obriši">
                                  <span className="text-[14px] font-semibold">Obriši</span>
                                </ConfirmButton>
                              </form>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-[14px] text-fg-muted">Još nema uplata.</p>
                      )}
                      <PaymentForm teamId={t.id} today={today} suggested={t.remaining} />
                    </div>
                  </details>
                </li>
              ))}
            </Rows>
          )}
        </section>
      ))}

      <section>
        <SectionTitle icon={<Users />}>Po klubovima</SectionTitle>
        <Rows>
          {clubs.map((c) => {
            const left = Math.max(round2(c.due - c.paid), 0);
            return (
              <li key={c.id} className="flex items-center gap-3 py-4">
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-display text-[19px] font-semibold leading-tight"><TeamName name={c.name} logoUrl={c.logo_url} /></span>
                  <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-fg-muted">
                    <span>
                      Uplaćeno <span className="scoreboard whitespace-nowrap text-[15px] font-semibold text-fg">{formatKM(c.paid)}</span> od{" "}
                      <span className="scoreboard whitespace-nowrap text-[15px] font-semibold text-fg">{formatKM(c.due)}</span>
                    </span>
                    {c.late > 0 && <Status tone="orange">Kasni {c.late}</Status>}
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span className={`scoreboard whitespace-nowrap block text-[22px] font-semibold leading-none ${left > 0 ? "text-brand" : "text-mint"}`}>
                    {formatKM(left)}
                  </span>
                  <span className="mt-1 block text-[12px] text-fg-faint">preostalo</span>
                </span>
              </li>
            );
          })}
        </Rows>
      </section>
    </div>
  );
}

/** Kao kotizacije: zbir, pa takmičenja s ekipama (stanje, uplaćeno, preostalo) */
function FeesSkeleton() {
  return (
    <Skeleton className="flex flex-col gap-12">
      <div className="grid grid-cols-2 gap-x-6 gap-y-6 rounded-lg border border-line bg-panel px-4 py-6 shadow-panel sm:grid-cols-4 sm:px-5">
        <StatLabelSkeleton icon={<Receipt />} label="Ukupno kotizacija" w="w-28" />
        <StatLabelSkeleton icon={<CheckCircle2 />} label="Uplaćeno" w="w-28" />
        <StatLabelSkeleton icon={<Clock />} label="Preostalo" w="w-28" />
        <StatLabelSkeleton icon={<CircleAlert />} label="Ekipa kasni" w="w-8" />
      </div>
      {times(2, (c) => (
        <section key={c}>
          <SectionTitleSkeleton w="w-48" />
          <div className="-mt-1 flex flex-wrap gap-x-4 gap-y-1 pb-4">
            <Text className="text-[16px]" w="w-36" />
            <Text className="text-[16px]" w="w-28" />
            <Text className="text-[16px]" w="w-20" />
          </div>
          <ul className={ROWS}>
            {times(4, (i) => (
              <li key={i} className="flex items-center gap-3 py-4">
                <span className="min-w-0 flex-1">
                  <TeamSkeleton w={i % 2 ? "w-36" : "w-48"} />
                  <span className="mt-1 block">
                    <StatusSkeleton w="w-20" />
                  </span>
                </span>
                <span className="flex shrink-0 flex-col items-end">
                  <Text className="scoreboard text-[22px] font-semibold leading-none" w="w-24" />
                  <Text className="mt-1 text-[14px]" w="w-20" />
                </span>
                <Bone className="size-5 shrink-0" />
              </li>
            ))}
          </ul>
        </section>
      ))}
      <section>
        <SectionTitle icon={<Users />}>Po klubovima</SectionTitle>
        <ul className={ROWS}>
          {times(6, (i) => (
            <li key={i} className="flex items-center gap-3 py-4">
              <span className="min-w-0 flex-1">
                <TeamSkeleton w={i % 2 ? "w-32" : "w-44"} />
                <Text className="mt-1 text-[15px]" w="w-48" />
              </span>
              <span className="flex shrink-0 flex-col items-end">
                <Text className="scoreboard text-[22px] font-semibold leading-none" w="w-24" />
                <span className="mt-1 block text-[12px] text-fg-faint">preostalo</span>
              </span>
            </li>
          ))}
        </ul>
      </section>
    </Skeleton>
  );
}

/** Stat s pravim opisom (ikona i tekst), broj kao kost */
function StatLabelSkeleton({ icon, label, w }: { icon: React.ReactNode; label: string; w: string }) {
  return (
    <div className="min-w-0">
      <div className="mb-3 flex items-center gap-2 text-[13px] font-medium text-fg-muted">
        <span aria-hidden="true" className="shrink-0 [&>svg]:size-4 [&>svg]:stroke-[1.7]">{icon}</span>
        {label}
      </div>
      <Text className="scoreboard text-[28px] font-semibold leading-none sm:text-[32px]" w={w} />
    </div>
  );
}

/** Kao TeamName u redu: grb i naziv */
function TeamSkeleton({ w }: { w: string }) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      <Bone className="h-8 w-12 shrink-0" />
      <Text className="min-w-0 font-display text-[19px] font-semibold leading-tight" w={w} />
    </span>
  );
}

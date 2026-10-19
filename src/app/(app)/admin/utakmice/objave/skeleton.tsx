import type { ReactNode } from "react";
import { Bone, ButtonSkeleton, FieldSkeleton, Skeleton, Text, times } from "@/components/skeleton";
import { CARD, cx } from "@/components/ui";

export function SocialPreviewSkeleton({ width = 1080, height = 1350, rows = 7 }: { width?: number; height?: number; rows?: number }) {
  return (
    <div role="status" aria-label="Pripremam pregled objave" className="relative w-full overflow-hidden rounded-sm bg-panel shadow-panel" style={{ aspectRatio: `${width} / ${height}`, maxWidth: `calc(66vh * ${width / height})` }}>
      <div aria-hidden="true" className="absolute inset-0 flex flex-col gap-[2%] p-[5%]">
        <div className="flex h-[9%] shrink-0 items-center gap-3">
          <Bone className="aspect-square h-full rounded-lg" />
          <div className="flex flex-1 flex-col gap-1.5"><Bone className="h-3 w-1/4" /><Bone className="h-1.5 w-1/2" /><Bone className="h-1.5 w-2/5" /></div>
        </div>
        <Bone className="mb-[2%] h-[5%] w-4/5 shrink-0" />
        <div className={cx("grid min-h-0 flex-1 gap-[2%]", width > height && rows > 3 && "grid-cols-2")}>
          {times(Math.max(1, rows), (i) => <div key={i} className="flex min-h-0 items-center gap-[3%] rounded-lg border border-line bg-panel-2 px-[3%] py-[2%]">
            <Bone className="aspect-square h-[85%] max-h-16 shrink-0 rounded-lg" />
            <div className="flex min-w-0 flex-1 flex-col gap-1.5"><Bone className="h-1.5 w-full" /><Bone className="h-1.5 w-3/4" /></div>
            <div className="flex w-1/5 shrink-0 flex-col items-center gap-1.5"><Bone className="h-2 w-4/5" /><Bone className="h-1 w-full" /></div>
            <div className="flex min-w-0 flex-1 flex-col items-end gap-1.5"><Bone className="h-1.5 w-full" /><Bone className="h-1.5 w-3/4" /></div>
            <Bone className="aspect-square h-[85%] max-h-16 shrink-0 rounded-lg" />
          </div>)}
        </div>
        <div className="flex h-[4%] shrink-0 items-end justify-between border-t border-line pt-[2%]"><Bone className="h-1.5 w-1/2" /><Bone className="h-1.5 w-6" /></div>
      </div>
      <span className="sr-only">Pripremam sliku…</span>
    </div>
  );
}

export function SocialBuilderSkeleton() {
  return (
    <Skeleton className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(340px,440px)] lg:gap-8">
      <div className="flex min-w-0 flex-col gap-6">
        <StepSkeleton number={1} title="Izaberi utakmice">
          <div className="grid gap-3 sm:grid-cols-2">{["Takmičenje", "Kolo", "Od datuma", "Do datuma"].map((label) => <FieldSkeleton key={label} label={label} />)}</div>
          <FieldSkeleton label="Pretraži utakmice" />
          <div className="flex gap-4"><Text className="text-[13px]" w="w-28" /><Text className="text-[13px]" w="w-24" /></div>
          <div className="flex justify-between border-t border-line pt-3"><Text className="text-[13px]" w="w-40" /><Text className="text-[13px]" w="w-20" /></div>
          <div className="max-h-[420px] overflow-hidden rounded-lg border border-line">
            {times(5, (i) => <div key={i} className="flex gap-3 border-b border-line p-3 last:border-b-0"><Bone className="mt-1 size-4 shrink-0" /><div className="min-w-0 flex-1"><Text className="text-[11px]" w="w-24" /><Text className="mt-0.5 text-[14px] font-semibold" w={i % 2 ? "w-52" : "w-64"} /><Text className="mt-1 text-[12px]" w="w-44" /></div></div>)}
          </div>
          <Text className="text-[12px]" w="w-72" />
        </StepSkeleton>
        <StepSkeleton number={2} title="Predložak i format">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{times(8, (i) => <div key={i} className="rounded-lg border border-line p-2"><div className="mb-2 flex aspect-[4/5] flex-col gap-2 rounded-md bg-panel-2 p-3"><Bone className="size-5" /><Bone className="h-3 w-3/4" /><Bone className="flex-1" /><Bone className="flex-1" /></div><Text className="text-[12px]" w="w-20" /></div>)}</div>
          <div className="grid grid-cols-2 gap-2">{times(4, (i) => <div key={i} className="rounded-lg border border-line p-3"><Text className="text-[13px]" w="w-24" /><Text className="mt-1 text-[11px]" w="w-20" /><Text className="text-[11px]" w="w-24" /></div>)}</div>
          <FieldSkeleton label="Utakmica po slici" hint />
        </StepSkeleton>
        <StepSkeleton number={3} title="Tekst i detalji">
          {["Naslov", "Podnaslov", "Tekst u dnu slike"].map((label) => <FieldSkeleton key={label} label={label} />)}
          <div className="flex flex-wrap gap-5">{times(3, (i) => <div key={i} className="flex items-center gap-2"><Bone className="size-4" /><Text className="text-[13px]" w="w-20" /></div>)}</div>
          <Text className="text-[12px]" w="w-64" />
        </StepSkeleton>
      </div>
      <div className={cx(CARD, "flex min-w-0 flex-col gap-4 p-4 lg:sticky lg:top-6")}>
        <div className="flex items-center justify-between gap-3"><h2 className="text-[18px] font-semibold tracking-tight">Pregled objave</h2><Text className="text-[12px]" w="w-24" /></div>
        <div className="grid min-h-52 place-items-center overflow-hidden rounded-lg border border-line bg-panel-2 p-2"><SocialPreviewSkeleton /></div>
        <div className="flex items-center justify-between"><ButtonSkeleton className="w-10" /><Text className="text-[13px]" w="w-24" /><ButtonSkeleton className="w-10" /></div>
        <ButtonSkeleton className="w-full" />
        <Text className="mx-auto text-[12px]" w="w-64" />
      </div>
    </Skeleton>
  );
}

function StepSkeleton({ number, title, children }: { number: number; title: string; children: ReactNode }) {
  return <div className={cx(CARD, "flex flex-col gap-4 p-4 sm:p-5")}><div className="flex items-center justify-between gap-2"><h2 className="flex items-center gap-2.5 text-[17px] font-semibold"><span className="grid size-7 place-items-center rounded-full bg-panel-2 text-[12px] text-fg-muted">{number}</span>{title}</h2><Text className="text-[12px]" w="w-16" /></div>{children}</div>;
}

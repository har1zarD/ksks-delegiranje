import { Suspense } from "react";
import { ScrollText } from "lucide-react";
import { getBulletinData } from "@/lib/data/admin";
import { Bone, Skeleton, Text, times } from "@/components/skeleton";
import { CARD, cx, Empty, PageHeader } from "@/components/ui";
import { BulletinBuilder } from "./builder";

export const metadata = { title: "Bilteni — KSKS" };

export default function BulletinsPage() {
  return (
    <>
      <PageHeader
        icon={<ScrollText />}
        title="Bilteni"
        subtitle="Jedan PDF: registracija odigranih utakmica s primjedbama komesara, odluke, tabela i nominacija narednog kola. Izaberi kolo, označi utakmice i šta ide u bilten."
      />
      <Suspense fallback={<BuilderSkeleton />}>
        <Builder />
      </Suspense>
    </>
  );
}

async function Builder() {
  const data = await getBulletinData();
  if (data.competitions.length === 0) return <Empty icon={<ScrollText />}>Nema utakmica s kolom u ovoj sezoni. Raspored kola se pravi u Takmičenjima.</Empty>;
  return <BulletinBuilder {...data} />;
}

/** Kao bilder biltena: koraci lijevo, pregled PDF-a desno */
function BuilderSkeleton() {
  return (
    <Skeleton className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-8">
      <div className="flex flex-col gap-6">
        {times(3, (i) => (
          <div key={i} className={cx(CARD, "flex flex-col gap-4 p-4 sm:p-5")}>
            <Text className="font-display text-[18px] font-semibold" w="w-44" />
            <div className="flex flex-wrap gap-2">
              {times(4, (j) => (
                <Bone key={j} className="h-9 w-24 rounded-full" />
              ))}
            </div>
            <Bone className="h-12 w-full" />
          </div>
        ))}
      </div>
      <div className={cx(CARD, "flex flex-col gap-4 p-4")}>
        <Text className="font-display text-[18px] font-semibold" w="w-24" />
        <Bone className="hidden aspect-[210/297] w-full lg:block" />
        <div className="grid grid-cols-2 gap-2">
          <Bone className="h-10" />
          <Bone className="h-10" />
        </div>
      </div>
    </Skeleton>
  );
}

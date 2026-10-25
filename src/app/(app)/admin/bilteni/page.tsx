import { Suspense } from "react";
import { Plus, ScrollText } from "lucide-react";
import { getBulletinData, getSavedBulletin, getSavedBulletins } from "@/lib/data/admin";
import { nextBulletinNumber } from "@/lib/bulletin";
import { Bone, Skeleton, Text, times } from "@/components/skeleton";
import { ButtonLink, CARD, cx, Empty, PageHeader } from "@/components/ui";
import { BulletinBuilder } from "./builder";
import { SavedBulletins } from "./saved-list";

export const metadata = { title: "Bilteni — KSKS" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

// Jedna stranica (bez novih ruta, Hobby limit funkcija): bez ?b lista sačuvanih biltena, ?b=novi novi bilten,
// ?b=<id> otvara sačuvan bilten za prepravku
export default function BulletinsPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={<BuilderSkeleton />}>
      <Bulletins searchParams={searchParams} />
    </Suspense>
  );
}

const param = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);

async function Bulletins({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const b = param(sp.b);
  const [data, saved] = await Promise.all([getBulletinData(), getSavedBulletins()]);
  const header = (
    <PageHeader
      icon={<ScrollText />}
      title="Bilteni"
      subtitle="Registracija odigranih utakmica s primjedbama komesara, tabela, odluke i nominacija narednog kola. Bilten se čuva i može se kasnije otvoriti i prepraviti."
    >
      {!b && (
        <ButtonLink href="/admin/bilteni?b=novi">
          <Plus className="size-4" aria-hidden="true" /> Novi bilten
        </ButtonLink>
      )}
    </PageHeader>
  );

  if (!b) {
    return (
      <>
        {header}
        <SavedBulletins bulletins={saved} competitions={data.competitions} />
      </>
    );
  }
  if (data.competitions.length === 0) {
    return (
      <>
        {header}
        <Empty icon={<ScrollText />}>Nema utakmica s kolom u ovoj sezoni. Raspored kola se pravi u Takmičenjima.</Empty>
      </>
    );
  }

  if (b === "novi") {
    // Novi bilten: predloženi broj = zadnji bilten zadnje odigranog takmičenja + 1
    const ids = data.suggested ? [data.suggested.competitionId] : data.competitions.slice(0, 1).map((c) => c.id);
    const number = nextBulletinNumber(saved, ids);
    return (
      <>
        {header}
        <BulletinBuilder key="novi" {...data} initial={{ id: null, draft: null, updatedAt: null, number }} />
      </>
    );
  }

  const bulletin = await getSavedBulletin(b);
  if (!bulletin) {
    return (
      <>
        {header}
        <Empty icon={<ScrollText />} title="Bilten ne postoji" action={<ButtonLink href="/admin/bilteni">Svi bilteni</ButtonLink>}>
          Možda je obrisan.
        </Empty>
      </>
    );
  }
  return (
    <>
      {header}
      <BulletinBuilder key={bulletin.id} {...data} initial={{ ...bulletin, number: bulletin.draft.number }} />
    </>
  );
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

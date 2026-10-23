import Link from "next/link";
import { Suspense } from "react";
import { ChevronLeft, Images } from "lucide-react";
import { getSocialSchedules } from "@/lib/data/social";
import { Empty, PageHeader } from "@/components/ui";
import { A1_ZENE_FIXTURES, A1_ZENE_ID } from "@/lib/a1-zene-raspored";
import { A2_JUG_FIXTURES, A2_JUG_ID } from "@/lib/a2-jug-raspored";
import { SocialBuilder } from "./builder";
import { SocialBuilderSkeleton } from "./skeleton";

export const metadata = { title: "Slike za objavu — KSKS" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default function SocialPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <>
      <Link href="/admin" className="-my-2.5 inline-flex items-center gap-1 py-2.5 text-[15px] font-semibold text-brand hover:opacity-75">
        <ChevronLeft className="size-4" aria-hidden="true" /> Pregled
      </Link>
      <div className="pt-4">
        <PageHeader icon={<Images />} title="Slike za objavu" subtitle="Termini i satnice za Facebook i Instagram. Izaberi utakmice, prilagodi predložak i preuzmi sliku." />
      </div>
      <Suspense fallback={<SocialBuilderSkeleton />}>
        <Builder searchParams={searchParams} />
      </Suspense>
    </>
  );
}

// Utakmica A2 juga ili A1 žena napravljena bez kola (npr. ručno) dobija kolo iz rasporeda saveza, da je filter kola nađe
const FIXTURE_ROUND = new Map<string, number>([
  ...A2_JUG_FIXTURES.map((f) => [`${A2_JUG_ID}|${f.home}|${f.away}`, f.round] as const),
  ...A1_ZENE_FIXTURES.map((f) => [`${A1_ZENE_ID}|${f.home}|${f.away}`, f.round] as const),
]);

async function Builder({ searchParams }: { searchParams: SearchParams }) {
  const [data, { takmicenje }] = await Promise.all([getSocialSchedules(), searchParams]);
  if (!data.matches.length) return <Empty icon={<Images />} title="Nema utakmica za objavu">Ovdje se nude buduće zakazane i odgođene utakmice tekuće sezone, uključujući utakmice bez kola.</Empty>;
  const matches = data.matches.map((m) => ({ ...m, round: m.round ?? FIXTURE_ROUND.get(`${m.competitionId}|${m.home}|${m.away}`) ?? null }));
  return <SocialBuilder {...data} matches={matches} competition={typeof takmicenje === "string" ? takmicenje : undefined} />;
}

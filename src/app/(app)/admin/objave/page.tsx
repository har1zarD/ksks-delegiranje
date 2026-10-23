import { Suspense } from "react";
import { Oswald } from "next/font/google";
import { Images } from "lucide-react";
import { getSocialSchedules } from "@/lib/data/social";
import { getSocialTables } from "@/lib/data/results";
import { PageHeader } from "@/components/ui";
import { A1_ZENE_FIXTURES, A1_ZENE_ID } from "@/lib/a1-zene-raspored";
import { A2_JUG_FIXTURES, A2_JUG_ID } from "@/lib/a2-jug-raspored";
import { SOCIAL_KINDS, SocialStudio } from "./builder";
import { SocialBuilderSkeleton } from "./skeleton";

export const metadata = { title: "Slike za objavu — KSKS" };

// Uski sportski font za naslove, imena ekipa i brojeve na slikama
const poster = Oswald({ subsets: ["latin", "latin-ext"], weight: ["500", "600", "700"] });

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default function SocialPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <>
      <PageHeader icon={<Images />} title="Slike za objavu" subtitle="Raspored, tabela i klubovi za Facebook i Instagram. Prozirni PNG za tvoj dizajn ili gotova slika s pozadinom." />
      <Suspense fallback={<SocialBuilderSkeleton />}>
        <Studio searchParams={searchParams} />
      </Suspense>
    </>
  );
}

// Utakmica A2 juga ili A1 žena napravljena bez kola (npr. ručno) dobija kolo iz rasporeda saveza, da je filter kola nađe
const FIXTURE_ROUND = new Map<string, number>([
  ...A2_JUG_FIXTURES.map((f) => [`${A2_JUG_ID}|${f.home}|${f.away}`, f.round] as const),
  ...A1_ZENE_FIXTURES.map((f) => [`${A1_ZENE_ID}|${f.home}|${f.away}`, f.round] as const),
]);

async function Studio({ searchParams }: { searchParams: SearchParams }) {
  const [data, tables, { takmicenje, vrsta }] = await Promise.all([getSocialSchedules(), getSocialTables(), searchParams]);
  const matches = data.matches.map((m) => ({ ...m, round: m.round ?? FIXTURE_ROUND.get(`${m.competitionId}|${m.home}|${m.away}`) ?? null }));
  const kind = SOCIAL_KINDS.find((k) => k.param === vrsta)?.id ?? "schedule";
  return <SocialStudio {...data} matches={matches} tables={tables} kind={kind} competition={typeof takmicenje === "string" ? takmicenje : undefined} font={poster.style.fontFamily} />;
}

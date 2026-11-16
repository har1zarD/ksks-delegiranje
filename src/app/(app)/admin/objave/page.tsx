import { Suspense } from "react";
import { Oswald } from "next/font/google";
import { Images } from "lucide-react";
import { getSocialResults, getSocialRound, getSocialSchedules, type SocialMatch } from "@/lib/data/social";
import { getSocialTables } from "@/lib/data/results";
import { getSavedSocialSchedule, getSavedSocialSchedules } from "@/lib/data/admin";
import { PageHeader } from "@/components/ui";
import { A1_ZENE_FIXTURES, A1_ZENE_ID } from "@/lib/a1-zene-raspored";
import { A2_JUG_FIXTURES, A2_JUG_ID, type Fixture } from "@/lib/a2-jug-raspored";
import { MINIBASKET_FIXTURES, MINIBASKET_ID } from "@/lib/minibasket-raspored";
import { KADETI_G2_FIXTURES, KADETI_G2_ID } from "@/lib/kadeti-g2-raspored";
import { JUNIORI_FIXTURES, JUNIORI_ID } from "@/lib/juniori-raspored";
import { UNOBASKET_FIXTURES, UNOBASKET_ID } from "@/lib/unobasket-raspored";
import { SocialStudio } from "./builder";
import { SOCIAL_KINDS } from "./kinds";
import { SocialBuilderSkeleton } from "./skeleton";

export const metadata = { title: "Slike za objavu — KSKS" };

// Uski sportski font za naslove, imena ekipa i brojeve na slikama
const poster = Oswald({ subsets: ["latin", "latin-ext"], weight: ["500", "600", "700"] });

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default function SocialPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <>
      <PageHeader icon={<Images />} title="Slike za objavu" subtitle="Raspored, rezultati, kolo, tabela i klubovi za Facebook i Instagram." />
      <Suspense fallback={<SocialBuilderSkeleton />}>
        <Studio searchParams={searchParams} />
      </Suspense>
    </>
  );
}

// Utakmica napravljena bez kola (npr. ručno) dobija kolo iz rasporeda saveza, da je filter kola nađe
const FIXTURE_ROUND = new Map<string, number>([
  ...A2_JUG_FIXTURES.map((f) => [`${A2_JUG_ID}|${f.home}|${f.away}`, f.round] as const),
  ...A1_ZENE_FIXTURES.map((f) => [`${A1_ZENE_ID}|${f.home}|${f.away}`, f.round] as const),
  ...MINIBASKET_FIXTURES.map((f) => [`${MINIBASKET_ID}|${f.home}|${f.away}`, f.round] as const),
  ...KADETI_G2_FIXTURES.map((f) => [`${KADETI_G2_ID}|${f.home}|${f.away}`, f.round] as const),
  ...JUNIORI_FIXTURES.map((f) => [`${JUNIORI_ID}|${f.home}|${f.away}`, f.round] as const),
  ...UNOBASKET_FIXTURES.map((f) => [`${UNOBASKET_ID}|${f.home}|${f.away}`, f.round] as const),
]);

// Zvanični raspored saveza po takmičenju, za prijedlog cijelog kola na slici rasporeda (admin ih uređuje prije slike)
const FIXTURES_BY_COMPETITION: Record<string, Fixture[]> = {
  [A1_ZENE_ID]: A1_ZENE_FIXTURES,
  [A2_JUG_ID]: A2_JUG_FIXTURES,
  [MINIBASKET_ID]: MINIBASKET_FIXTURES,
  [KADETI_G2_ID]: KADETI_G2_FIXTURES,
  [JUNIORI_ID]: JUNIORI_FIXTURES,
  [UNOBASKET_ID]: UNOBASKET_FIXTURES,
};

async function Studio({ searchParams }: { searchParams: SearchParams }) {
  const [data, results, round, tables, saved, { takmicenje, vrsta, r }] = await Promise.all([
    getSocialSchedules(), getSocialResults(), getSocialRound(), getSocialTables(), getSavedSocialSchedules(), searchParams,
  ]);
  const withRound = (list: SocialMatch[]) => list.map((m) => ({ ...m, round: m.round ?? FIXTURE_ROUND.get(`${m.competitionId}|${m.home}|${m.away}`) ?? null }));
  const kind = SOCIAL_KINDS.find((k) => k.param === vrsta)?.id ?? "schedule";
  // Parovi koji već postoje kao prava utakmica (bilo kog statusa osim otkazane): izostavljaju se iz prijedloga rasporeda
  const knownPairings = round.map((m) => `${m.competitionId}|${m.home}|${m.away}`);
  // Bez ?r ili ?r=novi: odmah u bilder (podrazumijevano, kao i do sada). ?r=lista: sačuvani rasporedi. ?r=<uuid>: otvori sačuvan.
  const draftId = typeof r === "string" && r !== "novi" && r !== "lista" ? r : null;
  const draft = draftId ? await getSavedSocialSchedule(draftId) : null;
  const schedule = { view: r === "lista" ? ("list" as const) : draftId && !draft ? ("missing" as const) : ("builder" as const), saved, initial: draft };
  return (
    <SocialStudio
      key={typeof r === "string" ? r : "builder"}
      {...data} matches={withRound(data.matches)} results={withRound(results)} round={withRound(round)} tables={tables}
      kind={kind} competition={typeof takmicenje === "string" ? takmicenje : undefined} font={poster.style.fontFamily}
      fixturesByCompetition={FIXTURES_BY_COMPETITION} knownPairings={knownPairings} schedule={schedule}
    />
  );
}

import { KADETI_G2_FIXTURES, KADETI_G2_ID } from "@/lib/kadeti-g2-raspored";
import { CompetitionRaspored } from "./a2-jug-raspored";

export function KadetiG2Raspored({ teams }: { teams: { id: string; name: string; club: { logo_url: string | null } | null }[] }) {
  return <CompetitionRaspored teams={teams} competitionId={KADETI_G2_ID} competitionName="Kadeti — Grupa 2" fixtures={KADETI_G2_FIXTURES} />;
}

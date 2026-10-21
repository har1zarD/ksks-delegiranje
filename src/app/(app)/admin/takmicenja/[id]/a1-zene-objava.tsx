import { A1_ZENE_FIXTURES, A1_ZENE_ID } from "@/lib/a1-zene-raspored";
import { CompetitionRaspored } from "./a2-jug-raspored";

export function A1ZeneRaspored({ teams }: { teams: { id: string; name: string; club: { logo_url: string | null } | null }[] }) {
  return <CompetitionRaspored teams={teams} competitionId={A1_ZENE_ID} competitionName="A1 žene" fixtures={A1_ZENE_FIXTURES} />;
}

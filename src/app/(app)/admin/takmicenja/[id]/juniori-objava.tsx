import { JUNIORI_FIXTURES, JUNIORI_ID } from "@/lib/juniori-raspored";
import { CompetitionRaspored } from "./a2-jug-raspored";

export function JunioriRaspored({ teams }: { teams: { id: string; name: string; club: { logo_url: string | null } | null }[] }) {
  return <CompetitionRaspored teams={teams} competitionId={JUNIORI_ID} competitionName="Juniori" fixtures={JUNIORI_FIXTURES} />;
}

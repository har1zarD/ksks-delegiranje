import { MINIBASKET_FIXTURES, MINIBASKET_ID } from "@/lib/minibasket-raspored";
import { CompetitionRaspored } from "./a2-jug-raspored";

export function MinibasketRaspored({ teams }: { teams: { id: string; name: string; club: { logo_url: string | null } | null }[] }) {
  return <CompetitionRaspored teams={teams} competitionId={MINIBASKET_ID} competitionName="Minibasket" fixtures={MINIBASKET_FIXTURES} />;
}

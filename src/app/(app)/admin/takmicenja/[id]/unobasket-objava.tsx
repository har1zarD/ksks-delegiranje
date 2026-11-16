import { UNOBASKET_FIXTURES, UNOBASKET_ID } from "@/lib/unobasket-raspored";
import { CompetitionRaspored } from "./a2-jug-raspored";

export function UnobasketRaspored({ teams }: { teams: { id: string; name: string; club: { logo_url: string | null } | null }[] }) {
  return <CompetitionRaspored teams={teams} competitionId={UNOBASKET_ID} competitionName="Unobasket" fixtures={UNOBASKET_FIXTURES} />;
}

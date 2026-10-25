// Svi PostgREST selecti na jednom mjestu (bez zavisnosti od Next-a, da ih testovi mogu koristiti).
import { CREW_COLUMNS, CREW_DEFAULT_COLUMNS } from "@/lib/crew";

export const MATCH_SELECT = `
  id, number, kind, kind_label, starts_at, round, status, published_at, clubs_notified_at, ${CREW_COLUMNS}, home_score, away_score, fiba_game_id, fiba_stream_key,
  competition:competitions!matches_competition_id_fkey ( id, name, short_name, category ),
  home:teams!matches_home_team_id_fkey ( id, name, club:clubs!teams_club_id_fkey ( logo_url ) ),
  away:teams!matches_away_team_id_fkey ( id, name, club:clubs!teams_club_id_fkey ( logo_url ) ),
  hall:halls!matches_hall_id_fkey ( id, name, city )
` as const;

export const MY_ASSIGNMENT_SELECT = `id, position, status, decline_reason, match:matches!assignments_match_id_fkey ( ${MATCH_SELECT}, periods:match_periods ( period, home_points, away_points ) )` as const;

export const CREW_SELECT = "match_id, position, status, profile:profiles!assignments_profile_id_fkey ( full_name, phone )" as const;

export const COMPETITION_SELECT =
  `id, name, short_name, category, ${CREW_DEFAULT_COLUMNS}, fee_referee_2_km, fee_referee_3_km, fee_table_km, fee_stats_km, fee_commissioner_km, fee_scorer_km, fee_digital_km, season:seasons!competitions_season_id_fkey!inner ( is_current ), teams ( id, name, club:clubs!teams_club_id_fkey ( hall_id, logo_url ) )` as const;

/** Pravila naknada takmičenja utakmice (za trošak); poseban alias da MATCH_SELECT ostane mali */
const MATCH_FEE_RULES =
  "rules:competitions!matches_competition_id_fkey ( fee_referee_2_km, fee_referee_3_km, fee_table_km, fee_stats_km, fee_commissioner_km, fee_scorer_km, fee_digital_km, split_nominations )" as const;

/** FIBA LiveStats utakmica: uživo i da li je statistika (box score) upisana */
const MATCH_FIBA = "fiba:fiba_games!matches_fiba_game_id_fkey ( status, live, stats_at, team_games:fiba_team_games ( count ) )" as const;

/** Rezultat po četvrtinama (box score na listi i detalju) */
const MATCH_PERIODS = "periods:match_periods ( period, home_points, away_points )" as const;

export const ADMIN_MATCH_SELECT = `${MATCH_SELECT}, ${MATCH_FEE_RULES}, ${MATCH_PERIODS}, ${MATCH_FIBA}, assignments ( id, position, status, notified_at, paid_at, profile:profiles!assignments_profile_id_fkey ( id, full_name ) )` as const;

export const DELEGATION_MATCH_SELECT =
  `${MATCH_SELECT}, ${MATCH_FEE_RULES}, ${MATCH_PERIODS}, ${MATCH_FIBA}, competition_id, home_team_id, away_team_id, hall_id, notes, finished_at, finisher:profiles!matches_finished_by_fkey ( id, full_name, role )` as const;

export const DELEGATION_ASSIGNMENT_SELECT =
  "id, position, status, decline_reason, notified_at, responded_at, paid_at, fee_km, profile:profiles!assignments_profile_id_fkey ( id, full_name, email ), payer:profiles!assignments_paid_by_fkey ( id, full_name, role )" as const;

/** Delegiranja s utakmicom; filtrira se po match.starts_at (zato !inner) */
export const ASSIGNMENT_WITH_TIME_SELECT = "profile_id, match:matches!assignments_match_id_fkey!inner ( id, starts_at )" as const;

/** Satnice kola za klubove: takmičenje s ekipama (slobodna ekipa = ekipa bez utakmice u kolu) */
export const SCHEDULE_COMPETITION_SELECT =
  "id, name, short_name, category, sort, season:seasons!competitions_season_id_fkey!inner ( name, is_current ), teams ( id, name )" as const;

/** Satnice kola: utakmica s terminom, dvoranom i delegiranim sudijama i komesarom */
export const SCHEDULE_MATCH_SELECT = `id, number, round, starts_at, status, competition_id, home_team_id, away_team_id, ${CREW_COLUMNS},
  home:teams!matches_home_team_id_fkey ( name ),
  away:teams!matches_away_team_id_fkey ( name ),
  hall:halls!matches_hall_id_fkey ( name ),
  assignments ( position, status, profile:profiles!assignments_profile_id_fkey ( full_name ) )` as const;

/** Bilten: kao satnice, plus rezultat, četvrtine i bilten komesara (primjedbe) */
export const BULLETIN_MATCH_SELECT = `${SCHEDULE_MATCH_SELECT}, home_score, away_score,
  match_periods ( period, home_points, away_points ),
  match_reports ( technicals, incidents, remarks, submitted_at )` as const;

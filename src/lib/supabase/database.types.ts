
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "assignments": {
                  Row: {
                    "created_at": string,"created_by": string | null,"decline_reason": string | null,"id": string,"match_id": string,"notified_at": string | null,"paid_at": string | null,"paid_by": string | null,"position": Database["public"]['Enums']["assignment_position"],"profile_id": string,"responded_at": string | null,"status": Database["public"]['Enums']["assignment_status"]
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"decline_reason"?: string | null,"id"?: string,"match_id": string,"notified_at"?: string | null,"paid_at"?: string | null,"paid_by"?: string | null,"position": Database["public"]['Enums']["assignment_position"],"profile_id": string,"responded_at"?: string | null,"status"?: Database["public"]['Enums']["assignment_status"]
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"decline_reason"?: string | null,"id"?: string,"match_id"?: string,"notified_at"?: string | null,"paid_at"?: string | null,"paid_by"?: string | null,"position"?: Database["public"]['Enums']["assignment_position"],"profile_id"?: string,"responded_at"?: string | null,"status"?: Database["public"]['Enums']["assignment_status"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "assignments_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "assignments_match_id_fkey"
      columns: ["match_id"]
isOneToOne: false
      referencedRelation: "matches"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "assignments_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"clubs": {
                  Row: {
                    "active": boolean,"city": string | null,"email": string | null,"hall_id": string | null,"id": string,"logo_url": string | null,"name": string,"phone": string | null,"short_name": string
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"city"?: string | null,"email"?: string | null,"hall_id"?: string | null,"id"?: string,"logo_url"?: string | null,"name": string,"phone"?: string | null,"short_name": string
                  }
                  Update: {
                    "active"?: boolean,"city"?: string | null,"email"?: string | null,"hall_id"?: string | null,"id"?: string,"logo_url"?: string | null,"name"?: string,"phone"?: string | null,"short_name"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "clubs_hall_id_fkey"
      columns: ["hall_id"]
isOneToOne: false
      referencedRelation: "halls"
      referencedColumns: ["id"]
    }
                  ]
                },"competitions": {
                  Row: {
                    "carry_over_h2h": boolean,"fee_referee_2_km": number | null,"referees_default": boolean,"commissioner_default": boolean,"scorer_default": boolean,"assistant_scorer_default": boolean,"timer_default": boolean,"shot_clock_default": boolean,"stats_default": number,"digital_default": boolean,"fee_stats_km": number | null,"split_nominations": boolean,"fee_referee_3_km": number | null,"fee_table_km": number | null,"fee_commissioner_km": number | null,"referee_count_default": number,"table_count_default": number,"category": string,"fee_due_on": string | null,"fee_first_km": number | null,"fee_km": number | null,"format": string | null,"gender": string,"id": string,"name": string,"parent_id": string | null,"period_min": number,"periods": number,"season_id": string,"short_name": string | null,"sort": number,"starts_on": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "carry_over_h2h"?: boolean,"fee_referee_2_km"?: number | null,"referees_default"?: boolean,"commissioner_default"?: boolean,"scorer_default"?: boolean,"assistant_scorer_default"?: boolean,"timer_default"?: boolean,"shot_clock_default"?: boolean,"stats_default"?: number,"digital_default"?: boolean,"fee_stats_km"?: number | null,"split_nominations"?: boolean,"fee_referee_3_km"?: number | null,"fee_table_km"?: number | null,"fee_commissioner_km"?: number | null,"referee_count_default"?: number,"table_count_default"?: number,"category": string,"fee_due_on"?: string | null,"fee_first_km"?: number | null,"fee_km"?: number | null,"format"?: string | null,"gender"?: string,"id"?: string,"name": string,"parent_id"?: string | null,"period_min"?: number,"periods"?: number,"season_id": string,"short_name"?: string | null,"sort"?: number,"starts_on"?: string | null
                  }
                  Update: {
                    "carry_over_h2h"?: boolean,"fee_referee_2_km"?: number | null,"referees_default"?: boolean,"commissioner_default"?: boolean,"scorer_default"?: boolean,"assistant_scorer_default"?: boolean,"timer_default"?: boolean,"shot_clock_default"?: boolean,"stats_default"?: number,"digital_default"?: boolean,"fee_stats_km"?: number | null,"split_nominations"?: boolean,"fee_referee_3_km"?: number | null,"fee_table_km"?: number | null,"fee_commissioner_km"?: number | null,"referee_count_default"?: number,"table_count_default"?: number,"category"?: string,"fee_due_on"?: string | null,"fee_first_km"?: number | null,"fee_km"?: number | null,"format"?: string | null,"gender"?: string,"id"?: string,"name"?: string,"parent_id"?: string | null,"period_min"?: number,"periods"?: number,"season_id"?: string,"short_name"?: string | null,"sort"?: number,"starts_on"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "competitions_parent_id_fkey"
      columns: ["parent_id"]
isOneToOne: false
      referencedRelation: "competitions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "competitions_season_id_fkey"
      columns: ["season_id"]
isOneToOne: false
      referencedRelation: "seasons"
      referencedColumns: ["id"]
    }
                  ]
                },"email_log": {
                  Row: {
                    "assignment_id": string | null,"error": string | null,"id": string,"kind": string,"profile_id": string | null,"provider_id": string | null,"sent_at": string,"to_email": string
                  }
                  ComputedFields: never
                  Insert: {
                    "assignment_id"?: string | null,"error"?: string | null,"id"?: string,"kind": string,"profile_id"?: string | null,"provider_id"?: string | null,"sent_at"?: string,"to_email": string
                  }
                  Update: {
                    "assignment_id"?: string | null,"error"?: string | null,"id"?: string,"kind"?: string,"profile_id"?: string | null,"provider_id"?: string | null,"sent_at"?: string,"to_email"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "email_log_assignment_id_fkey"
      columns: ["assignment_id"]
isOneToOne: false
      referencedRelation: "assignments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "email_log_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"fee_payments": {
                  Row: {
                    "amount_km": number,"created_at": string,"created_by": string | null,"id": string,"note": string | null,"paid_on": string,"team_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount_km": number,"created_at"?: string,"created_by"?: string | null,"id"?: string,"note"?: string | null,"paid_on"?: string,"team_id": string
                  }
                  Update: {
                    "amount_km"?: number,"created_at"?: string,"created_by"?: string | null,"id"?: string,"note"?: string | null,"paid_on"?: string,"team_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "fee_payments_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fee_payments_team_id_fkey"
      columns: ["team_id"]
isOneToOne: false
      referencedRelation: "teams"
      referencedColumns: ["id"]
    }
                  ]
                },"fee_rates": {
                  Row: {
                    "amount_km": number,"competition_id": string,"position": Database["public"]['Enums']["assignment_position"]
                  }
                  ComputedFields: never
                  Insert: {
                    "amount_km": number,"competition_id": string,"position": Database["public"]['Enums']["assignment_position"]
                  }
                  Update: {
                    "amount_km"?: number,"competition_id"?: string,"position"?: Database["public"]['Enums']["assignment_position"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "fee_rates_competition_id_fkey"
      columns: ["competition_id"]
isOneToOne: false
      referencedRelation: "competitions"
      referencedColumns: ["id"]
    }
                  ]
                },"halls": {
                  Row: {
                    "address": string | null,"city": string | null,"id": string,"name": string
                  }
                  ComputedFields: never
                  Insert: {
                    "address"?: string | null,"city"?: string | null,"id"?: string,"name": string
                  }
                  Update: {
                    "address"?: string | null,"city"?: string | null,"id"?: string,"name"?: string
                  }
                  Relationships: [
                    
                  ]
                },"match_periods": {
                  Row: {
                    "away_points": number,"home_points": number,"match_id": string,"period": number,"updated_at": string,"updated_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "away_points"?: number,"home_points"?: number,"match_id": string,"period": number,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "away_points"?: number,"home_points"?: number,"match_id"?: string,"period"?: number,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "match_periods_match_id_fkey"
      columns: ["match_id"]
isOneToOne: false
      referencedRelation: "matches"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "match_periods_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"match_reports": {
                  Row: {
                    "away_fouls": number | null,"commissioner": string | null,"ended_at": string | null,"home_fouls": number | null,"incidents": string | null,"match_id": string,"remarks": string | null,"spectators": number | null,"started_at": string | null,"submitted_at": string | null,"technicals": NonNullable<Json>,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "away_fouls"?: number | null,"commissioner"?: string | null,"ended_at"?: string | null,"home_fouls"?: number | null,"incidents"?: string | null,"match_id": string,"remarks"?: string | null,"spectators"?: number | null,"started_at"?: string | null,"submitted_at"?: string | null,"technicals"?: NonNullable<Json>,"updated_at"?: string
                  }
                  Update: {
                    "away_fouls"?: number | null,"commissioner"?: string | null,"ended_at"?: string | null,"home_fouls"?: number | null,"incidents"?: string | null,"match_id"?: string,"remarks"?: string | null,"spectators"?: number | null,"started_at"?: string | null,"submitted_at"?: string | null,"technicals"?: NonNullable<Json>,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "match_reports_commissioner_fkey"
      columns: ["commissioner"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "match_reports_match_id_fkey"
      columns: ["match_id"]
isOneToOne: true
      referencedRelation: "matches"
      referencedColumns: ["id"]
    }
                  ]
                },"matches": {
                  Row: {
                    "away_score": number | null,"table_count": number,"away_team_id": string,"competition_id": string,"created_at": string,"hall_id": string | null,"home_score": number | null,"home_team_id": string,"id": string,"notes": string | null,"number": number,"kind": Database["public"]["Enums"]["match_kind"],"kind_label": string | null,"has_referees": boolean,"has_commissioner": boolean,"has_scorer": boolean,"has_assistant_scorer": boolean,"has_timer": boolean,"has_shot_clock": boolean,"stats_count": number,"digital_scoresheet": boolean,"referee_count": number,"round": number | null,"starts_at": string,"status": Database["public"]['Enums']["match_status"]
                  }
                  ComputedFields: never
                  Insert: {
                    "away_score"?: number | null,"table_count"?: number,"away_team_id": string,"competition_id": string,"created_at"?: string,"hall_id"?: string | null,"home_score"?: number | null,"home_team_id": string,"id"?: string,"notes"?: string | null,"number"?: number,"kind"?: Database["public"]["Enums"]["match_kind"],"kind_label"?: string | null,"has_referees"?: boolean,"has_commissioner"?: boolean,"has_scorer"?: boolean,"has_assistant_scorer"?: boolean,"has_timer"?: boolean,"has_shot_clock"?: boolean,"stats_count"?: number,"digital_scoresheet"?: boolean,"referee_count"?: number,"round"?: number | null,"starts_at": string,"status"?: Database["public"]['Enums']["match_status"]
                  }
                  Update: {
                    "away_score"?: number | null,"table_count"?: number,"away_team_id"?: string,"competition_id"?: string,"created_at"?: string,"hall_id"?: string | null,"home_score"?: number | null,"home_team_id"?: string,"id"?: string,"notes"?: string | null,"number"?: number,"kind"?: Database["public"]["Enums"]["match_kind"],"kind_label"?: string | null,"has_referees"?: boolean,"has_commissioner"?: boolean,"has_scorer"?: boolean,"has_assistant_scorer"?: boolean,"has_timer"?: boolean,"has_shot_clock"?: boolean,"stats_count"?: number,"digital_scoresheet"?: boolean,"referee_count"?: number,"round"?: number | null,"starts_at"?: string,"status"?: Database["public"]['Enums']["match_status"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "matches_away_team_id_fkey"
      columns: ["away_team_id"]
isOneToOne: false
      referencedRelation: "teams"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "matches_competition_id_fkey"
      columns: ["competition_id"]
isOneToOne: false
      referencedRelation: "competitions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "matches_hall_id_fkey"
      columns: ["hall_id"]
isOneToOne: false
      referencedRelation: "halls"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "matches_home_team_id_fkey"
      columns: ["home_team_id"]
isOneToOne: false
      referencedRelation: "teams"
      referencedColumns: ["id"]
    }
                  ]
                },"mcp_audit": {
                  Row: {
                    "args": Json | null,"at": string,"error": string | null,"id": number,"ok": boolean,"profile_id": string | null,"token_id": string | null,"tool": string
                  }
                  ComputedFields: never
                  Insert: {
                    "args"?: Json | null,"at"?: string,"error"?: string | null,"id"?: never,"ok": boolean,"profile_id"?: string | null,"token_id"?: string | null,"tool": string
                  }
                  Update: {
                    "args"?: Json | null,"at"?: string,"error"?: string | null,"id"?: never,"ok"?: boolean,"profile_id"?: string | null,"token_id"?: string | null,"tool"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "mcp_audit_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "mcp_audit_token_id_fkey"
      columns: ["token_id"]
isOneToOne: false
      referencedRelation: "mcp_tokens"
      referencedColumns: ["id"]
    }
                  ]
                },"oauth_clients": {
                  Row: {
                    "created_at": string,"id": string,"name": string,"redirect_uris": string[]
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id": string,"name": string,"redirect_uris": string[]
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"name"?: string,"redirect_uris"?: string[]
                  }
                  Relationships: []
                },"oauth_codes": {
                  Row: {
                    "client_id": string,"code_challenge": string,"code_hash": string,"created_at": string,"expires_at": string,"profile_id": string,"redirect_uri": string,"used_at": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "client_id": string,"code_challenge": string,"code_hash": string,"created_at"?: string,"expires_at": string,"profile_id": string,"redirect_uri": string,"used_at"?: string | null
                  }
                  Update: {
                    "client_id"?: string,"code_challenge"?: string,"code_hash"?: string,"created_at"?: string,"expires_at"?: string,"profile_id"?: string,"redirect_uri"?: string,"used_at"?: string | null
                  }
                  Relationships: []
                },"mcp_tokens": {
                  Row: {
                    "created_at": string,"id": string,"last_used_at": string | null,"name": string,"oauth_client_id": string | null,"prefix": string,"profile_id": string,"revoked_at": string | null,"token_hash": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"last_used_at"?: string | null,"name"?: string,"oauth_client_id"?: string | null,"prefix": string,"profile_id": string,"revoked_at"?: string | null,"token_hash": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"last_used_at"?: string | null,"name"?: string,"oauth_client_id"?: string | null,"prefix"?: string,"profile_id"?: string,"revoked_at"?: string | null,"token_hash"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "mcp_tokens_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "active": boolean,"city": string | null,"created_at": string,"email": string,"full_name": string,"id": string,"is_referee": boolean,"is_table": boolean,"license": string | null,"phone": string | null,"role": Database["public"]['Enums']["user_role"]
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"city"?: string | null,"created_at"?: string,"email": string,"full_name": string,"id": string,"is_referee"?: boolean,"is_table"?: boolean,"license"?: string | null,"phone"?: string | null,"role"?: Database["public"]['Enums']["user_role"]
                  }
                  Update: {
                    "active"?: boolean,"city"?: string | null,"created_at"?: string,"email"?: string,"full_name"?: string,"id"?: string,"is_referee"?: boolean,"is_table"?: boolean,"license"?: string | null,"phone"?: string | null,"role"?: Database["public"]['Enums']["user_role"]
                  }
                  Relationships: [
                    
                  ]
                },"seasons": {
                  Row: {
                    "ends_on": string | null,"id": string,"is_current": boolean,"name": string,"starts_on": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "ends_on"?: string | null,"id"?: string,"is_current"?: boolean,"name": string,"starts_on"?: string | null
                  }
                  Update: {
                    "ends_on"?: string | null,"id"?: string,"is_current"?: boolean,"name"?: string,"starts_on"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"teams": {
                  Row: {
                    "club_id": string,"competition_id": string,"id": string,"name": string,"sort": number
                  }
                  ComputedFields: never
                  Insert: {
                    "club_id": string,"competition_id": string,"id"?: string,"name": string,"sort"?: number
                  }
                  Update: {
                    "club_id"?: string,"competition_id"?: string,"id"?: string,"name"?: string,"sort"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "teams_club_id_fkey"
      columns: ["club_id"]
isOneToOne: false
      referencedRelation: "clubs"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "teams_competition_id_fkey"
      columns: ["competition_id"]
isOneToOne: false
      referencedRelation: "competitions"
      referencedColumns: ["id"]
    }
                  ]
                },"unavailability": {
                  Row: {
                    "created_at": string,"from_date": string,"id": string,"profile_id": string,"reason": string | null,"to_date": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"from_date": string,"id"?: string,"profile_id": string,"reason"?: string | null,"to_date": string
                  }
                  Update: {
                    "created_at"?: string,"from_date"?: string,"id"?: string,"profile_id"?: string,"reason"?: string | null,"to_date"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "unavailability_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "current_role":
{ Args: Record<PropertyKey, never>; Returns: Database["public"]['Enums']["user_role"]
                           },
"dearmor":
{ Args: { "": string }; Returns: string
                           },
"gen_random_uuid":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"gen_salt":
{ Args: { "": string }; Returns: string
                           },
"is_admin":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"is_match_commissioner":
{ Args: { "m": string }; Returns: boolean
                           },
"is_on_match":
{ Args: { "m": string }; Returns: boolean
                           },
"pgp_armor_headers":
{ Args: { "": string }; Returns: Record<string, unknown>[]
                           },
"respond_to_assignment":
{ Args: { "a": string,"accept": boolean,"reason"?: string }; Returns: {
              "created_at": string,
"created_by": string | null,
"decline_reason": string | null,
"id": string,
"match_id": string,
"notified_at": string | null,
"paid_at": string | null,
"paid_by": string | null,
"position": Database["public"]['Enums']["assignment_position"],
"profile_id": string,
"responded_at": string | null,
"status": Database["public"]['Enums']["assignment_status"]
            }
                          SetofOptions: {
        from: "*"
        to: "assignments"
        isOneToOne: true
        isSetofReturn: false
      } },
"set_match_status":
{ Args: { "m": string,"s": Database["public"]['Enums']["match_status"] }; Returns: Database["public"]["Tables"]["matches"]["Row"]
                          SetofOptions: {
        from: "*"
        to: "matches"
        isOneToOne: true
        isSetofReturn: false
      } }
          }
          Enums: {
            "assignment_position": "referee_1"|"referee_2"|"referee_3"|"scorer"|"assistant_scorer"|"timer"|"shot_clock"|"statistician_1"|"statistician_2"|"commissioner","assignment_status": "pending"|"accepted"|"declined"|"cancelled","match_kind": "league"|"friendly"|"tournament"|"custom","match_status": "scheduled"|"live"|"finished"|"postponed"|"cancelled","user_role": "admin"|"official"|"commissioner"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "public": {
          Enums: {
            "assignment_position": ["referee_1", "referee_2", "referee_3", "scorer", "assistant_scorer", "timer", "shot_clock", "statistician_1", "statistician_2", "commissioner"],"assignment_status": ["pending", "accepted", "declined", "cancelled"],"match_kind": ["league", "friendly", "tournament", "custom"],"match_status": ["scheduled", "live", "finished", "postponed", "cancelled"],"user_role": ["admin", "official", "commissioner"]
          }
        }
} as const

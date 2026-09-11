// GENERATED. Never hand-edited.
// Regenerate with: npm run db:types

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      checkins: {
        Row: {
          body: string
          created_at: string
          id: string
          input_method: string
          matched_rule_id: string | null
          pregnancy_id: string | null
          severity: string | null
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          input_method: string
          matched_rule_id?: string | null
          pregnancy_id?: string | null
          severity?: string | null
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          input_method?: string
          matched_rule_id?: string | null
          pregnancy_id?: string | null
          severity?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "checkins_pregnancy_owned_by_same_user"
            columns: ["pregnancy_id", "user_id"]
            isOneToOne: false
            referencedRelation: "pregnancies"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      consents: {
        Row: {
          consent_key: string
          granted: boolean
          granted_at: string
          id: string
          locale: string
          seq: number
          user_id: string
          version: string
        }
        Insert: {
          consent_key: string
          granted: boolean
          granted_at?: string
          id?: string
          locale: string
          seq?: never
          user_id: string
          version: string
        }
        Update: {
          consent_key?: string
          granted?: boolean
          granted_at?: string
          id?: string
          locale?: string
          seq?: never
          user_id?: string
          version?: string
        }
        Relationships: []
      }
      contraction_sessions: {
        Row: {
          created_at: string
          ended_at: string | null
          id: string
          started_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          ended_at?: string | null
          id?: string
          started_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          ended_at?: string | null
          id?: string
          started_at?: string
          user_id?: string
        }
        Relationships: []
      }
      contractions: {
        Row: {
          created_at: string
          duration_seconds: number | null
          id: string
          session_id: string
          started_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          duration_seconds?: number | null
          id?: string
          session_id: string
          started_at: string
          user_id: string
        }
        Update: {
          created_at?: string
          duration_seconds?: number | null
          id?: string
          session_id?: string
          started_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contractions_session_owned_by_same_user"
            columns: ["session_id", "user_id"]
            isOneToOne: false
            referencedRelation: "contraction_sessions"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      kick_events: {
        Row: {
          id: string
          occurred_at: string
          session_id: string
          tap_id: string
          user_id: string
        }
        Insert: {
          id?: string
          occurred_at?: string
          session_id: string
          tap_id: string
          user_id: string
        }
        Update: {
          id?: string
          occurred_at?: string
          session_id?: string
          tap_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "kick_event_session_owned_by_same_user"
            columns: ["session_id", "user_id"]
            isOneToOne: false
            referencedRelation: "kick_sessions"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      kick_sessions: {
        Row: {
          created_at: string
          ended_at: string | null
          id: string
          pregnancy_id: string | null
          started_at: string
          target_count: number
          user_id: string
        }
        Insert: {
          created_at?: string
          ended_at?: string | null
          id?: string
          pregnancy_id?: string | null
          started_at?: string
          target_count?: number
          user_id: string
        }
        Update: {
          created_at?: string
          ended_at?: string | null
          id?: string
          pregnancy_id?: string | null
          started_at?: string
          target_count?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "kick_pregnancy_owned_by_same_user"
            columns: ["pregnancy_id", "user_id"]
            isOneToOne: false
            referencedRelation: "pregnancies"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      pregnancies: {
        Row: {
          baby_name: string | null
          created_at: string
          edd: string
          edd_source: string
          ended_at: string | null
          ended_reason: string | null
          id: string
          lmp_date: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          baby_name?: string | null
          created_at?: string
          edd: string
          edd_source: string
          ended_at?: string | null
          ended_reason?: string | null
          id?: string
          lmp_date?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          baby_name?: string | null
          created_at?: string
          edd?: string
          edd_source?: string
          ended_at?: string | null
          ended_reason?: string | null
          id?: string
          lmp_date?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          birth_year: number | null
          city: string | null
          clinic_name: string | null
          created_at: string
          display_name: string
          doctor_name: string | null
          height_cm: number | null
          id: string
          is_first_pregnancy: boolean | null
          locale: string
          onboarding_completed_at: string | null
          pre_pregnancy_weight_kg: number | null
          updated_at: string
        }
        Insert: {
          birth_year?: number | null
          city?: string | null
          clinic_name?: string | null
          created_at?: string
          display_name: string
          doctor_name?: string | null
          height_cm?: number | null
          id: string
          is_first_pregnancy?: boolean | null
          locale?: string
          onboarding_completed_at?: string | null
          pre_pregnancy_weight_kg?: number | null
          updated_at?: string
        }
        Update: {
          birth_year?: number | null
          city?: string | null
          clinic_name?: string | null
          created_at?: string
          display_name?: string
          doctor_name?: string | null
          height_cm?: number | null
          id?: string
          is_first_pregnancy?: boolean | null
          locale?: string
          onboarding_completed_at?: string | null
          pre_pregnancy_weight_kg?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      timeline_events: {
        Row: {
          body: string | null
          created_at: string
          event_type: string
          id: string
          occurred_at: string
          pregnancy_id: string | null
          ref_id: string | null
          ref_table: string | null
          source: string
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          event_type: string
          id?: string
          occurred_at: string
          pregnancy_id?: string | null
          ref_id?: string | null
          ref_table?: string | null
          source: string
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          event_type?: string
          id?: string
          occurred_at?: string
          pregnancy_id?: string | null
          ref_id?: string | null
          ref_table?: string | null
          source?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "timeline_pregnancy_owned_by_same_user"
            columns: ["pregnancy_id", "user_id"]
            isOneToOne: false
            referencedRelation: "pregnancies"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      waitlist: {
        Row: {
          consent: string
          consent_version: number
          created_at: string
          email: string
          id: string
          locale: string
          name: string
        }
        Insert: {
          consent?: string
          consent_version?: number
          created_at?: string
          email: string
          id?: string
          locale: string
          name: string
        }
        Update: {
          consent?: string
          consent_version?: number
          created_at?: string
          email?: string
          id?: string
          locale?: string
          name?: string
        }
        Relationships: []
      }
    }
    Views: {
      current_consents: {
        Row: {
          consent_key: string | null
          granted: boolean | null
          granted_at: string | null
          locale: string | null
          user_id: string | null
          version: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      join_waitlist: {
        Args: { p_email: string; p_locale: string; p_name: string }
        Returns: undefined
      }
      tables_without_rls: { Args: never; Returns: string[] }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

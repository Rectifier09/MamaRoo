// GENERATED. Never hand-edited.
//
// TEMPORARY STUB pending live credentials for the Session 7 Supabase project. This
// hand-written type mirrors supabase/migrations/0001_identity.sql exactly so the rest
// of the codebase can compile and typecheck before the project exists. It is replaced
// wholesale the moment the project is linked, by running:
//   npx supabase gen types typescript --linked > lib/supabase/database.types.ts
// Do not add to this file by hand once that has happened — regenerate instead.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string;
          locale: "en" | "hi";
          birth_year: number | null;
          city: string | null;
          is_first_pregnancy: boolean | null;
          height_cm: number | null;
          pre_pregnancy_weight_kg: number | null;
          doctor_name: string | null;
          clinic_name: string | null;
          onboarding_completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name: string;
          locale?: "en" | "hi";
          birth_year?: number | null;
          city?: string | null;
          is_first_pregnancy?: boolean | null;
          height_cm?: number | null;
          pre_pregnancy_weight_kg?: number | null;
          doctor_name?: string | null;
          clinic_name?: string | null;
          onboarding_completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      pregnancies: {
        Row: {
          id: string;
          user_id: string;
          lmp_date: string | null;
          edd: string;
          edd_source: "lmp" | "scan" | "manual";
          baby_name: string | null;
          status: "active" | "ended";
          ended_at: string | null;
          ended_reason: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          lmp_date?: string | null;
          edd: string;
          edd_source: "lmp" | "scan" | "manual";
          baby_name?: string | null;
          status?: "active" | "ended";
          ended_at?: string | null;
          ended_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["pregnancies"]["Insert"]>;
        Relationships: [];
      };
      consents: {
        Row: {
          id: string;
          seq: number;
          user_id: string;
          consent_key: "terms" | "privacy" | "optional_data_sharing" | "analytics";
          version: string;
          granted: boolean;
          locale: "en" | "hi";
          granted_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          consent_key: "terms" | "privacy" | "optional_data_sharing" | "analytics";
          version: string;
          granted: boolean;
          locale: "en" | "hi";
          granted_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["consents"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: {
      current_consents: {
        Row: {
          user_id: string;
          consent_key: "terms" | "privacy" | "optional_data_sharing" | "analytics";
          version: string;
          granted: boolean;
          locale: "en" | "hi";
          granted_at: string;
        };
        Relationships: [];
      };
    };
    Functions: {
      tables_without_rls: {
        Args: Record<PropertyKey, never>;
        Returns: string[];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

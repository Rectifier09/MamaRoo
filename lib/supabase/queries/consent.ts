import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export type ConsentKey = "terms" | "privacy" | "optional_data_sharing" | "analytics";

/**
 * THE ONLY sanctioned way to ask what she has currently agreed to. Reads the
 * current_consents view, never the raw consents table: that table is append-only, so
 * "does any row have granted = true" can never become false and a withdrawal would
 * never take effect. Every consumer calls this — middleware, the analytics mount,
 * Settings, and the Visit Summary.
 */
export interface ConsentState {
  granted: boolean;
  /** Null when she has never recorded a decision for this key. */
  version: string | null;
  grantedAt: string | null;
}

export async function getCurrentConsents(
  supabase: SupabaseClient<Database>,
): Promise<Record<ConsentKey, ConsentState>> {
  const { data } = await supabase
    .from("current_consents")
    .select("consent_key, granted, version, granted_at");

  const absent: ConsentState = { granted: false, version: null, grantedAt: null };
  const base: Record<ConsentKey, ConsentState> = {
    terms: { ...absent },
    privacy: { ...absent },
    optional_data_sharing: { ...absent },
    analytics: { ...absent },
  };

  for (const row of data ?? []) {
    if (row.consent_key in base) {
      base[row.consent_key as ConsentKey] = {
        granted: row.granted,
        version: row.version,
        grantedAt: row.granted_at,
      };
    }
  }
  return base;
}

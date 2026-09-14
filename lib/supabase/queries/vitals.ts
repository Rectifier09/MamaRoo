import { createServerSupabase } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

export type VitalRow = Database["public"]["Tables"]["vitals"]["Row"];

/** Every kind, every date -- `vitalSeries` does the per-kind filtering and
 * date-range work client-side, so this is the one read for the whole screen. */
export async function getVitals(): Promise<VitalRow[]> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase.from("vitals").select("*").order("measured_on", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

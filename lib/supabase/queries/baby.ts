import { createServerSupabase } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

type Tables = Database["public"]["Tables"];
export type PregnancyRow = Tables["pregnancies"]["Row"];
export type TimelineEventRow = Tables["timeline_events"]["Row"];

export interface BabyData {
  pregnancy: PregnancyRow | null;
  timelineEvents: TimelineEventRow[];
}

/**
 * The timeline shows her own record, not an unbounded log -- 200 rows is far
 * beyond anything a single pregnancy could log (kicks are one row per
 * session, not per tap; see lib/domain/kicks.ts), so this is a safety cap on
 * the query, not a product-facing limit. Any UI-level "show more" trimming
 * happens on top of this in the screen, per lib/domain/timeline.ts's own
 * choice not to own pagination itself.
 */
const TIMELINE_QUERY_LIMIT = 200;

export async function getBabyData(): Promise<BabyData> {
  const supabase = await createServerSupabase();

  const [pregnancy, timelineEvents] = await Promise.all([
    supabase.from("pregnancies").select("*").eq("status", "active").maybeSingle(),
    supabase
      .from("timeline_events")
      .select("*")
      .order("occurred_at", { ascending: false })
      .limit(TIMELINE_QUERY_LIMIT),
  ]);

  const failed = [pregnancy, timelineEvents].find((result) => result.error);
  if (failed?.error) throw failed.error;

  return {
    pregnancy: pregnancy.data,
    timelineEvents: timelineEvents.data ?? [],
  };
}

import { createServerSupabase } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

type Tables = Database["public"]["Tables"];
export type ActivityCheckinRow = Tables["checkins"]["Row"];
export type ActivityMedicineLogRow = Tables["medicine_logs"]["Row"] & {
  medicines: Pick<Tables["medicines"]["Row"], "name"> | null;
};

export interface RecentActivityData {
  checkins: ActivityCheckinRow[];
  medicineLogs: ActivityMedicineLogRow[];
  milestones: [];
  appointments: [];
  wellnessEvents: [];
}

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export async function getRecentActivity({
  now = new Date(),
}: { now?: Date } = {}): Promise<RecentActivityData> {
  const supabase = await createServerSupabase();
  const since = new Date(now.getTime() - THIRTY_DAYS_MS).toISOString();

  const [checkins, medicineLogs] = await Promise.all([
    supabase
      .from("checkins")
      .select("*")
      .gte("created_at", since)
      .order("created_at", { ascending: false }),
    supabase
      .from("medicine_logs")
      .select("*, medicines(name)")
      .gte("logged_at", since)
      .order("logged_at", { ascending: false }),
  ]);

  if (checkins.error) throw checkins.error;
  if (medicineLogs.error) throw medicineLogs.error;

  return {
    checkins: checkins.data ?? [],
    medicineLogs: medicineLogs.data ?? [],
    // Sessions 20 and 23 add milestone and appointment producers; no wellness-event producer exists yet.
    milestones: [],
    appointments: [],
    wellnessEvents: [],
  };
}

import { createServerSupabase } from "@/lib/supabase/server";
import type { Locale } from "@/lib/config";
import type { Database } from "@/lib/supabase/database.types";

type Tables = Database["public"]["Tables"];
export type PregnancyRow = Tables["pregnancies"]["Row"];
export type TodayProfile = Pick<Tables["profiles"]["Row"], "display_name" | "doctor_name" | "clinic_name">;
export type MedicineRow = Tables["medicines"]["Row"];
export type MedicineLogRow = Tables["medicine_logs"]["Row"];
export type AppointmentRow = Tables["appointments"]["Row"];
export type TodayContentItemRow = Tables["content_items"]["Row"];

export interface TodayData {
  pregnancy: PregnancyRow | null;
  profile: TodayProfile | null;
  medicines: MedicineRow[];
  medicineLogs: MedicineLogRow[];
  appointments: AppointmentRow[];
  contentItems: TodayContentItemRow[];
}

export async function getTodayData({
  today,
  currentWeek,
  locale,
}: {
  today: string;
  currentWeek: number;
  locale: Locale;
}): Promise<TodayData> {
  const supabase = await createServerSupabase();

  const [pregnancy, profile, medicines, medicineLogs, appointments, contentItems] =
    await Promise.all([
      supabase.from("pregnancies").select("*").eq("status", "active").maybeSingle(),
      supabase.from("profiles").select("display_name, doctor_name, clinic_name").maybeSingle(),
      supabase
        .from("medicines")
        .select("*")
        .eq("is_active", true)
        .lte("start_date", today)
        .or(`end_date.is.null,end_date.gte.${today}`),
      supabase.from("medicine_logs").select("*").eq("scheduled_date", today),
      supabase
        .from("appointments")
        .select("*")
        .eq("status", "upcoming")
        .order("scheduled_at", { ascending: true }),
      supabase
        .from("content_items")
        .select("*")
        .eq("is_published", true)
        // Session 18's reading cards deliberately skip Session 28's full
        // fallback-with-marker logic (resolveLocalisedContent) -- this is a
        // plain locale filter, so a week with no content in her language
        // simply shows fewer cards, same as a week with no content at all.
        .eq("locale", locale)
        // week_min/week_max are nullable -- null means "not week-restricted",
        // i.e. it covers every week. .lte()/.gte() alone would silently drop
        // those rows, since PostgREST's null comparison excludes them rather
        // than treating them as unbounded. Each .or() ANDs with the filters
        // before it, so together these read: (week_min is null or
        // week_min <= currentWeek) and (week_max is null or
        // week_max >= currentWeek).
        .or(`week_min.is.null,week_min.lte.${currentWeek}`)
        .or(`week_max.is.null,week_max.gte.${currentWeek}`)
        .order("created_at", { ascending: false })
        .limit(2),
    ]);

  const failed = [pregnancy, profile, medicines, medicineLogs, appointments, contentItems].find(
    (result) => result.error,
  );
  if (failed?.error) throw failed.error;

  return {
    pregnancy: pregnancy.data,
    profile: profile.data,
    medicines: medicines.data ?? [],
    medicineLogs: medicineLogs.data ?? [],
    appointments: appointments.data ?? [],
    contentItems: contentItems.data ?? [],
  };
}

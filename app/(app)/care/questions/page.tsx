import { getLocale } from "@/i18n/locale";
import { SuggestedQuestions, type NextAppointmentInfo } from "@/app/(app)/care/questions/SuggestedQuestions";
import { todayInAppZone } from "@/lib/domain/dates";
import { pregnancyProgress } from "@/lib/domain/pregnancy";
import { getQuestionsData } from "@/lib/supabase/queries/questions";
import { createServerSupabase } from "@/lib/supabase/server";

/**
 * Same split as Today's page.tsx: getQuestionsData's seeded-questions query
 * needs the current week, which comes from the active pregnancy's edd -- read
 * that one cheap column first rather than teaching the query module its own
 * domain math.
 */
async function currentWeek(today: string): Promise<number> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase.from("pregnancies").select("edd").eq("status", "active").maybeSingle();
  if (error) throw error;
  return data ? pregnancyProgress({ edd: data.edd, today }).week : 0;
}

export default async function CareQuestionsPage() {
  const locale = await getLocale();
  const today = todayInAppZone();
  const week = await currentWeek(today);
  const data = await getQuestionsData({ currentWeek: week, locale });

  const nextAppointment: NextAppointmentInfo | null = data.nextAppointment
    ? {
        doctorName: data.nextAppointment.doctor_name,
        clinicName: data.nextAppointment.clinic_name,
        scheduledAt: data.nextAppointment.scheduled_at,
      }
    : null;

  return <SuggestedQuestions initialQuestions={data.questions} nextAppointment={nextAppointment} />;
}

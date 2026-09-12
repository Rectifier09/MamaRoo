import { MealPlanScreen } from "@/app/(app)/today/meal-plan/MealPlanScreen";
import { todayInAppZone } from "@/lib/domain/dates";
import { pregnancyProgress } from "@/lib/domain/pregnancy";
import { createServerSupabase } from "@/lib/supabase/server";

export default async function MealPlanPage() {
  const supabase = await createServerSupabase();
  const { data: pregnancy, error } = await supabase
    .from("pregnancies")
    .select("edd")
    .eq("status", "active")
    .maybeSingle();

  if (error) throw error;

  const trimester = pregnancy
    ? pregnancyProgress({ edd: pregnancy.edd, today: todayInAppZone() }).trimester
    : 1;

  return <MealPlanScreen trimester={trimester} />;
}

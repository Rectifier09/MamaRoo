import { AdviceScreen } from "@/app/(app)/care/advice/AdviceScreen";
import { getAdviceData } from "@/lib/supabase/queries/advice";

export default async function CareAdvicePage() {
  const advice = await getAdviceData();

  return <AdviceScreen initialAdvice={advice} />;
}

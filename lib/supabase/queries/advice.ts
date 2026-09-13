import { assembleAdvice, type AdviceRecord, type AdviceRow, type AdviceUpdateRow } from "@/lib/domain/advice";
import { createServerSupabase } from "@/lib/supabase/server";

export async function getAdviceData(): Promise<AdviceRecord[]> {
  const supabase = await createServerSupabase();

  const [adviceRows, updateRows] = await Promise.all([
    supabase.from("doctor_advice").select("id,type,is_reminder"),
    supabase.from("doctor_advice_updates").select("id,advice_id,body,doctor_name,created_at"),
  ]);
  if (adviceRows.error) throw adviceRows.error;
  if (updateRows.error) throw updateRows.error;

  return assembleAdvice({
    adviceRows: (adviceRows.data ?? []) as AdviceRow[],
    updateRows: (updateRows.data ?? []) as AdviceUpdateRow[],
  });
}

"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase/server";

export async function logDose(input: {
  medicineId: string;
  scheduledDate: string;
  scheduledTime: string;
  status: "taken" | "skipped";
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (input.status !== "taken" && input.status !== "skipped") {
    return { ok: false, error: "invalid_status" };
  }

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "not_authenticated" };

  const { error } = await supabase.from("medicine_logs").upsert(
    {
      user_id: user.id,
      medicine_id: input.medicineId,
      scheduled_date: input.scheduledDate,
      scheduled_time: input.scheduledTime,
      status: input.status,
    },
    { onConflict: "medicine_id,scheduled_date,scheduled_time" },
  );
  if (error) return { ok: false, error: error.message };

  revalidatePath("/today");
  return { ok: true };
}

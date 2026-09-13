"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase/server";
import type { MedicineValue } from "@/lib/domain/medicines";
import type { Database } from "@/lib/supabase/database.types";

type MedicineRow = Database["public"]["Tables"]["medicines"]["Row"];

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

export type CreateMedicineResult = { ok: true; medicine: MedicineRow } | { ok: false; error: string };

export async function createMedicine(input: MedicineValue): Promise<CreateMedicineResult> {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "not_authenticated" };

  const { data, error } = await supabase
    .from("medicines")
    .insert({
      user_id: user.id,
      name: input.name,
      dosage: input.dosage,
      form: input.form,
      schedule_times: input.scheduleTimes,
      days_of_week: input.daysOfWeek,
      start_date: input.startDate,
      end_date: input.endDate,
      notes: input.notes,
    })
    .select("*")
    .single();
  if (error || !data) return { ok: false, error: error?.message ?? "unknown" };

  revalidatePath("/care/medicines");
  revalidatePath("/care");
  revalidatePath("/today");
  return { ok: true, medicine: data };
}

export type UpdateMedicineResult = { ok: true } | { ok: false; error: string };

export async function updateMedicine(
  id: string,
  patch: Partial<Omit<MedicineValue, "name">> & { name?: string },
): Promise<UpdateMedicineResult> {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "not_authenticated" };

  const columns: Database["public"]["Tables"]["medicines"]["Update"] = {};
  if (patch.name !== undefined) columns.name = patch.name;
  if (patch.dosage !== undefined) columns.dosage = patch.dosage;
  if (patch.form !== undefined) columns.form = patch.form;
  if (patch.scheduleTimes !== undefined) columns.schedule_times = patch.scheduleTimes;
  if (patch.daysOfWeek !== undefined) columns.days_of_week = patch.daysOfWeek;
  if (patch.startDate !== undefined) columns.start_date = patch.startDate;
  if (patch.endDate !== undefined) columns.end_date = patch.endDate;
  if (patch.notes !== undefined) columns.notes = patch.notes;

  const { error } = await supabase.from("medicines").update(columns).eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/care/medicines");
  revalidatePath("/care");
  revalidatePath("/today");
  return { ok: true };
}

export type DeactivateMedicineResult = { ok: true } | { ok: false; error: string };

export async function deactivateMedicine(id: string): Promise<DeactivateMedicineResult> {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "not_authenticated" };

  const { error } = await supabase.from("medicines").update({ is_active: false }).eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/care/medicines");
  revalidatePath("/care");
  revalidatePath("/today");
  return { ok: true };
}

"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase/server";
import type { AppointmentValue } from "@/lib/domain/appointments";
import type { Database } from "@/lib/supabase/database.types";

type AppointmentRow = Database["public"]["Tables"]["appointments"]["Row"];

function revalidateAppointments() {
  revalidatePath("/care/appointments");
  revalidatePath("/care");
  revalidatePath("/today");
}

export type AddAppointmentResult = { ok: true; appointment: AppointmentRow } | { ok: false; error: string };

export async function addAppointment(input: AppointmentValue): Promise<AddAppointmentResult> {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "not_authenticated" };

  const { data, error } = await supabase
    .from("appointments")
    .insert({
      user_id: user.id,
      title: input.title,
      doctor_name: input.doctorName,
      clinic_name: input.clinicName,
      scheduled_at: input.scheduledAt,
      location: input.location,
      notes: input.notes,
      status: "upcoming",
    })
    .select("*")
    .single();
  if (error || !data) return { ok: false, error: error?.message ?? "unknown" };

  revalidateAppointments();
  return { ok: true, appointment: data };
}

export type UpdateAppointmentResult = { ok: true } | { ok: false; error: string };

export async function updateAppointment(
  id: string,
  patch: Partial<AppointmentValue>,
): Promise<UpdateAppointmentResult> {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "not_authenticated" };

  const columns: Database["public"]["Tables"]["appointments"]["Update"] = {};
  if (patch.title !== undefined) columns.title = patch.title;
  if (patch.doctorName !== undefined) columns.doctor_name = patch.doctorName;
  if (patch.clinicName !== undefined) columns.clinic_name = patch.clinicName;
  if (patch.scheduledAt !== undefined) columns.scheduled_at = patch.scheduledAt;
  if (patch.location !== undefined) columns.location = patch.location;
  if (patch.notes !== undefined) columns.notes = patch.notes;

  const { error } = await supabase.from("appointments").update(columns).eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidateAppointments();
  return { ok: true };
}

async function setStatus(id: string, status: "completed" | "cancelled"): Promise<UpdateAppointmentResult> {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "not_authenticated" };

  const { error } = await supabase.from("appointments").update({ status }).eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidateAppointments();
  return { ok: true };
}

export type CompleteAppointmentResult = UpdateAppointmentResult;
export async function completeAppointment(id: string): Promise<CompleteAppointmentResult> {
  return setStatus(id, "completed");
}

export type CancelAppointmentResult = UpdateAppointmentResult;
export async function cancelAppointment(id: string): Promise<CancelAppointmentResult> {
  return setStatus(id, "cancelled");
}

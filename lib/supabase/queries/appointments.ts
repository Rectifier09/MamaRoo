import { createServerSupabase } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

type Tables = Database["public"]["Tables"];
export type AppointmentRow = Tables["appointments"]["Row"];
export type AppointmentProfile = Pick<Tables["profiles"]["Row"], "doctor_name" | "clinic_name">;

export interface AppointmentsData {
  appointments: AppointmentRow[];
  profile: AppointmentProfile | null;
}

export async function getAppointmentsData(): Promise<AppointmentsData> {
  const supabase = await createServerSupabase();

  const [appointments, profile] = await Promise.all([
    supabase.from("appointments").select("*").order("scheduled_at", { ascending: true }),
    supabase.from("profiles").select("doctor_name, clinic_name").maybeSingle(),
  ]);

  const failed = [appointments, profile].find((result) => result.error);
  if (failed?.error) throw failed.error;

  return {
    appointments: appointments.data ?? [],
    profile: profile.data,
  };
}

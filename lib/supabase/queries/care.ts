import { createServerSupabase } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

type Tables = Database["public"]["Tables"];
export type MedicineRow = Tables["medicines"]["Row"];
export type MedicineLogRow = Tables["medicine_logs"]["Row"];
export type AppointmentRow = Tables["appointments"]["Row"];
export type ReportRow = Tables["reports"]["Row"];
export type DoctorAdviceRow = Tables["doctor_advice"]["Row"];

export interface CareHubData {
  medicines: MedicineRow[];
  medicineLogs: MedicineLogRow[];
  nextAppointment: Pick<AppointmentRow, "id" | "title" | "doctor_name" | "scheduled_at"> | null;
  latestReport: Pick<ReportRow, "id" | "report_type" | "report_date"> | null;
  latestAdvice: Pick<DoctorAdviceRow, "id" | "body"> | null;
  markedQuestionCount: number;
}

/**
 * One read per hub card. Every underlying table already exists from Migration 3
 * (Session 9) and 4 (Session 10) -- this session doesn't add write flows for
 * appointments/reports/advice/questions, only the hub's read-only preview of
 * whatever those tables already hold. Personal notes has no table yet (Session
 * 22A), so the hub always shows its empty prompt for that one card.
 */
export async function getCareHubData(): Promise<CareHubData> {
  const supabase = await createServerSupabase();
  const today = new Date().toISOString();

  const [medicines, medicineLogs, nextAppointment, latestReport, latestAdvice, markedQuestions] =
    await Promise.all([
      supabase.from("medicines").select("*").eq("is_active", true),
      supabase.from("medicine_logs").select("*"),
      supabase
        .from("appointments")
        .select("id, title, doctor_name, scheduled_at")
        .eq("status", "upcoming")
        .gte("scheduled_at", today)
        .order("scheduled_at", { ascending: true })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("reports")
        .select("id, report_type, report_date")
        .order("report_date", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("doctor_advice")
        .select("id, body")
        .order("recorded_on", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase.from("question_marks").select("id", { count: "exact", head: true }),
    ]);

  const failed = [medicines, medicineLogs, nextAppointment, latestReport, latestAdvice, markedQuestions].find(
    (result) => result.error,
  );
  if (failed?.error) throw failed.error;

  return {
    medicines: medicines.data ?? [],
    medicineLogs: medicineLogs.data ?? [],
    nextAppointment: nextAppointment.data,
    latestReport: latestReport.data,
    latestAdvice: latestAdvice.data,
    markedQuestionCount: markedQuestions.count ?? 0,
  };
}

export interface CareMedicinesData {
  medicines: MedicineRow[];
  logs: MedicineLogRow[];
}

/** `from`/`to` bound the adherence-grid window; medicine_logs has no index
 * benefit from a date filter at today's data volume, so the query fetches every
 * log for the user's medicines and lets adherenceGrid do the date bucketing. */
export async function getCareMedicinesData(): Promise<CareMedicinesData> {
  const supabase = await createServerSupabase();

  const [medicines, logs] = await Promise.all([
    supabase.from("medicines").select("*").eq("is_active", true).order("created_at", { ascending: true }),
    supabase.from("medicine_logs").select("*"),
  ]);

  const failed = [medicines, logs].find((result) => result.error);
  if (failed?.error) throw failed.error;

  return {
    medicines: medicines.data ?? [],
    logs: logs.data ?? [],
  };
}

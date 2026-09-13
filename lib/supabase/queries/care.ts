import { createServerSupabase } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

type Tables = Database["public"]["Tables"];
export type MedicineRow = Tables["medicines"]["Row"];
export type MedicineLogRow = Tables["medicine_logs"]["Row"];
export type AppointmentRow = Tables["appointments"]["Row"];
export type ReportRow = Tables["reports"]["Row"];
export type PersonalNoteRow = Tables["personal_notes"]["Row"];
export type AdviceUpdateRow = Tables["doctor_advice_updates"]["Row"];

export interface CareHubData {
  medicines: MedicineRow[];
  medicineLogs: MedicineLogRow[];
  nextAppointment: Pick<AppointmentRow, "id" | "title" | "doctor_name" | "scheduled_at"> | null;
  latestReport: Pick<ReportRow, "id" | "report_type" | "report_date"> | null;
  latestAdvice: Pick<AdviceUpdateRow, "id" | "body"> | null;
  markedQuestionCount: number;
  latestNote: Pick<PersonalNoteRow, "id" | "body"> | null;
}

/**
 * One read per hub card. Every underlying table already exists from Migration 3
 * (Session 9), 4 (Session 10), and personal_notes (Session 22A) -- this session
 * doesn't add write flows for appointments/reports/questions/notes, only the
 * hub's read-only preview of whatever those tables already hold. The advice
 * preview reads `doctor_advice_updates` rather than `doctor_advice` itself
 * (Session 25 moved all free text there, append-only) -- same shape as the
 * notes preview, and it happens to always show the most *recently active*
 * thread's text, not just the most recently created one.
 */
export async function getCareHubData(): Promise<CareHubData> {
  const supabase = await createServerSupabase();
  const today = new Date().toISOString();

  const [
    medicines,
    medicineLogs,
    nextAppointment,
    latestReport,
    latestAdvice,
    markedSuggestedQuestions,
    markedCustomQuestions,
    latestNote,
  ] = await Promise.all([
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
      .from("doctor_advice_updates")
      .select("id, body")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from("question_marks").select("id", { count: "exact", head: true }),
    // Session 25A: her own questions are marked with `custom_questions.is_marked`
    // rather than a `question_marks` row (that join table only makes sense for
    // shared, admin-owned `suggested_questions`) -- the hub's "ready for your
    // next visit" count has to add both sources together.
    supabase.from("custom_questions").select("id", { count: "exact", head: true }).eq("is_marked", true),
    supabase
      .from("personal_notes")
      .select("id, body")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const failed = [
    medicines,
    medicineLogs,
    nextAppointment,
    latestReport,
    latestAdvice,
    markedSuggestedQuestions,
    markedCustomQuestions,
    latestNote,
  ].find((result) => result.error);
  if (failed?.error) throw failed.error;

  return {
    medicines: medicines.data ?? [],
    medicineLogs: medicineLogs.data ?? [],
    nextAppointment: nextAppointment.data,
    latestReport: latestReport.data,
    latestAdvice: latestAdvice.data,
    markedQuestionCount: (markedSuggestedQuestions.count ?? 0) + (markedCustomQuestions.count ?? 0),
    latestNote: latestNote.data,
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

import { selectQuestions, type QuestionRecord } from "@/lib/domain/questions";
import { createServerSupabase } from "@/lib/supabase/server";
import type { Locale } from "@/lib/config";
import type { Database } from "@/lib/supabase/database.types";

type Tables = Database["public"]["Tables"];
export type AppointmentRow = Tables["appointments"]["Row"];

export interface QuestionsData {
  questions: QuestionRecord[];
  nextAppointment: Pick<AppointmentRow, "doctor_name" | "clinic_name" | "scheduled_at"> | null;
}

/**
 * `suggested_questions`' `week_min`/`week_max` are both `not null` (unlike
 * `content_items`, which needs the null-means-unbounded `.or()` dance seen in
 * `getTodayData`), so a plain `.lte()`/`.gte()` range filter is exact here.
 * Locale uses the same plain-filter-no-fallback choice Session 18 made for
 * Today's reading cards: a week with nothing seeded in her language just
 * shows fewer seeded questions, never a silent cross-language substitution.
 */
export async function getQuestionsData({
  currentWeek,
  locale,
}: {
  currentWeek: number;
  locale: Locale;
}): Promise<QuestionsData> {
  const supabase = await createServerSupabase();
  const today = new Date().toISOString();

  const [suggested, marks, custom, nextAppointment] = await Promise.all([
    supabase
      .from("suggested_questions")
      .select("id, body, priority")
      .eq("locale", locale)
      .eq("is_active", true)
      .lte("week_min", currentWeek)
      .gte("week_max", currentWeek),
    supabase.from("question_marks").select("suggested_question_id"),
    supabase.from("custom_questions").select("id, body, is_marked, created_at").order("created_at", { ascending: true }),
    supabase
      .from("appointments")
      .select("doctor_name, clinic_name, scheduled_at")
      .eq("status", "upcoming")
      .gte("scheduled_at", today)
      .order("scheduled_at", { ascending: true })
      .limit(1)
      .maybeSingle(),
  ]);

  const failed = [suggested, marks, custom, nextAppointment].find((result) => result.error);
  if (failed?.error) throw failed.error;

  const questions = selectQuestions({
    suggested: suggested.data ?? [],
    custom: custom.data ?? [],
    markedSuggestedIds: new Set((marks.data ?? []).map((row) => row.suggested_question_id)),
  });

  return {
    questions,
    nextAppointment: nextAppointment.data,
  };
}

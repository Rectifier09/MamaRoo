"use server";

import { revalidatePath } from "next/cache";
import { validateQuestionBody, type QuestionBodyValidationError, type QuestionRecord } from "@/lib/domain/questions";
import { createServerSupabase } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

type CustomQuestionRow = Database["public"]["Tables"]["custom_questions"]["Row"];
type CustomQuestionSelection = Pick<CustomQuestionRow, "id" | "body" | "is_marked" | "created_at">;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CUSTOM_QUESTION_COLUMNS = "id,body,is_marked,created_at";

type FieldErrors = {
  body?: QuestionBodyValidationError;
  questionId?: "invalid";
};

export type SaveCustomQuestionResult =
  | { ok: true; question: QuestionRecord }
  | { ok: false; errors: FieldErrors }
  | { ok: false; error: string };

export type DeleteCustomQuestionResult =
  | { ok: true }
  | { ok: false; errors: { questionId: "invalid" } }
  | { ok: false; error: string };

export type ToggleMarkResult =
  | { ok: true; marked: boolean }
  | { ok: false; errors: { questionId: "invalid" } }
  | { ok: false; error: string };

function toCustomQuestion(row: CustomQuestionSelection): QuestionRecord {
  return {
    id: row.id,
    text: row.body,
    kind: "custom",
    marked: row.is_marked,
    createdAt: row.created_at,
  };
}

export async function createCustomQuestion(input: { body: unknown }): Promise<SaveCustomQuestionResult> {
  const validated = validateQuestionBody(input.body);
  if (!validated.ok) return { ok: false, errors: { body: validated.error } };

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "not_authenticated" };

  const { data, error } = await supabase
    .from("custom_questions")
    .insert({ user_id: user.id, body: validated.value })
    .select(CUSTOM_QUESTION_COLUMNS)
    .single();
  if (error) return { ok: false, error: error.message };

  revalidatePath("/care/questions");
  return { ok: true, question: toCustomQuestion(data) };
}

export async function updateCustomQuestion(input: {
  questionId: unknown;
  body: unknown;
}): Promise<SaveCustomQuestionResult> {
  if (typeof input.questionId !== "string" || !UUID.test(input.questionId)) {
    return { ok: false, errors: { questionId: "invalid" } };
  }
  const validated = validateQuestionBody(input.body);
  if (!validated.ok) return { ok: false, errors: { body: validated.error } };

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "not_authenticated" };

  const { data, error } = await supabase
    .from("custom_questions")
    .update({ body: validated.value })
    .eq("id", input.questionId)
    .eq("user_id", user.id)
    .select(CUSTOM_QUESTION_COLUMNS)
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "question_not_found" };

  revalidatePath("/care/questions");
  return { ok: true, question: toCustomQuestion(data) };
}

export async function deleteCustomQuestion(input: { questionId: unknown }): Promise<DeleteCustomQuestionResult> {
  if (typeof input.questionId !== "string" || !UUID.test(input.questionId)) {
    return { ok: false, errors: { questionId: "invalid" } };
  }

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "not_authenticated" };

  const { data, error } = await supabase
    .from("custom_questions")
    .delete()
    .eq("id", input.questionId)
    .eq("user_id", user.id)
    .select("id")
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "question_not_found" };

  revalidatePath("/care/questions");
  return { ok: true };
}

export async function toggleCustomQuestionMark(input: {
  questionId: unknown;
  marked: boolean;
}): Promise<ToggleMarkResult> {
  if (typeof input.questionId !== "string" || !UUID.test(input.questionId)) {
    return { ok: false, errors: { questionId: "invalid" } };
  }

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "not_authenticated" };

  const { data, error } = await supabase
    .from("custom_questions")
    .update({ is_marked: input.marked })
    .eq("id", input.questionId)
    .eq("user_id", user.id)
    .select("is_marked")
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "question_not_found" };

  revalidatePath("/care/questions");
  return { ok: true, marked: data.is_marked };
}

/**
 * `suggested_questions` is shared content, so marking one doesn't update the
 * question row itself -- it writes (or removes) her own row in the
 * `question_marks` join table. `question_marks` has no update policy
 * (Migration 3), so unmarking is a delete, not a `marked: false` update.
 */
export async function toggleSuggestedQuestionMark(input: {
  questionId: unknown;
  marked: boolean;
}): Promise<ToggleMarkResult> {
  if (typeof input.questionId !== "string" || !UUID.test(input.questionId)) {
    return { ok: false, errors: { questionId: "invalid" } };
  }

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "not_authenticated" };

  if (input.marked) {
    const { error } = await supabase
      .from("question_marks")
      .upsert(
        { user_id: user.id, suggested_question_id: input.questionId },
        { onConflict: "user_id,suggested_question_id", ignoreDuplicates: true },
      );
    if (error) return { ok: false, error: error.message };
  } else {
    const { error } = await supabase
      .from("question_marks")
      .delete()
      .eq("user_id", user.id)
      .eq("suggested_question_id", input.questionId);
    if (error) return { ok: false, error: error.message };
  }

  revalidatePath("/care/questions");
  return { ok: true, marked: input.marked };
}

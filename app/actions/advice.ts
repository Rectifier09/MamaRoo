"use server";

import { revalidatePath } from "next/cache";
import {
  isAdviceType,
  normalizeDoctorName,
  validateAdviceBody,
  type AdviceBodyValidationError,
  type AdviceRecord,
  type AdviceUpdateRecord,
} from "@/lib/domain/advice";
import { createServerSupabase } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

type AdviceUpdateRow = Database["public"]["Tables"]["doctor_advice_updates"]["Row"];
type AdviceUpdateSelection = Pick<AdviceUpdateRow, "id" | "body" | "doctor_name" | "created_at">;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const UPDATE_COLUMNS = "id,body,doctor_name,created_at";

function toUpdate(row: AdviceUpdateSelection): AdviceUpdateRecord {
  return { id: row.id, body: row.body, doctorName: row.doctor_name, createdAt: row.created_at };
}

type CreateAdviceFieldErrors = { type?: "invalid"; body?: AdviceBodyValidationError };

export type CreateAdviceResult =
  | { ok: true; advice: AdviceRecord }
  | { ok: false; errors: CreateAdviceFieldErrors }
  | { ok: false; error: string };

export async function createAdvice(input: {
  type: unknown;
  body: unknown;
  doctorName?: unknown;
}): Promise<CreateAdviceResult> {
  if (!isAdviceType(input.type)) return { ok: false, errors: { type: "invalid" } };
  const validated = validateAdviceBody(input.body);
  if (!validated.ok) return { ok: false, errors: { body: validated.error } };

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "not_authenticated" };

  const { data: advice, error: adviceError } = await supabase
    .from("doctor_advice")
    .insert({ user_id: user.id, type: input.type, is_reminder: false })
    .select("id,type,is_reminder")
    .single();
  if (adviceError) return { ok: false, error: adviceError.message };

  const doctorName = normalizeDoctorName(input.doctorName);
  const { data: update, error: updateError } = await supabase
    .from("doctor_advice_updates")
    .insert({
      user_id: user.id,
      advice_id: advice.id,
      body: validated.value,
      doctor_name: doctorName,
      input_method: "text",
    })
    .select(UPDATE_COLUMNS)
    .single();
  if (updateError) {
    // The thread header saved but its first entry didn't -- remove the orphan
    // rather than leaving a card with no text on it.
    await supabase.from("doctor_advice").delete().eq("id", advice.id);
    return { ok: false, error: updateError.message };
  }

  revalidatePath("/care/advice");
  return {
    ok: true,
    advice: {
      id: advice.id,
      type: advice.type as AdviceRecord["type"],
      isReminder: advice.is_reminder,
      updates: [toUpdate(update)],
    },
  };
}

type AddAdviceUpdateFieldErrors = { adviceId?: "invalid"; body?: AdviceBodyValidationError };

export type AddAdviceUpdateResult =
  | { ok: true; update: AdviceUpdateRecord; isReminder: false }
  | { ok: false; errors: AddAdviceUpdateFieldErrors }
  | { ok: false; error: string };

export async function addAdviceUpdate(input: {
  adviceId: unknown;
  body: unknown;
  doctorName?: unknown;
}): Promise<AddAdviceUpdateResult> {
  if (typeof input.adviceId !== "string" || !UUID.test(input.adviceId)) {
    return { ok: false, errors: { adviceId: "invalid" } };
  }
  const validated = validateAdviceBody(input.body);
  if (!validated.ok) return { ok: false, errors: { body: validated.error } };

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "not_authenticated" };

  // A new update always reopens confirmation -- reset first, both to confirm
  // this thread is hers and because a stale "confirmed" reminder must not
  // survive new advice she hasn't acknowledged yet.
  const { data: owned, error: resetError } = await supabase
    .from("doctor_advice")
    .update({ is_reminder: false })
    .eq("id", input.adviceId)
    .eq("user_id", user.id)
    .select("id")
    .maybeSingle();
  if (resetError) return { ok: false, error: resetError.message };
  if (!owned) return { ok: false, error: "advice_not_found" };

  const doctorName = normalizeDoctorName(input.doctorName);
  const { data, error } = await supabase
    .from("doctor_advice_updates")
    .insert({
      user_id: user.id,
      advice_id: input.adviceId,
      body: validated.value,
      doctor_name: doctorName,
      input_method: "text",
    })
    .select(UPDATE_COLUMNS)
    .single();
  if (error) return { ok: false, error: error.message };

  revalidatePath("/care/advice");
  return { ok: true, update: toUpdate(data), isReminder: false };
}

export type ToggleAdviceReminderResult =
  | { ok: true; isReminder: boolean }
  | { ok: false; errors: { adviceId: "invalid" } }
  | { ok: false; error: string };

export async function toggleAdviceReminder(input: {
  adviceId: unknown;
  isReminder: boolean;
}): Promise<ToggleAdviceReminderResult> {
  if (typeof input.adviceId !== "string" || !UUID.test(input.adviceId)) {
    return { ok: false, errors: { adviceId: "invalid" } };
  }

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "not_authenticated" };

  const { data, error } = await supabase
    .from("doctor_advice")
    .update({ is_reminder: input.isReminder })
    .eq("id", input.adviceId)
    .eq("user_id", user.id)
    .select("id,is_reminder")
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "advice_not_found" };

  revalidatePath("/care/advice");
  return { ok: true, isReminder: data.is_reminder };
}

"use server";

import { revalidatePath } from "next/cache";
import {
  validateBabyNames,
  type BabyNameValidationError,
} from "@/lib/domain/babyNames";
import { createServerSupabase } from "@/lib/supabase/server";

type FieldErrors = {
  names?: BabyNameValidationError;
  babyNameId?: "invalid";
  favorite?: "invalid";
};

export type SaveBabyNamesResult =
  | { ok: true; names: string[] }
  | { ok: false; errors: FieldErrors }
  | { ok: false; error: string };

export type SetBabyNameFavoriteResult =
  | { ok: true }
  | { ok: false; errors: FieldErrors }
  | { ok: false; error: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function saveBabyNames(input: { names: unknown }): Promise<SaveBabyNamesResult> {
  const initial = validateBabyNames({ names: input.names as string[], babyCount: 2 });
  if (!initial.ok) return { ok: false, errors: { names: initial.error } };

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "not_authenticated" };

  const { data: pregnancy, error: pregnancyError } = await supabase
    .from("pregnancies")
    .select("id,pregnancy_flags")
    .eq("status", "active")
    .maybeSingle();
  if (pregnancyError) return { ok: false, error: pregnancyError.message };
  if (!pregnancy) return { ok: false, error: "pregnancy_not_found" };

  const babyCount: 1 | 2 = pregnancy.pregnancy_flags.includes("twins") ? 2 : 1;
  const validated = validateBabyNames({ names: initial.value, babyCount });
  if (!validated.ok) return { ok: false, errors: { names: validated.error } };

  const { error } = await supabase
    .from("pregnancies")
    .update({ baby_name: validated.value })
    .eq("id", pregnancy.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/baby/name");
  return { ok: true, names: validated.value };
}

export async function setBabyNameFavorite(input: {
  babyNameId: string;
  favorite: boolean;
}): Promise<SetBabyNameFavoriteResult> {
  if (!UUID.test(input.babyNameId)) {
    return { ok: false, errors: { babyNameId: "invalid" } };
  }
  if (typeof input.favorite !== "boolean") {
    return { ok: false, errors: { favorite: "invalid" } };
  }

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "not_authenticated" };

  const result = input.favorite
    ? await supabase.from("baby_name_favorites").insert({
        user_id: user.id,
        baby_name_id: input.babyNameId,
      })
    : await supabase
        .from("baby_name_favorites")
        .delete()
        .eq("user_id", user.id)
        .eq("baby_name_id", input.babyNameId);
  if (result.error) return { ok: false, error: result.error.message };

  revalidatePath("/baby/name");
  return { ok: true };
}

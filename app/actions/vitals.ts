"use server";

import { revalidatePath } from "next/cache";
import { plausibility, type VitalKind } from "@/lib/domain/vitals";
import { createServerSupabase } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

type VitalRow = Database["public"]["Tables"]["vitals"]["Row"];

export interface AddVitalInput {
  kind: VitalKind;
  measuredOn: string;
  value1: number;
  value2?: number;
}

export type AddVitalResult =
  | { ok: true; vital: VitalRow }
  | { ok: true; vital: VitalRow; warnKey: string }
  | { ok: false; error: string; field?: string };

function revalidateVitals() {
  revalidatePath("/care/vitals");
  revalidatePath("/care");
  revalidatePath("/care/summary");
}

export async function addVital(input: AddVitalInput): Promise<AddVitalResult> {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "not_authenticated" };

  // Defense in depth: the same bounds the client already checked, re-checked
  // server-side, mirroring the database's own CHECK constraints exactly
  // (supabase/migrations/0004_care.sql) so a client bypass is still refused.
  const check = plausibility({
    kind: input.kind,
    value1: input.value1,
    ...(input.value2 !== undefined ? { value2: input.value2 } : {}),
  });
  if (!check.ok) return { ok: false, error: check.messageKey, field: check.field };

  const { data, error } = await supabase
    .from("vitals")
    .insert({
      user_id: user.id,
      kind: input.kind,
      measured_on: input.measuredOn,
      value_1: input.value1,
      value_2: input.kind === "bp" ? (input.value2 ?? null) : null,
    })
    .select("*")
    .single();
  if (error || !data) return { ok: false, error: error?.message ?? "unknown" };

  revalidateVitals();

  if ("warnKey" in check) return { ok: true, vital: data, warnKey: check.warnKey };
  return { ok: true, vital: data };
}

"use server";

import { createServerSupabase } from "@/lib/supabase/server";
import { getLocale } from "@/i18n/locale";
import { triage, type SymptomRule, type Severity } from "@/lib/domain/triage";

export interface CheckinGuidance {
  title: string;
  body: string;
}

/** The full symptom_rules row: triage() only needs SymptomRule's fields, but
 * guidance_title/guidance_body (Gate B content, reviewed per rule) live on
 * the same row and are read once the matching rule is known. */
type SymptomRuleRow = SymptomRule & { guidance_title: string; guidance_body: string };

export type SaveCheckinResult =
  | { ok: true; severity: Severity | null; guidance: CheckinGuidance | null }
  | { ok: false; error: string };

/**
 * Runs triage() server-side against the same rules the client already showed
 * (Session 18.7/19's offline path passes cached rules to the client; this
 * action re-fetches and re-runs the same deterministic function so the
 * stored record always matches what she was shown, even if her cached copy
 * of the rules is stale). Stores severity, matched_rule_id and feeling
 * alongside the body -- feeling is the optional chip tapped on Today
 * (Session 18.2), never a triage input.
 */
export async function saveCheckin(input: {
  body: string;
  inputMethod: "text" | "voice";
  feeling: "good" | "new" | "worried" | null;
}): Promise<SaveCheckinResult> {
  const trimmed = input.body.trim();
  if (!trimmed) return { ok: false, error: "empty_body" };

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "not_authenticated" };

  const locale = await getLocale();
  const { data: rows, error: rulesError } = await supabase
    .from("symptom_rules")
    .select("*")
    .eq("locale", locale)
    .eq("is_active", true);
  if (rulesError) return { ok: false, error: rulesError.message };

  const rules: SymptomRuleRow[] = (rows ?? []) as SymptomRuleRow[];
  const result = triage({ text: trimmed, rules });

  // symptom_rules carries reviewed guidance_title/guidance_body per row (Gate B
  // content, not i18n keys -- the product owner's review is per-rule, not
  // per-app-string), so guidance comes straight off the matched row.
  const matchedRule = result.matchedRuleId ? rules.find((r) => r.id === result.matchedRuleId) : undefined;
  const guidance: CheckinGuidance | null = matchedRule
    ? { title: matchedRule.guidance_title, body: matchedRule.guidance_body }
    : null;

  const { error: insertError } = await supabase.from("checkins").insert({
    user_id: user.id,
    body: trimmed,
    input_method: input.inputMethod,
    severity: result.severity,
    matched_rule_id: result.matchedRuleId,
    feeling: input.feeling,
  });
  if (insertError) return { ok: false, error: insertError.message };

  return { ok: true, severity: result.severity, guidance };
}

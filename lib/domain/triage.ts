import type { Severity } from "@/lib/domain/severity";

export type { Severity };

export interface SymptomRule {
  id: string;
  match_terms: string[];
  severity: Severity;
  priority: number;
  is_active?: boolean;
}

export interface TriageResult {
  severity: Severity | null;
  matchedRuleId: string | null;
}

const SEVERITY_RANK: Record<Severity, number> = { general: 1, contact_clinic: 2, urgent: 3 };

function normalise(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

const LATIN_ONLY = /^[a-z\s'-]+$/;

function containsTerm(haystack: string, term: string): boolean {
  const needle = normalise(term);
  if (needle === "") return false;

  // Latin terms get word boundaries so "tired" does not match "retired".
  // Devanagari has no ASCII word characters, so \b is useless there; substring
  // matching on a whitespace-normalised string is the correct behaviour.
  if (LATIN_ONLY.test(needle)) {
    const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(^|[^\\p{L}])${escaped}($|[^\\p{L}])`, "u").test(haystack);
  }
  return haystack.includes(needle);
}

/**
 * Deterministic rule matching. No model, no inference, no guessing. Rules and
 * their severities are reviewed content supplied by the product owner; this
 * function only decides which of them the text matches.
 */
export function triage({ text, rules }: { text: string; rules: SymptomRule[] }): TriageResult {
  const haystack = normalise(text);
  if (haystack === "") return { severity: null, matchedRuleId: null };

  const active = rules.filter((r) => r.is_active !== false);

  const matches = active.filter((rule) => rule.match_terms.some((term) => containsTerm(haystack, term)));
  if (matches.length === 0) return { severity: null, matchedRuleId: null };

  matches.sort((a, b) => {
    const bySeverity = SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity];
    return bySeverity !== 0 ? bySeverity : b.priority - a.priority;
  });

  const winner = matches[0]!;
  return { severity: winner.severity, matchedRuleId: winner.id };
}

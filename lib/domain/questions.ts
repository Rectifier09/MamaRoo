export const QUESTION_BODY_MAX_LENGTH = 500;

export type QuestionBodyValidationError = "invalid" | "empty" | "too_long";

export type QuestionBodyValidationResult =
  | { ok: true; value: string }
  | { ok: false; error: QuestionBodyValidationError };

export function validateQuestionBody(body: unknown): QuestionBodyValidationResult {
  if (typeof body !== "string") return { ok: false, error: "invalid" };
  const value = body.trim();
  if (!value) return { ok: false, error: "empty" };
  if (value.length > QUESTION_BODY_MAX_LENGTH) return { ok: false, error: "too_long" };
  return { ok: true, value };
}

/**
 * A merged row for the screen to render. `kind` is what tells the screen
 * whether edit/remove make sense: `suggested` rows come from the shared,
 * admin-owned `suggested_questions` content and can only be marked, never
 * edited or deleted; `custom` rows are hers alone and support the full
 * write path. Both kinds share one `marked` flag even though it lives in two
 * different places underneath (a `question_marks` join row for suggested
 * questions, an `is_marked` column for custom ones) -- the Visit Summary
 * reads both sources, but the screen doesn't need to know that.
 */
export interface QuestionRecord {
  id: string;
  text: string;
  kind: "suggested" | "custom";
  marked: boolean;
  createdAt: string | null;
}

export interface SuggestedQuestionRow {
  id: string;
  body: string;
  priority: number;
}

export interface CustomQuestionRow {
  id: string;
  body: string;
  is_marked: boolean;
  created_at: string;
}

/**
 * Seeded questions lead the list, ordered by their curated `priority` (lowest
 * first, matching `symptom_rules`'s convention elsewhere in the schema); her
 * own questions follow in the order she added them, so a new one she types
 * appends to the bottom the way the design's composer row implies.
 */
export function selectQuestions({
  suggested,
  custom,
  markedSuggestedIds,
}: {
  suggested: SuggestedQuestionRow[];
  custom: CustomQuestionRow[];
  markedSuggestedIds: ReadonlySet<string>;
}): QuestionRecord[] {
  const suggestedRecords = [...suggested]
    .sort((a, b) => a.priority - b.priority)
    .map(
      (row): QuestionRecord => ({
        id: row.id,
        text: row.body,
        kind: "suggested",
        marked: markedSuggestedIds.has(row.id),
        createdAt: null,
      }),
    );

  const customRecords = [...custom]
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    .map(
      (row): QuestionRecord => ({
        id: row.id,
        text: row.body,
        kind: "custom",
        marked: row.is_marked,
        createdAt: row.created_at,
      }),
    );

  return [...suggestedRecords, ...customRecords];
}

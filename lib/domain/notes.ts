export const NOTE_BODY_MAX_LENGTH = 4000;

export interface NoteRecord {
  id: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}

export type NoteBodyValidationError = "invalid" | "empty" | "too_long";

export type NoteBodyValidationResult =
  | { ok: true; value: string }
  | { ok: false; error: NoteBodyValidationError };

export function validateNoteBody(body: unknown): NoteBodyValidationResult {
  if (typeof body !== "string") return { ok: false, error: "invalid" };
  const value = body.trim();
  if (!value) return { ok: false, error: "empty" };
  if (value.length > NOTE_BODY_MAX_LENGTH) return { ok: false, error: "too_long" };
  return { ok: true, value };
}

/** Collapses a note's full text to one line for its card preview. */
export function notePreview(body: string, maxLength = 96): string {
  const collapsed = body.replace(/\s+/g, " ").trim();
  if (maxLength < 2 || collapsed.length <= maxLength) return collapsed.slice(0, maxLength);
  return `${collapsed.slice(0, maxLength - 1).trimEnd()}…`;
}

export function sortNotesByRecency(notes: NoteRecord[]): NoteRecord[] {
  return [...notes].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

"use server";

import { revalidatePath } from "next/cache";
import {
  validateNoteBody,
  type NoteBodyValidationError,
  type NoteRecord,
} from "@/lib/domain/notes";
import { createServerSupabase } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

type NoteRow = Database["public"]["Tables"]["personal_notes"]["Row"];
type NoteSelection = Pick<NoteRow, "id" | "body" | "created_at" | "updated_at">;

type FieldErrors = {
  body?: NoteBodyValidationError;
  noteId?: "invalid";
};

export type SaveNoteResult =
  | { ok: true; note: NoteRecord }
  | { ok: false; errors: FieldErrors }
  | { ok: false; error: string };

export type DeleteNoteResult =
  | { ok: true }
  | { ok: false; errors: { noteId: "invalid" } }
  | { ok: false; error: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const NOTE_COLUMNS = "id,body,created_at,updated_at";

function toNote(row: NoteSelection): NoteRecord {
  return {
    id: row.id,
    body: row.body,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function createNote(input: { body: unknown }): Promise<SaveNoteResult> {
  const validated = validateNoteBody(input.body);
  if (!validated.ok) return { ok: false, errors: { body: validated.error } };

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "not_authenticated" };

  const { data, error } = await supabase
    .from("personal_notes")
    .insert({ user_id: user.id, body: validated.value })
    .select(NOTE_COLUMNS)
    .single();
  if (error) return { ok: false, error: error.message };

  revalidatePath("/care/notes");
  return { ok: true, note: toNote(data) };
}

export async function updateNote(input: {
  noteId: unknown;
  body: unknown;
}): Promise<SaveNoteResult> {
  if (typeof input.noteId !== "string" || !UUID.test(input.noteId)) {
    return { ok: false, errors: { noteId: "invalid" } };
  }
  const validated = validateNoteBody(input.body);
  if (!validated.ok) return { ok: false, errors: { body: validated.error } };

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "not_authenticated" };

  const { data, error } = await supabase
    .from("personal_notes")
    .update({ body: validated.value })
    .eq("id", input.noteId)
    .eq("user_id", user.id)
    .select(NOTE_COLUMNS)
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "note_not_found" };

  revalidatePath("/care/notes");
  return { ok: true, note: toNote(data) };
}

export async function deleteNote(input: { noteId: unknown }): Promise<DeleteNoteResult> {
  if (typeof input.noteId !== "string" || !UUID.test(input.noteId)) {
    return { ok: false, errors: { noteId: "invalid" } };
  }

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "not_authenticated" };

  const { data, error } = await supabase
    .from("personal_notes")
    .delete()
    .eq("id", input.noteId)
    .eq("user_id", user.id)
    .select("id")
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "note_not_found" };

  revalidatePath("/care/notes");
  return { ok: true };
}

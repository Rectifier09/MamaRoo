import type { NoteRecord } from "@/lib/domain/notes";
import { createServerSupabase } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

type NoteRow = Database["public"]["Tables"]["personal_notes"]["Row"];

export async function getNotesData(): Promise<NoteRecord[]> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("personal_notes")
    .select("id,body,created_at,updated_at")
    .order("created_at", { ascending: false });
  if (error) throw error;

  return ((data ?? []) as NoteRow[]).map((row) => ({
    id: row.id,
    body: row.body,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

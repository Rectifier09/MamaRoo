import { NotesScreen } from "@/app/(app)/care/notes/NotesScreen";
import { getNotesData } from "@/lib/supabase/queries/notes";

export default async function CareNotesPage() {
  const notes = await getNotesData();

  return <NotesScreen initialNotes={notes} />;
}

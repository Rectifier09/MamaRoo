import type { Locale } from "@/lib/config";
import type { BabyNameOption } from "@/lib/domain/babyNames";
import { createServerSupabase } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

type Tables = Database["public"]["Tables"];
type Pregnancy = Pick<Tables["pregnancies"]["Row"], "id" | "baby_name" | "pregnancy_flags">;
type CatalogRow = Tables["baby_names"]["Row"];

export interface BabyNamesData {
  pregnancy: Pregnancy | null;
  names: BabyNameOption[];
  favoriteIds: string[];
}

export async function getBabyNamesData({ locale }: { locale: Locale }): Promise<BabyNamesData> {
  const supabase = await createServerSupabase();
  const [pregnancy, catalog, favorites] = await Promise.all([
    supabase
      .from("pregnancies")
      .select("id,baby_name,pregnancy_flags")
      .eq("status", "active")
      .maybeSingle(),
    supabase
      .from("baby_names")
      .select("id,name,meaning_en,meaning_hi,sort_order,is_active,created_at")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),
    supabase.from("baby_name_favorites").select("baby_name_id"),
  ]);

  const failed = [pregnancy, catalog, favorites].find((result) => result.error);
  if (failed?.error) throw failed.error;

  return {
    pregnancy: pregnancy.data,
    names: ((catalog.data ?? []) as CatalogRow[]).map((row) => ({
      id: row.id,
      name: row.name,
      meaning: locale === "hi" ? row.meaning_hi : row.meaning_en,
    })),
    favoriteIds: (favorites.data ?? []).map((favorite) => favorite.baby_name_id),
  };
}

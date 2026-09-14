import type { Locale } from "@/lib/config";
import type { BabyNameOption } from "@/lib/domain/babyNames";
import { createServerSupabase } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

type Tables = Database["public"]["Tables"];
type Pregnancy = Pick<Tables["pregnancies"]["Row"], "id" | "baby_name" | "pregnancy_flags">;
type CatalogRow = Tables["baby_names"]["Row"];
type FavoriteJoinRow = { baby_names: Pick<CatalogRow, "id" | "name" | "meaning_en" | "meaning_hi"> | null };

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

/**
 * The Baby tab home screen's compact preview -- most-recently-favorited
 * first, capped small because the bento card only has room for a couple of
 * names before it needs truncating (Session 33 follow-up). The full list
 * lives at /baby/name, which this always links to regardless of count.
 */
export async function getFavoriteBabyNames({
  locale,
  limit = 3,
}: {
  locale: Locale;
  limit?: number;
}): Promise<BabyNameOption[]> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("baby_name_favorites")
    .select("baby_names(id,name,meaning_en,meaning_hi)")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;

  return ((data ?? []) as unknown as FavoriteJoinRow[])
    .map((row) => row.baby_names)
    .filter((row): row is NonNullable<FavoriteJoinRow["baby_names"]> => row !== null)
    .map((row) => ({ id: row.id, name: row.name, meaning: locale === "hi" ? row.meaning_hi : row.meaning_en }));
}

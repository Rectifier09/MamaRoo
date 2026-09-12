import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveLocalisedContent } from "@/lib/domain/content";
import type { Locale } from "@/lib/config";
import type { Database } from "@/lib/supabase/database.types";

export type ContentItemRow = Database["public"]["Tables"]["content_items"]["Row"];

export async function getContentItem({
  supabase,
  slug,
  locale,
}: {
  supabase: SupabaseClient<Database>;
  slug: string;
  locale: Locale;
}): Promise<{ item: ContentItemRow; isFallback: boolean } | null> {
  const { data, error } = await supabase
    .from("content_items")
    .select("*")
    .eq("slug", slug)
    .eq("is_published", true);
  if (error) throw error;
  if (!data || data.length === 0) return null;
  return resolveLocalisedContent({
    items: data as Array<ContentItemRow & { locale: Locale }>,
    locale,
  });
}

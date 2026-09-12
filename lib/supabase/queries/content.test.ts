import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getContentItem, type ContentItemRow } from "@/lib/supabase/queries/content";
import type { Database } from "@/lib/supabase/database.types";

const english: ContentItemRow = {
  id: "content-en",
  slug: "sleep-well",
  locale: "en",
  kind: "audio",
  title: "Sleep well",
  summary: null,
  body_md: null,
  media_url: null,
  narration_url: "/sleep.mp3",
  duration_seconds: 120,
  week_min: 10,
  week_max: 20,
  tags: [],
  is_published: true,
  created_at: "2026-09-01T00:00:00Z",
};

const hindi: ContentItemRow = { ...english, id: "content-hi", locale: "hi", title: "अच्छी नींद" };

function fakeClient(rows: ContentItemRow[]) {
  const filters: Array<[string, unknown]> = [];
  const query = {
    select: () => query,
    eq: (column: string, value: unknown) => {
      filters.push([column, value]);
      return query;
    },
    then: (resolve: (value: { data: ContentItemRow[]; error: null }) => unknown) => {
      const filtered = rows.filter((row) =>
        filters.every(([column, value]) => row[column as keyof ContentItemRow] === value),
      );
      return Promise.resolve({ data: filtered, error: null }).then(resolve);
    },
  };
  return { from: () => query } as unknown as SupabaseClient<Database>;
}

describe("getContentItem", () => {
  it("returns the requested locale", async () => {
    await expect(
      getContentItem({ supabase: fakeClient([english, hindi]), slug: "sleep-well", locale: "hi" }),
    ).resolves.toEqual({ item: hindi, isFallback: false });
  });

  it("falls back to English when Hindi is unavailable", async () => {
    await expect(
      getContentItem({ supabase: fakeClient([english]), slug: "sleep-well", locale: "hi" }),
    ).resolves.toEqual({ item: english, isFallback: true });
  });

  it("returns null for unknown or unpublished content", async () => {
    const unpublished = { ...english, id: "draft", slug: "draft", is_published: false };
    const supabase = fakeClient([english, unpublished]);

    await expect(getContentItem({ supabase, slug: "unknown", locale: "en" })).resolves.toBeNull();
    await expect(getContentItem({ supabase, slug: "draft", locale: "en" })).resolves.toBeNull();
  });
});

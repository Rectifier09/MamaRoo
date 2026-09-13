// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const { calls, createServerSupabase, responses } = vi.hoisted(() => ({
  calls: [] as Array<{ table: string; method: string; args: unknown[] }>,
  createServerSupabase: vi.fn(),
  responses: new Map<string, { data: unknown; error: unknown }>(),
}));

function queryFor(table: string) {
  const query = new Proxy(
    {},
    {
      get(_target, method: string) {
        if (method === "then") {
          return (resolve: (value: unknown) => unknown) =>
            Promise.resolve(responses.get(table) ?? { data: [], error: null }).then(resolve);
        }
        return (...args: unknown[]) => {
          calls.push({ table, method, args });
          return query;
        };
      },
    },
  );
  return query;
}

vi.mock("@/lib/supabase/server", () => ({ createServerSupabase }));

import { getBabyNamesData } from "@/lib/supabase/queries/babyNames";

beforeEach(() => {
  calls.length = 0;
  responses.clear();
  createServerSupabase.mockReset();
  createServerSupabase.mockResolvedValue({ from: (table: string) => queryFor(table) });
});

describe("getBabyNamesData", () => {
  it("fetches the active pregnancy, readable catalog, and caller favorites without a user-id filter", async () => {
    responses.set("pregnancies", { data: { id: "p1", baby_name: ["Aditi"], pregnancy_flags: [] }, error: null });
    responses.set("baby_names", { data: [{ id: "n1", name: "Aditi", meaning_en: "Boundless", meaning_hi: "असीम" }], error: null });
    responses.set("baby_name_favorites", { data: [{ baby_name_id: "n1" }], error: null });

    await expect(getBabyNamesData({ locale: "en" })).resolves.toEqual({
      pregnancy: { id: "p1", baby_name: ["Aditi"], pregnancy_flags: [] },
      names: [{ id: "n1", name: "Aditi", meaning: "Boundless" }],
      favoriteIds: ["n1"],
    });

    expect(calls).toEqual(expect.arrayContaining([
      { table: "pregnancies", method: "eq", args: ["status", "active"] },
      { table: "baby_names", method: "eq", args: ["is_active", true] },
      { table: "baby_names", method: "order", args: ["sort_order", { ascending: true }] },
    ]));
    expect(calls.some((call) => call.args[0] === "user_id")).toBe(false);
  });

  it("selects the Hindi meaning without changing the name", async () => {
    responses.set("pregnancies", { data: null, error: null });
    responses.set("baby_names", { data: [{ id: "n1", name: "Aditi", meaning_en: "Boundless", meaning_hi: "असीम" }], error: null });
    responses.set("baby_name_favorites", { data: [], error: null });
    const result = await getBabyNamesData({ locale: "hi" });
    expect(result.names).toEqual([{ id: "n1", name: "Aditi", meaning: "असीम" }]);
  });

  it("throws instead of returning partial data", async () => {
    responses.set("pregnancies", { data: null, error: new Error("query failed") });
    await expect(getBabyNamesData({ locale: "en" })).rejects.toThrow("query failed");
  });
});

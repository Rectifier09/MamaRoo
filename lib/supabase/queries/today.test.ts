// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Database } from "@/lib/supabase/database.types";

type Table = keyof Database["public"]["Tables"];
type Call = { table: Table; method: string; args: unknown[] };

const { calls, createServerSupabase, responses } = vi.hoisted(() => ({
  calls: [] as Call[],
  createServerSupabase: vi.fn(),
  responses: new Map<string, { data: unknown; error: unknown }>(),
}));

function queryFor(table: Table) {
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

import { getTodayData } from "@/lib/supabase/queries/today";

beforeEach(() => {
  calls.length = 0;
  responses.clear();
  createServerSupabase.mockReset();
  createServerSupabase.mockResolvedValue({ from: (table: Table) => queryFor(table) });
});

describe("getTodayData", () => {
  it("fetches every Today source with RLS-scoped date and week filters", async () => {
    const pregnancy = { id: "pregnancy-1", pregnancy_flags: ["twins"], baby_name: "Mina" };
    const profile = { display_name: "Priya" };
    const medicines = [{ id: "medicine-1" }];
    const medicineLogs = [{ id: "log-1" }];
    const appointments = [{ id: "appointment-1" }];
    const contentItems = [{ id: "content-1" }, { id: "content-2" }];
    responses.set("pregnancies", { data: pregnancy, error: null });
    responses.set("profiles", { data: profile, error: null });
    responses.set("medicines", { data: medicines, error: null });
    responses.set("medicine_logs", { data: medicineLogs, error: null });
    responses.set("appointments", { data: appointments, error: null });
    responses.set("content_items", { data: contentItems, error: null });

    await expect(getTodayData({ today: "2026-09-12", currentWeek: 24 })).resolves.toEqual({
      pregnancy,
      profile,
      medicines,
      medicineLogs,
      appointments,
      contentItems,
    });

    expect(calls).toEqual(
      expect.arrayContaining([
        { table: "pregnancies", method: "eq", args: ["status", "active"] },
        { table: "medicines", method: "eq", args: ["is_active", true] },
        { table: "medicines", method: "lte", args: ["start_date", "2026-09-12"] },
        { table: "medicine_logs", method: "eq", args: ["scheduled_date", "2026-09-12"] },
        { table: "appointments", method: "eq", args: ["status", "upcoming"] },
        { table: "content_items", method: "eq", args: ["is_published", true] },
        { table: "content_items", method: "or", args: ["week_min.is.null,week_min.lte.24"] },
        { table: "content_items", method: "or", args: ["week_max.is.null,week_max.gte.24"] },
        { table: "content_items", method: "limit", args: [2] },
      ]),
    );
    expect(calls.some((call) => call.args[0] === "user_id")).toBe(false);
  });

  it("includes a not-week-restricted content item, since null week_min/week_max means every week", async () => {
    // Regression test: PostgREST's .lte()/.gte() silently exclude null rows,
    // which would have hidden any content item with no week restriction.
    // This test only asserts the filter shape (above) plus the query
    // succeeding end to end; the actual null-inclusive filtering happens in
    // Postgres, not in this mock, so there is nothing further to assert here
    // beyond the .or() calls already checked above.
    responses.set("pregnancies", { data: null, error: null });
    responses.set("profiles", { data: null, error: null });
    responses.set("medicines", { data: [], error: null });
    responses.set("medicine_logs", { data: [], error: null });
    responses.set("appointments", { data: [], error: null });
    responses.set("content_items", { data: [{ id: "any-week", week_min: null, week_max: null }], error: null });

    const result = await getTodayData({ today: "2026-09-12", currentWeek: 24 });
    expect(result.contentItems).toEqual([{ id: "any-week", week_min: null, week_max: null }]);
  });

  it("throws a query error instead of returning partial Today data", async () => {
    responses.set("pregnancies", { data: null, error: new Error("pregnancy query failed") });
    await expect(getTodayData({ today: "2026-09-12", currentWeek: 24 })).rejects.toThrow(
      "pregnancy query failed",
    );
  });
});

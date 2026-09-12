// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

type ActivityTable = "checkins" | "medicine_logs";
type Call = { table: ActivityTable; method: string; args: unknown[] };

const { calls, createServerSupabase, responses } = vi.hoisted(() => ({
  calls: [] as Call[],
  createServerSupabase: vi.fn(),
  responses: new Map<string, { data: unknown; error: unknown }>(),
}));

function queryFor(table: ActivityTable) {
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

import { getRecentActivity } from "@/lib/supabase/queries/activity";

beforeEach(() => {
  calls.length = 0;
  responses.clear();
  createServerSupabase.mockReset();
  createServerSupabase.mockResolvedValue({ from: (table: ActivityTable) => queryFor(table) });
});

describe("getRecentActivity", () => {
  it("fetches 30 days of check-ins and medicine logs with medicine names", async () => {
    const checkins = [{ id: "checkin-1", feeling: "good" }];
    const medicineLogs = [{ id: "log-1", medicines: { name: "Iron" } }];
    responses.set("checkins", { data: checkins, error: null });
    responses.set("medicine_logs", { data: medicineLogs, error: null });

    await expect(getRecentActivity({ now: new Date("2026-09-12T12:00:00.000Z") })).resolves.toEqual(
      {
        checkins,
        medicineLogs,
        milestones: [],
        appointments: [],
        wellnessEvents: [],
      },
    );

    const cutoff = "2026-08-13T12:00:00.000Z";
    expect(calls).toEqual(
      expect.arrayContaining([
        { table: "checkins", method: "gte", args: ["created_at", cutoff] },
        { table: "checkins", method: "order", args: ["created_at", { ascending: false }] },
        { table: "medicine_logs", method: "select", args: ["*, medicines(name)"] },
        { table: "medicine_logs", method: "gte", args: ["logged_at", cutoff] },
        { table: "medicine_logs", method: "order", args: ["logged_at", { ascending: false }] },
      ]),
    );
    expect(calls.some((call) => call.args[0] === "user_id")).toBe(false);
  });

  it("throws a query error instead of returning partial activity", async () => {
    responses.set("medicine_logs", { data: null, error: new Error("logs query failed") });
    await expect(getRecentActivity()).rejects.toThrow("logs query failed");
  });
});

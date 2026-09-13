// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const { calls, createServerSupabase, responses } = vi.hoisted(() => ({
  calls: [] as Array<{ table: string; method: string; args: unknown[] }>,
  createServerSupabase: vi.fn(),
  responses: new Map<string, { data: unknown; error: unknown }>(),
}));

function queryFor(table: string) {
  return new Proxy(
    {},
    {
      get(_target, method: string) {
        if (method === "then") {
          return (resolve: (value: unknown) => unknown) =>
            Promise.resolve(responses.get(table) ?? { data: [], error: null }).then(resolve);
        }
        return (...args: unknown[]) => {
          calls.push({ table, method, args });
          return queryFor(table);
        };
      },
    },
  );
}

vi.mock("@/lib/supabase/server", () => ({ createServerSupabase }));

import { getAdviceData } from "@/lib/supabase/queries/advice";

beforeEach(() => {
  calls.length = 0;
  responses.clear();
  createServerSupabase.mockReset();
  createServerSupabase.mockResolvedValue({ from: (table: string) => queryFor(table) });
});

describe("getAdviceData", () => {
  it("fetches every advice thread and every update, newest thread first", async () => {
    responses.set("doctor_advice", {
      data: [{ id: "a1", type: "medicine", is_reminder: true }],
      error: null,
    });
    responses.set("doctor_advice_updates", {
      data: [{ id: "u1", advice_id: "a1", body: "Continue iron tablets", doctor_name: "Dr. Rao", created_at: "2026-09-02T00:00:00Z" }],
      error: null,
    });

    await expect(getAdviceData()).resolves.toEqual([
      {
        id: "a1",
        type: "medicine",
        isReminder: true,
        updates: [{ id: "u1", body: "Continue iron tablets", doctorName: "Dr. Rao", createdAt: "2026-09-02T00:00:00Z" }],
      },
    ]);
    expect(calls.some((call) => call.table === "doctor_advice" && call.args[0] === "user_id")).toBe(false);
  });

  it("throws instead of returning partial data when either query fails", async () => {
    responses.set("doctor_advice", { data: null, error: new Error("advice query failed") });
    await expect(getAdviceData()).rejects.toThrow("advice query failed");

    responses.set("doctor_advice", { data: [], error: null });
    responses.set("doctor_advice_updates", { data: null, error: new Error("updates query failed") });
    await expect(getAdviceData()).rejects.toThrow("updates query failed");
  });
});

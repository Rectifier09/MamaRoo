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

import { getQuestionsData } from "@/lib/supabase/queries/questions";

beforeEach(() => {
  calls.length = 0;
  responses.clear();
  createServerSupabase.mockReset();
  createServerSupabase.mockResolvedValue({ from: (table: Table) => queryFor(table) });
});

describe("getQuestionsData", () => {
  it("merges seeded, marked, and custom rows and surfaces the next appointment", async () => {
    responses.set("suggested_questions", {
      data: [{ id: "s1", body: "Is my baby's position normal?", priority: 100 }],
      error: null,
    });
    responses.set("question_marks", { data: [{ suggested_question_id: "s1" }], error: null });
    responses.set("custom_questions", {
      data: [{ id: "c1", body: "Can I keep travelling?", is_marked: false, created_at: "2026-09-01T00:00:00Z" }],
      error: null,
    });
    responses.set("appointments", {
      data: { doctor_name: "Dr Rao", clinic_name: "Sunrise Clinic", scheduled_at: "2026-10-01T09:00:00Z" },
      error: null,
    });

    await expect(getQuestionsData({ currentWeek: 20, locale: "en" })).resolves.toEqual({
      questions: [
        { id: "s1", text: "Is my baby's position normal?", kind: "suggested", marked: true, createdAt: null },
        { id: "c1", text: "Can I keep travelling?", kind: "custom", marked: false, createdAt: "2026-09-01T00:00:00Z" },
      ],
      nextAppointment: { doctor_name: "Dr Rao", clinic_name: "Sunrise Clinic", scheduled_at: "2026-10-01T09:00:00Z" },
    });

    expect(calls).toContainEqual({ table: "suggested_questions", method: "eq", args: ["locale", "en"] });
    expect(calls).toContainEqual({ table: "suggested_questions", method: "lte", args: ["week_min", 20] });
    expect(calls).toContainEqual({ table: "suggested_questions", method: "gte", args: ["week_max", 20] });
  });

  it("returns an empty list and a null appointment rather than throwing when nothing exists yet", async () => {
    responses.set("suggested_questions", { data: [], error: null });
    responses.set("question_marks", { data: [], error: null });
    responses.set("custom_questions", { data: [], error: null });
    responses.set("appointments", { data: null, error: null });

    await expect(getQuestionsData({ currentWeek: 8, locale: "en" })).resolves.toEqual({
      questions: [],
      nextAppointment: null,
    });
  });

  it("throws instead of returning partial data", async () => {
    responses.set("suggested_questions", { data: null, error: new Error("query failed") });
    responses.set("question_marks", { data: [], error: null });
    responses.set("custom_questions", { data: [], error: null });
    responses.set("appointments", { data: null, error: null });

    await expect(getQuestionsData({ currentWeek: 8, locale: "en" })).rejects.toThrow("query failed");
  });
});

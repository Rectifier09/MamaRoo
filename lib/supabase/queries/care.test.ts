// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Database } from "@/lib/supabase/database.types";

type Table = keyof Database["public"]["Tables"];
type Call = { table: Table; method: string; args: unknown[] };

const { calls, createServerSupabase, responses } = vi.hoisted(() => ({
  calls: [] as Call[],
  createServerSupabase: vi.fn(),
  responses: new Map<string, { data: unknown; error: unknown; count?: number }>(),
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

import { getCareHubData, getCareMedicinesData } from "@/lib/supabase/queries/care";

beforeEach(() => {
  calls.length = 0;
  responses.clear();
  createServerSupabase.mockReset();
  createServerSupabase.mockResolvedValue({ from: (table: Table) => queryFor(table) });
});

describe("getCareHubData", () => {
  it("fetches every hub source and shapes the result", async () => {
    const medicines = [{ id: "medicine-1" }];
    const medicineLogs = [{ id: "log-1" }];
    const nextAppointment = { id: "appt-1", title: "Checkup", doctor_name: "Dr Rao", scheduled_at: "2026-10-01" };
    const latestReport = { id: "report-1", report_type: "ultrasound", report_date: "2026-09-10" };
    const latestAdvice = { id: "advice-1", body: "Rest more" };
    const latestNote = { id: "note-1", body: "Felt the first kick today" };
    responses.set("medicines", { data: medicines, error: null });
    responses.set("medicine_logs", { data: medicineLogs, error: null });
    responses.set("appointments", { data: nextAppointment, error: null });
    responses.set("reports", { data: latestReport, error: null });
    responses.set("doctor_advice", { data: latestAdvice, error: null });
    responses.set("question_marks", { data: null, error: null, count: 3 });
    responses.set("personal_notes", { data: latestNote, error: null });

    await expect(getCareHubData()).resolves.toEqual({
      medicines,
      medicineLogs,
      nextAppointment,
      latestReport,
      latestAdvice,
      markedQuestionCount: 3,
      latestNote,
    });

    expect(calls).toEqual(
      expect.arrayContaining([
        { table: "medicines", method: "eq", args: ["is_active", true] },
        { table: "appointments", method: "eq", args: ["status", "upcoming"] },
      ]),
    );
  });

  it("returns nulls and a zero count rather than throwing when nothing exists yet", async () => {
    responses.set("medicines", { data: [], error: null });
    responses.set("medicine_logs", { data: [], error: null });
    responses.set("appointments", { data: null, error: null });
    responses.set("reports", { data: null, error: null });
    responses.set("doctor_advice", { data: null, error: null });
    responses.set("question_marks", { data: null, error: null, count: 0 });
    responses.set("personal_notes", { data: null, error: null });

    const result = await getCareHubData();
    expect(result.nextAppointment).toBeNull();
    expect(result.latestReport).toBeNull();
    expect(result.latestAdvice).toBeNull();
    expect(result.markedQuestionCount).toBe(0);
    expect(result.latestNote).toBeNull();
  });

  it("throws a query error instead of returning partial hub data", async () => {
    responses.set("medicines", { data: null, error: new Error("medicines query failed") });
    await expect(getCareHubData()).rejects.toThrow("medicines query failed");
  });
});

describe("getCareMedicinesData", () => {
  it("fetches active medicines and every log", async () => {
    const medicines = [{ id: "medicine-1" }];
    const logs = [{ id: "log-1" }];
    responses.set("medicines", { data: medicines, error: null });
    responses.set("medicine_logs", { data: logs, error: null });

    await expect(getCareMedicinesData()).resolves.toEqual({ medicines, logs });
    expect(calls).toEqual(
      expect.arrayContaining([{ table: "medicines", method: "eq", args: ["is_active", true] }]),
    );
  });
});

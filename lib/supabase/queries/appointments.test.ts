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

import { getAppointmentsData } from "@/lib/supabase/queries/appointments";

beforeEach(() => {
  calls.length = 0;
  responses.clear();
  createServerSupabase.mockReset();
  createServerSupabase.mockResolvedValue({ from: (table: Table) => queryFor(table) });
});

describe("getAppointmentsData", () => {
  it("fetches every appointment and her profile's default doctor/clinic", async () => {
    const appointments = [{ id: "a1" }];
    const profile = { doctor_name: "Dr. Priya Sharma", clinic_name: "Sunrise Clinic" };
    responses.set("appointments", { data: appointments, error: null });
    responses.set("profiles", { data: profile, error: null });

    await expect(getAppointmentsData()).resolves.toEqual({ appointments, profile });
    expect(calls).toEqual(expect.arrayContaining([{ table: "appointments", method: "order", args: ["scheduled_at", { ascending: true }] }]));
  });

  it("returns a null profile rather than throwing when none exists yet", async () => {
    responses.set("appointments", { data: [], error: null });
    responses.set("profiles", { data: null, error: null });
    const result = await getAppointmentsData();
    expect(result.profile).toBeNull();
  });

  it("throws a query error instead of returning partial data", async () => {
    responses.set("appointments", { data: null, error: new Error("appointments query failed") });
    await expect(getAppointmentsData()).rejects.toThrow("appointments query failed");
  });
});

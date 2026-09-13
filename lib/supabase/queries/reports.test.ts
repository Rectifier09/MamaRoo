// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const { calls, createServerSupabase, response } = vi.hoisted(() => ({
  calls: [] as Array<{ method: string; args: unknown[] }>,
  createServerSupabase: vi.fn(),
  response: { data: [] as unknown[], error: null as unknown },
}));

vi.mock("@/lib/supabase/server", () => ({ createServerSupabase }));

import { getReportsData } from "@/lib/supabase/queries/reports";

beforeEach(() => {
  calls.length = 0;
  response.data = [];
  response.error = null;
  const query = new Proxy({}, {
    get(_target, method: string) {
      if (method === "then") {
        return (resolve: (value: unknown) => unknown) => Promise.resolve(response).then(resolve);
      }
      return (...args: unknown[]) => {
        calls.push({ method, args });
        return query;
      };
    },
  });
  createServerSupabase.mockReset().mockResolvedValue({
    from: (table: string) => {
      expect(table).toBe("reports");
      return query;
    },
  });
});

describe("getReportsData", () => {
  it("reads the caller's reports newest first without a user-id filter", async () => {
    response.data = [{
      id: "report-1",
      title: "Ultrasound scan",
      report_type: "Ultrasound scan",
      report_date: "2026-09-10",
      mime_type: "image/jpeg",
      size_bytes: 512000,
      page_count: null,
      created_at: "2026-09-10T10:00:00Z",
    }];

    await expect(getReportsData()).resolves.toEqual([{
      id: "report-1",
      title: "Ultrasound scan",
      reportType: "Ultrasound scan",
      reportDate: "2026-09-10",
      mimeType: "image/jpeg",
      sizeBytes: 512000,
      pageCount: null,
      createdAt: "2026-09-10T10:00:00Z",
    }]);
    expect(calls).toContainEqual({ method: "order", args: ["report_date", { ascending: false }] });
    expect(calls.some((call) => call.args[0] === "user_id")).toBe(false);
  });

  it("throws instead of returning partial data", async () => {
    response.error = new Error("query failed");
    await expect(getReportsData()).rejects.toThrow("query failed");
  });
});

import { describe, expect, it } from "vitest";
import {
  ADVICE_TYPES,
  assembleAdvice,
  isAdviceType,
  latestUpdate,
  normalizeDoctorName,
  sortAdviceByRecency,
  validateAdviceBody,
  type AdviceRecord,
} from "@/lib/domain/advice";

describe("isAdviceType", () => {
  it("accepts each of the eight design categories", () => {
    for (const type of ADVICE_TYPES) {
      expect(isAdviceType(type)).toBe(true);
    }
  });

  it("rejects anything outside the fixed set", () => {
    expect(isAdviceType("prescription")).toBe(false);
    expect(isAdviceType(null)).toBe(false);
    expect(isAdviceType(42)).toBe(false);
  });
});

describe("validateAdviceBody", () => {
  it("trims the outside while preserving internal formatting", () => {
    expect(validateAdviceBody("  Continue the iron tablets daily  ")).toEqual({
      ok: true,
      value: "Continue the iron tablets daily",
    });
  });

  it("returns field errors for blank, overlong, and malformed values", () => {
    expect(validateAdviceBody("   ")).toEqual({ ok: false, error: "empty" });
    expect(validateAdviceBody("x".repeat(4001))).toEqual({ ok: false, error: "too_long" });
    expect(validateAdviceBody(null)).toEqual({ ok: false, error: "invalid" });
  });
});

describe("normalizeDoctorName", () => {
  it("trims a real name", () => {
    expect(normalizeDoctorName("  Dr. Priya Sharma  ")).toBe("Dr. Priya Sharma");
  });

  it("collapses blank or missing input to null", () => {
    expect(normalizeDoctorName("   ")).toBeNull();
    expect(normalizeDoctorName(undefined)).toBeNull();
    expect(normalizeDoctorName(null)).toBeNull();
  });
});

describe("latestUpdate and sortAdviceByRecency", () => {
  const advice: AdviceRecord[] = [
    {
      id: "a1",
      type: "medicine",
      isReminder: true,
      updates: [{ id: "u1", body: "Continue iron tablets", doctorName: "Dr. Rao", createdAt: "2026-09-02T00:00:00Z" }],
    },
    {
      id: "a2",
      type: "exercise",
      isReminder: false,
      updates: [
        { id: "u2", body: "Take short walks", doctorName: "Dr. Anjali Rao", createdAt: "2026-07-02T00:00:00Z" },
        { id: "u3", body: "Switch to stretching", doctorName: "Dr. Priya Sharma", createdAt: "2026-08-20T00:00:00Z" },
      ],
    },
  ];

  it("returns the most recently appended entry", () => {
    expect(latestUpdate(advice[1]!)).toEqual(advice[1]!.updates[1]);
  });

  it("returns null for a thread with no updates", () => {
    expect(latestUpdate({ id: "a3", type: "other", isReminder: false, updates: [] })).toBeNull();
  });

  it("orders threads by their most recent activity, without mutating the input", () => {
    const sorted = sortAdviceByRecency(advice);
    expect(sorted.map((a) => a.id)).toEqual(["a1", "a2"]);
    expect(advice.map((a) => a.id)).toEqual(["a1", "a2"]);
  });
});

describe("assembleAdvice", () => {
  it("joins updates onto their thread, oldest first, and sorts threads by latest activity", () => {
    const result = assembleAdvice({
      adviceRows: [
        { id: "a1", type: "medicine", is_reminder: true },
        { id: "a2", type: "exercise", is_reminder: false },
      ],
      updateRows: [
        { id: "u2", advice_id: "a2", body: "Switch to stretching", doctor_name: "Dr. Priya Sharma", created_at: "2026-08-20T00:00:00Z" },
        { id: "u1", advice_id: "a1", body: "Continue iron tablets", doctor_name: "Dr. Rao", created_at: "2026-09-02T00:00:00Z" },
        { id: "u0", advice_id: "a2", body: "Take short walks", doctor_name: "Dr. Anjali Rao", created_at: "2026-07-02T00:00:00Z" },
      ],
    });

    expect(result.map((a) => a.id)).toEqual(["a1", "a2"]);
    expect(result[1]!.updates.map((u) => u.id)).toEqual(["u0", "u2"]);
  });

  it("drops a thread with an unrecognized type rather than throwing", () => {
    const result = assembleAdvice({
      adviceRows: [{ id: "a1", type: "unknown_future_type", is_reminder: false }],
      updateRows: [{ id: "u1", advice_id: "a1", body: "text", doctor_name: null, created_at: "2026-09-02T00:00:00Z" }],
    });
    expect(result).toEqual([]);
  });

  it("drops a thread that has no updates rather than showing a blank card", () => {
    const result = assembleAdvice({
      adviceRows: [{ id: "a1", type: "medicine", is_reminder: false }],
      updateRows: [],
    });
    expect(result).toEqual([]);
  });
});

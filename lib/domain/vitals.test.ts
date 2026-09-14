import { describe, expect, it } from "vitest";
import { plausibility, vitalSeries } from "@/lib/domain/vitals";

interface VitalRow {
  measured_on: string;
  kind: "weight" | "bp";
  value_1: number;
  value_2: number | null;
}

function vital(overrides: Partial<VitalRow> = {}): VitalRow {
  return { measured_on: "2026-09-10", kind: "weight", value_1: 62.5, value_2: null, ...overrides };
}

describe("vitalSeries", () => {
  it("returns points in ascending date order regardless of input order", () => {
    const vitals = [vital({ measured_on: "2026-09-12" }), vital({ measured_on: "2026-09-08" })];
    const { points } = vitalSeries({ vitals, kind: "weight" });
    expect(points.map((p) => p.date)).toEqual(["2026-09-08", "2026-09-12"]);
  });

  it("retains two readings recorded on the same day", () => {
    const vitals = [vital({ measured_on: "2026-09-10", value_1: 62 }), vital({ measured_on: "2026-09-10", value_1: 63 })];
    const { points } = vitalSeries({ vitals, kind: "weight" });
    expect(points).toHaveLength(2);
  });

  it("returns an empty point list and a safe domain when there is nothing", () => {
    const { points, domain } = vitalSeries({ vitals: [], kind: "weight" });
    expect(points).toEqual([]);
    expect(Number.isFinite(domain.min)).toBe(true);
    expect(Number.isFinite(domain.max)).toBe(true);
    expect(domain.max).toBeGreaterThan(domain.min);
  });

  it("pads the domain so a flat line is not drawn on the axis", () => {
    const vitals = [vital({ value_1: 60 }), vital({ measured_on: "2026-09-11", value_1: 60 })];
    const { domain } = vitalSeries({ vitals, kind: "weight" });
    expect(domain.min).toBeLessThan(60);
    expect(domain.max).toBeGreaterThan(60);
  });

  it("produces two values per point for blood pressure", () => {
    const vitals = [vital({ kind: "bp", value_1: 118, value_2: 76 })];
    const { points } = vitalSeries({ vitals, kind: "bp" });
    expect(points[0]).toMatchObject({ value: 118, secondValue: 76 });
  });

  it("only includes the requested kind", () => {
    const vitals = [vital({ kind: "weight" }), vital({ kind: "bp", value_1: 118, value_2: 76 })];
    const { points } = vitalSeries({ vitals, kind: "bp" });
    expect(points).toHaveLength(1);
  });

  it("filters to the given date range when one is supplied", () => {
    const vitals = [vital({ measured_on: "2026-09-01" }), vital({ measured_on: "2026-09-15" })];
    const { points } = vitalSeries({ vitals, kind: "weight", from: "2026-09-10", to: "2026-09-20" });
    expect(points.map((p) => p.date)).toEqual(["2026-09-15"]);
  });

  it("keeps the blood-pressure domain wide enough for both systolic and diastolic", () => {
    const vitals = [vital({ kind: "bp", value_1: 130, value_2: 80 })];
    const { domain } = vitalSeries({ vitals, kind: "bp" });
    expect(domain.min).toBeLessThan(80);
    expect(domain.max).toBeGreaterThan(130);
  });
});

describe("plausibility", () => {
  it("rejects a physically impossible weight, with the bound stated", () => {
    expect(plausibility({ kind: "weight", value1: 900 })).toMatchObject({
      ok: false,
      field: "value1",
      messageKey: "vitals.errors.weightRange",
    });
  });

  it("accepts an ordinary weight with no note at all", () => {
    expect(plausibility({ kind: "weight", value1: 62.5 })).toEqual({ ok: true });
  });

  it("rejects a diastolic at or above the systolic as a data-entry error", () => {
    const result = plausibility({ kind: "bp", value1: 80, value2: 120 });
    expect(result.ok).toBe(false);
  });

  it("rejects blood pressure missing its second number", () => {
    const result = plausibility({ kind: "bp", value1: 120 });
    expect(result).toMatchObject({ ok: false, field: "value2" });
  });

  it("rejects a physically impossible systolic reading", () => {
    const result = plausibility({ kind: "bp", value1: 400, value2: 80 });
    expect(result).toMatchObject({ ok: false, field: "value1" });
  });

  it("ACCEPTS a clinically notable but possible reading, and attaches a note", () => {
    const result = plausibility({ kind: "bp", value1: 165, value2: 105 });
    expect(result.ok).toBe(true);
    expect(result).toHaveProperty("warnKey");
  });

  it("accepts an ordinary blood-pressure reading with no note at all", () => {
    expect(plausibility({ kind: "bp", value1: 118, value2: 76 })).toEqual({ ok: true });
  });

  it("never returns a clinical claim, only a translation key", () => {
    const result = plausibility({ kind: "bp", value1: 165, value2: 105 });
    expect("warnKey" in result && result.warnKey).toMatch(/^vitals\./);
  });

  it("flags the standard gestational-hypertension screening threshold, at or above either number", () => {
    expect(plausibility({ kind: "bp", value1: 140, value2: 85 })).toHaveProperty("warnKey");
    expect(plausibility({ kind: "bp", value1: 135, value2: 90 })).toHaveProperty("warnKey");
    expect(plausibility({ kind: "bp", value1: 139, value2: 89 })).not.toHaveProperty("warnKey");
  });
});

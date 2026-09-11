import { describe, expect, it } from "vitest";
import { STAGE_BOUNDARIES, illustrationStage, stageRangeLabelKeys } from "@/lib/domain/stages";

describe("illustrationStage", () => {
  it("has exactly nine stages, matching the illustration set", () => {
    expect(STAGE_BOUNDARIES).toHaveLength(9);
  });

  it("returns stage 1 before the first boundary", () => {
    expect(illustrationStage(0)).toBe(1);
    expect(illustrationStage(3)).toBe(1);
  });

  it("advances exactly at each boundary, never between", () => {
    expect(illustrationStage(7)).toBe(1);
    expect(illustrationStage(8)).toBe(2);
    expect(illustrationStage(11)).toBe(2);
    expect(illustrationStage(12)).toBe(3);
  });

  it("returns stage 9 at and beyond the final boundary", () => {
    expect(illustrationStage(36)).toBe(9);
    expect(illustrationStage(40)).toBe(9);
    expect(illustrationStage(42)).toBe(9);
  });

  it("never returns a stage outside 1 to 9, whatever the input", () => {
    for (const week of [-5, 0, 17, 41, 99]) {
      const stage = illustrationStage(week);
      expect(stage).toBeGreaterThanOrEqual(1);
      expect(stage).toBeLessThanOrEqual(9);
    }
  });

  it("treats a non-finite week as week 0, rather than propagating NaN or Infinity", () => {
    expect(illustrationStage(NaN)).toBe(1);
    expect(illustrationStage(Infinity)).toBe(1);
  });

  it("exposes a translation key per stage rather than hardcoded copy", () => {
    expect(stageRangeLabelKeys()).toHaveLength(9);
    expect(stageRangeLabelKeys()[0]).toBe("stages.1");
  });
});

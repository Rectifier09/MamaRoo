import { describe, expect, it } from "vitest";
import { mealPlanFor, extrasFor, DIET_TYPES, type DietType } from "@/lib/domain/mealPlan";

describe("mealPlanFor", () => {
  it("returns four meal slots in a fixed order for every diet type", () => {
    for (const diet of DIET_TYPES) {
      const slots = mealPlanFor({ dietType: diet });
      expect(slots.map((s) => s.slot)).toEqual(["breakfast", "lunch", "snack", "dinner"]);
    }
  });

  it("gives every slot a translation key, never literal copy", () => {
    const slots = mealPlanFor({ dietType: "veg" });
    for (const s of slots) {
      expect(s.itemsKey).toMatch(/^mealPlan\./);
    }
  });

  it("varies the key by diet type for the same slot", () => {
    const veg = mealPlanFor({ dietType: "veg" }).find((s) => s.slot === "breakfast")!;
    const nonveg = mealPlanFor({ dietType: "nonveg" }).find((s) => s.slot === "breakfast")!;
    expect(veg.itemsKey).not.toBe(nonveg.itemsKey);
  });

  it("keeps the snack key identical across diet types, matching the design", () => {
    const veg = mealPlanFor({ dietType: "veg" }).find((s) => s.slot === "snack")!;
    const vegan = mealPlanFor({ dietType: "vegan" }).find((s) => s.slot === "snack")!;
    expect(veg.itemsKey).toBe(vegan.itemsKey);
  });

  it("rejects an unknown diet type rather than silently defaulting", () => {
    expect(() => mealPlanFor({ dietType: "keto" as DietType })).toThrow();
  });
});

describe("extrasFor", () => {
  it("returns water and dry fruits, in that order, regardless of diet type", () => {
    expect(extrasFor().map((e) => e.slot)).toEqual(["water", "dryFruits"]);
  });

  it("gives every extra a translation key too", () => {
    for (const e of extrasFor()) {
      expect(e.itemsKey).toMatch(/^mealPlan\.extras\./);
    }
  });
});

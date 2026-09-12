export const DIET_TYPES = ["veg", "nonveg", "vegan"] as const;
export type DietType = (typeof DIET_TYPES)[number];

const MEAL_SLOTS = ["breakfast", "lunch", "snack", "dinner"] as const;
export type MealSlotKind = (typeof MEAL_SLOTS)[number];

export interface MealSlot {
  slot: MealSlotKind;
  labelKey: string;
  itemsKey: string;
}

export interface ExtraSlot {
  slot: "water" | "dryFruits";
  labelKey: string;
  itemsKey: string;
}

/**
 * Every slot resolves to an i18n key, never copy: the strings live in
 * i18n/en.json and i18n/hi.json under mealPlan.<diet>.<slot>, sourced verbatim
 * from Meal Plan.dc.html. Snack and the two "through the day" extras don't vary
 * by diet, matching the design, which only branches breakfast, lunch and dinner.
 */
export function mealPlanFor({ dietType }: { dietType: DietType }): MealSlot[] {
  if (!(DIET_TYPES as readonly string[]).includes(dietType)) {
    throw new Error(`Unknown diet type: ${dietType}`);
  }
  return MEAL_SLOTS.map((slot) => ({
    slot,
    labelKey: `mealPlan.slotLabel.${slot}`,
    itemsKey: slot === "snack" ? "mealPlan.snack" : `mealPlan.${dietType}.${slot}`,
  }));
}

export function extrasFor(): ExtraSlot[] {
  return [
    { slot: "water", labelKey: "mealPlan.slotLabel.water", itemsKey: "mealPlan.extras.water" },
    { slot: "dryFruits", labelKey: "mealPlan.slotLabel.dryFruits", itemsKey: "mealPlan.extras.dryFruits" },
  ];
}

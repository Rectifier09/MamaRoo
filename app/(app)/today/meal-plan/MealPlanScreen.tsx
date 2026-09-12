"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { DisclaimerBanner } from "@/components/patterns/DisclaimerBanner";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { Tabs } from "@/components/ui/Tabs";
import { DIET_TYPES, extrasFor, mealPlanFor, type DietType, type MealSlotKind } from "@/lib/domain/mealPlan";

const MEAL_ICONS: Record<MealSlotKind, string> = {
  breakfast: "Sun",
  lunch: "BowlFood",
  // "Apple" isn't a real @phosphor-icons/react export (AppleLogo is the tech
  // company's logo, not a fruit) -- Orange is the actual fruit icon.
  snack: "Orange",
  dinner: "Moon",
};

const EXTRA_ICONS = { water: "Drop", dryFruits: "CirclesThreePlus" } as const;

export function MealPlanScreen({ trimester }: { trimester: string | number }) {
  const t = useTranslations();
  const [dietType, setDietType] = useState<DietType>("veg");
  const meals = mealPlanFor({ dietType });
  const extras = extrasFor();

  function selectDiet(id: string) {
    if ((DIET_TYPES as readonly string[]).includes(id)) setDietType(id as DietType);
  }

  return (
    <section className="mx-auto flex w-full max-w-[680px] flex-col gap-lg py-screen" aria-labelledby="meal-plan-title">
      <header className="flex items-center gap-md">
        <Link
          href="/today"
          aria-label={t("today.backToToday")}
          className="tap-target inline-flex items-center justify-center rounded-full bg-surface-raised text-text-primary shadow-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-primary"
        >
          <Icon name="ArrowLeft" size="inline" />
        </Link>
      </header>

      <div>
        <h1 id="meal-plan-title" className="font-display text-h1 font-semibold text-text-primary">
          {t("mealPlan.title")}
        </h1>
        <p className="mt-xs text-caption text-text-secondary">
          {t("mealPlan.trimesterLabel", { trimester })}
        </p>
      </div>

      <div className="flex items-start gap-sm rounded-sm bg-[rgba(103,0,53,0.06)] p-md">
        <Icon name="Info" size="inline" className="mt-xs shrink-0 text-text-primary" />
        <DisclaimerBanner>{t("mealPlan.disclaimer")}</DisclaimerBanner>
      </div>

      <Tabs
        tabs={DIET_TYPES.map((id) => ({ id, label: t(`mealPlan.dietLabel.${id}`) }))}
        activeId={dietType}
        onChange={selectDiet}
      />

      <div className="flex flex-col gap-md" aria-live="polite">
        {meals.map((meal) => (
          <Card key={meal.slot} className="flex gap-md">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-sm bg-[rgba(255,197,61,0.28)] text-text-primary">
              <Icon name={MEAL_ICONS[meal.slot]} size="default" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-caption font-semibold uppercase tracking-[0.04em] text-text-secondary">
                {t(meal.labelKey)}
              </h2>
              <p className="mt-xs text-body-sm text-text-primary">{t(meal.itemsKey)}</p>
            </div>
          </Card>
        ))}
      </div>

      <div className="flex flex-col gap-md">
        {extras.map((extra) => (
          <Card key={extra.slot} className="flex gap-md">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-sm bg-[rgba(255,197,61,0.28)] text-text-primary">
              <Icon name={EXTRA_ICONS[extra.slot]} size="default" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-caption font-semibold uppercase tracking-[0.04em] text-text-secondary">
                {t(extra.labelKey)}
              </h2>
              <p className="mt-xs text-body-sm text-text-primary">{t(extra.itemsKey)}</p>
            </div>
          </Card>
        ))}
      </div>

      <aside className="rounded-sm bg-[rgba(255,197,61,0.16)] p-md">
        <h2 className="text-caption font-semibold uppercase tracking-[0.04em] text-text-secondary">
          {t("mealPlan.whyLabel")}
        </h2>
        <p className="mt-xs text-body-sm text-text-primary">{t("mealPlan.whyBody")}</p>
      </aside>
    </section>
  );
}

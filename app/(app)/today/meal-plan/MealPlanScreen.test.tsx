import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it } from "vitest";
import { MealPlanScreen } from "@/app/(app)/today/meal-plan/MealPlanScreen";
import en from "@/i18n/en.json";
import hi from "@/i18n/hi.json";

function renderScreen(locale: "en" | "hi" = "en") {
  const messages = locale === "hi" ? hi : en;
  return render(
    <NextIntlClientProvider locale={locale} messages={messages}>
      <MealPlanScreen trimester={locale === "en" ? "second" : "दूसरी"} />
    </NextIntlClientProvider>,
  );
}

describe("MealPlanScreen", () => {
  it("uses the Tabs primitive for three diets and defaults to Veg", () => {
    renderScreen();
    const tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(3);
    expect(screen.getByRole("tab", { name: en.mealPlan.dietLabel.veg })).toHaveAttribute("aria-selected", "true");
  });

  it("changes breakfast, lunch and dinner while keeping snack and extras stable", async () => {
    const user = userEvent.setup();
    renderScreen();
    const stableCopy = [en.mealPlan.snack, en.mealPlan.extras.water, en.mealPlan.extras.dryFruits];
    const vegCopy = [en.mealPlan.veg.breakfast, en.mealPlan.veg.lunch, en.mealPlan.veg.dinner];
    vegCopy.forEach((copy) => expect(screen.getByText(copy)).toBeInTheDocument());

    await user.click(screen.getByRole("tab", { name: en.mealPlan.dietLabel.nonveg }));

    [en.mealPlan.nonveg.breakfast, en.mealPlan.nonveg.lunch, en.mealPlan.nonveg.dinner].forEach((copy) =>
      expect(screen.getByText(copy)).toBeInTheDocument(),
    );
    vegCopy.forEach((copy) => expect(screen.queryByText(copy)).not.toBeInTheDocument());
    stableCopy.forEach((copy) => expect(screen.getByText(copy)).toBeInTheDocument());

    await user.click(screen.getByRole("tab", { name: en.mealPlan.dietLabel.vegan }));
    [en.mealPlan.vegan.breakfast, en.mealPlan.vegan.lunch, en.mealPlan.vegan.dinner].forEach((copy) =>
      expect(screen.getByText(copy)).toBeInTheDocument(),
    );
    stableCopy.forEach((copy) => expect(screen.getByText(copy)).toBeInTheDocument());
  });

  it.each([
    ["en" as const, en.mealPlan.disclaimer],
    ["hi" as const, hi.mealPlan.disclaimer],
  ])("always renders the disclaimer in %s", (locale, disclaimer) => {
    renderScreen(locale);
    expect(screen.getByTestId("disclaimer")).toHaveTextContent(disclaimer);
  });

  it("links back to Today and never renders a texture motif", () => {
    renderScreen();
    expect(screen.getByRole("link", { name: en.today.backToToday })).toHaveAttribute("href", "/today");
    expect(screen.queryByTestId("texture-motif")).not.toBeInTheDocument();
  });
});

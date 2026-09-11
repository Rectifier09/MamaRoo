import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("the app responds on the root route", async ({ page }) => {
  const response = await page.goto("/");
  expect(response?.status()).toBeLessThan(400);
});

test("the component gallery renders with no accessibility violations", async ({ page }) => {
  await page.goto("/dev/components");
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

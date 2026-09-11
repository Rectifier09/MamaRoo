import { expect, test } from "@playwright/test";

test("the app responds on the root route", async ({ page }) => {
  const response = await page.goto("/");
  expect(response?.status()).toBeLessThan(400);
});

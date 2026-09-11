import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("the waitlist fits short phones in both languages", async ({ page }) => {
  for (const viewport of [
    { width: 320, height: 568 },
    { width: 375, height: 667 },
    { width: 390, height: 844 },
    { width: 1440, height: 900 },
    { width: 1280, height: 600 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.evaluate(() => document.fonts.ready);
    for (const locale of ["en", "hi"]) {
      if (locale === "hi") await page.getByRole("button", { name: "हिंदी में पढ़ें" }).click();
      await expect(page.locator("html")).toHaveAttribute("lang", locale);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      const dimensions = await page.evaluate(() => ({
        width: document.documentElement.scrollWidth,
        height: document.documentElement.scrollHeight,
        viewport: window.innerHeight,
      }));
      expect(dimensions.width).toBeLessThanOrEqual(viewport.width);
      expect(dimensions.height).toBeLessThanOrEqual(dimensions.viewport + 1);
      const shell = await page.locator(".coming-soon").boundingBox();
      const art = await page.locator(".landing-art").boundingBox();
      const story = await page.locator(".landing-story").boundingBox();
      expect(shell!.width).toBeLessThanOrEqual(390);
      expect(shell!.x).toBeCloseTo((viewport.width - shell!.width) / 2, 0);
      expect(art!.y + art!.height).toBeLessThanOrEqual(story!.y);
    }
  }
});

test("signup validates, handles retry, and only confirms an acknowledged signup", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Join the waitlist" }).click();
  await expect(page.getByText("Please enter your name.")).toBeVisible();
  await expect(page.getByLabel("Your name")).toBeFocused();
  await page.getByLabel("Your name").fill("Asha Sharma");
  await page.getByRole("button", { name: "Join the waitlist" }).click();
  await expect(page.getByText("Please enter a valid email address.")).toBeVisible();
  await page.getByLabel("Your email address").fill("you@example.com");
  await page.route("**/api/waitlist", (route) =>
    route.fulfill({ status: 503, json: { error: "Unavailable" } }),
  );
  await page.getByRole("button", { name: "Join the waitlist" }).click();
  await expect(page.locator(".signup-feedback[role='alert']")).toContainText("Please try again");
  await expect(page.getByLabel("Your email address")).toHaveValue("you@example.com");
  await expect(page.getByLabel("Your name")).toHaveValue("Asha Sharma");
  let confirmSave = () => {};
  const saved = new Promise<void>((resolve) => {
    confirmSave = resolve;
  });
  await page.route("**/api/waitlist", async (route) => {
    expect(route.request().postDataJSON()).toMatchObject({
      name: "Asha Sharma",
      email: "you@example.com",
      locale: "en",
    });
    await saved;
    await route.fulfill({ status: 200, json: { ok: true } });
  });
  await page.getByRole("button", { name: "Join the waitlist" }).click();
  await expect(page.getByRole("button", { name: "Joining…" })).toBeDisabled();
  await expect(page.getByRole("status")).toHaveCount(0);
  const beforeSave = await page.locator(".waitlist-area").boundingBox();
  confirmSave();
  await expect(page.getByRole("status")).toContainText("You're on the list");
  await expect(page.getByRole("status")).toBeFocused();
  await expect(page.getByRole("form")).toHaveCount(0);
  const afterSave = await page.locator(".waitlist-area").boundingBox();
  expect(afterSave!.height).toBeCloseTo(beforeSave!.height, 0);
  await expect
    .poll(() =>
      page
        .locator(".success-check-stroke")
        .evaluate((el) => parseFloat(getComputedStyle(el).strokeDashoffset)),
    )
    .toBe(0);
});

test("both languages are accessible and reduced motion stops the illustration", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  expect(
    await page.locator(".brand-icon").evaluate((el) => getComputedStyle(el).animationName),
  ).toBe("none");
  for (const locale of ["en", "hi"]) {
    if (locale === "hi") await page.getByRole("button", { name: "हिंदी में पढ़ें" }).click();
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(results.violations).toEqual([]);
  }
  await page.route("**/api/waitlist", (route) =>
    route.fulfill({ status: 200, json: { ok: true } }),
  );
  await page.getByLabel("आपका ईमेल पता").fill("you@example.com");
  await page.getByLabel("आपका नाम", { exact: true }).fill("आशा शर्मा");
  await page.getByRole("button", { name: "वेटलिस्ट में जुड़ें" }).click();
  await expect(page.getByRole("status")).toBeVisible();
  for (const selector of [
    ".landing-art",
    ".landing-story h1",
    ".waitlist-area",
    ".waitlist-success",
    ".success-check-stroke",
  ]) {
    expect(await page.locator(selector).evaluate((el) => getComputedStyle(el).animationName)).toBe(
      "none",
    );
  }
});

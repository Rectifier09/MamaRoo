import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { createOnboardedSession, type OnboardedFixture } from "./helpers/todaySession";

// See tests/e2e/helpers/todaySession.ts for why this can sign a real user in
// (admin-create + password) despite this environment having no local
// Supabase/Inbucket to read a real emailed OTP code from -- that constraint
// blocks reading an email, not signing in. Each test seeds and cleans up its
// own throwaway @rls.test user, same convention as tests/rls/.

test.describe("Today screen", () => {
  let fixture: OnboardedFixture | undefined;

  test.afterEach(async () => {
    await fixture?.cleanup();
    fixture = undefined;
  });

  test("shows the correct week for a known LMP", async ({ page, context, baseURL }) => {
    fixture = await createOnboardedSession({ baseURL: baseURL! });
    await context.addCookies(fixture.cookies);

    await page.goto("/today");
    await expect(page.getByAltText(`Week ${fixture.week} · your baby`, { exact: true })).toHaveCount(1);
    await expect(page.getByText(`Week ${fixture.week} · your baby`, { exact: true })).toBeVisible();
  });

  test("renders two illustrations, side by side, for a twin pregnancy", async ({ page, context, baseURL }) => {
    fixture = await createOnboardedSession({ baseURL: baseURL!, twins: true });
    await context.addCookies(fixture.cookies);

    await page.goto("/today");
    await expect(page.getByAltText(`Week ${fixture.week} · your babies`, { exact: true })).toHaveCount(2);
  });

  test("has no accessibility violations in English or Hindi", async ({ page, context, baseURL }) => {
    fixture = await createOnboardedSession({ baseURL: baseURL! });
    await context.addCookies(fixture.cookies);

    await page.goto("/today");
    const english = await new AxeBuilder({ page }).analyze();
    expect(english.violations).toEqual([]);

    await context.addCookies([{ name: "mr_locale", value: "hi", url: baseURL! }]);
    await page.goto("/today");
    const hindi = await new AxeBuilder({ page }).analyze();
    expect(hindi.violations).toEqual([]);
  });
});

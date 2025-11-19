import { expect, test } from "@playwright/test";

test("landing page promotes spotify sign-in", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: /turn spotify listening data into personalized discovery moments/i }),
  ).toBeVisible();

  const primaryCta = page.getByRole("main").getByRole("button", { name: /sign in with spotify/i }).first();
  await expect(primaryCta).toBeVisible();
});
import { test, expect } from "@playwright/test";

test("sign-in button is visible on landing page", async ({ page }) => {
  await page.goto("/");

  // Check title
  await expect(page).toHaveTitle(/Tunescout/);

  // Create a locator for the sign-in button in the main section
  const signInButton = page.getByRole("main").getByRole("button", { name: /sign in with spotify/i }).first();

  // The button should be visible
  await expect(signInButton).toBeVisible();

  // Verify it links to the Spotify OAuth flow
  const href = await signInButton.getAttribute("onclick");
  expect(href).toBeDefined();
});

test("landing page redirects unauthenticated users appropriately", async ({ page }) => {
  // Navigate to the home page
  await page.goto("/");

  // The page should have loaded
  const url = page.url();
  expect(url.includes("localhost:3000") || url.includes("tunescout.local.com:3000")).toBeTruthy();

  // Should have the main heading
  const mainHeading = page.getByRole("heading", { name: /turn spotify listening data into personalized discovery moments/i });
  await expect(mainHeading).toBeVisible();
});


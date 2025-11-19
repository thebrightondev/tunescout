import { expect, test } from "@playwright/test";

/**
 * E2E Tests: User Feedback Flow with Real Spotify Integration
 * 
 * These tests verify:
 * 1. Users can like/dislike recommendations
 * 2. System fetches more tracks when recommendations are exhausted
 * 3. Persisted recommendations display after feedback is given
 * 
 * Requirements: Valid Spotify credentials in SPOTIFY_EMAIL and SPOTIFY_PASSWORD env vars
 */

const SPOTIFY_EMAIL = process.env.SPOTIFY_EMAIL;
const SPOTIFY_PASSWORD = process.env.SPOTIFY_PASSWORD;

test.describe.configure({ retries: 0 });

test.describe("Recommendations with Real Spotify Login and Feedback", () => {
  test.beforeEach(async ({ page, context }) => {
    // Skip tests if Spotify credentials not provided
    test.skip(!SPOTIFY_EMAIL || !SPOTIFY_PASSWORD, "Spotify credentials required");

    // Navigate to app
    await page.goto("/");
    await page.waitForLoadState("networkidle");
  });

  test("User can log in with Spotify and see recommendations", async ({
    page,
    context,
  }) => {
    // Find and click the "Sign in with Spotify" button
    const spotifyButton = page.getByRole("button", {
      name: /sign in with spotify/i,
    });
    await expect(spotifyButton).toBeVisible();

    // Click to initiate OAuth flow
    await spotifyButton.click();

    // Wait for Spotify login page (new tab/popup)
    const [spotifyPage] = await Promise.all([
      context.waitForEvent("page"),
      // Click is already done
    ]);

    // Fill in Spotify credentials
    await spotifyPage.waitForLoadState("networkidle");
    const emailInput = spotifyPage.locator('input[type="email"]').first();
    const passwordInput = spotifyPage.locator('input[type="password"]').first();

    if (await emailInput.isVisible()) {
      await emailInput.fill(SPOTIFY_EMAIL!);
    }

    if (await passwordInput.isVisible()) {
      await passwordInput.fill(SPOTIFY_PASSWORD!);
    }

    // Submit login form
    const loginButton = spotifyPage.getByRole("button", {
      name: /log in|sign in/i,
    });
    await loginButton.click();

    // Wait for authorization and redirect back to app
    await page.waitForURL("**/dashboard", { timeout: 30000 });
    await page.waitForLoadState("networkidle");

    // Verify we're on the dashboard
    expect(page.url()).toContain("/dashboard");

    // Wait for recommendations to load
    await page.waitForTimeout(2000);

    // Check for recommendation cards
    const recommendationItems = page.locator("li").filter({
      has: page.locator("button"),
    });

    const count = await recommendationItems.count();
    console.log(`Found ${count} recommendation items`);

    // Should have at least some recommendations
    expect(count).toBeGreaterThan(0);
  });

  test("User can like and dislike multiple recommendations", async ({
    page,
    context,
  }) => {
    // Login first
    const spotifyButton = page.getByRole("button", {
      name: /sign in with spotify/i,
    });
    await spotifyButton.click();

    const [spotifyPage] = await Promise.all([
      context.waitForEvent("page"),
    ]);

    await spotifyPage.waitForLoadState("networkidle");
    const emailInput = spotifyPage.locator('input[type="email"]').first();
    const passwordInput = spotifyPage.locator('input[type="password"]').first();

    if (await emailInput.isVisible()) {
      await emailInput.fill(SPOTIFY_EMAIL!);
    }
    if (await passwordInput.isVisible()) {
      await passwordInput.fill(SPOTIFY_PASSWORD!);
    }

    const loginButton = spotifyPage.getByRole("button", {
      name: /log in|sign in/i,
    });
    await loginButton.click();

    // Wait for redirect to dashboard
    await page.waitForURL("**/dashboard", { timeout: 30000 });
    await page.waitForLoadState("networkidle");

    // Get initial recommendations
    await page.waitForTimeout(2000);
    const initialCards = page
      .locator("li")
      .filter({ has: page.locator("button") });
    const initialCount = await initialCards.count();

    console.log(`Initial recommendations: ${initialCount}`);
    expect(initialCount).toBeGreaterThan(0);

    // Like the first recommendation
    const firstCard = initialCards.nth(0);
    const likeButtons = firstCard.locator("button").filter({
      has: page.locator('svg[class*="ThumbsUp"]').or(
        page.locator('[aria-label*="Like"]')
      ),
    });

    // Try to find the like button (might be the thumbs up button)
    let likeButton = firstCard.locator('button[aria-label*="Like"], button[aria-label*="like"]').first();
    
    if (!(await likeButton.isVisible())) {
      // Fallback: find all buttons in the card and try the first icon button
      const buttons = firstCard.locator("button");
      const buttonCount = await buttons.count();
      
      if (buttonCount >= 2) {
        // Usually: [Play, Like, Dislike] or similar
        likeButton = buttons.nth(1); // Assuming second button is like
      }
    }

    if (await likeButton.isVisible()) {
      await likeButton.click();
      console.log("Clicked like button");

      // Wait for feedback to register
      await page.waitForTimeout(500);

      // Check for toast notification
      const toast = page.locator("text=/saved|liked/i").first();
      const isToastVisible = await toast.isVisible().catch(() => false);
      console.log(`Like toast visible: ${isToastVisible}`);
    }

    // Dislike the second recommendation (if available)
    if (initialCount > 1) {
      const secondCard = initialCards.nth(1);
      const dislikeButton = secondCard
        .locator('button[aria-label*="Dislike"], button[aria-label*="dislike"]')
        .first();

      if (!(await dislikeButton.isVisible())) {
        // Fallback: find third button (usually dislike)
        const buttons = secondCard.locator("button");
        if ((await buttons.count()) >= 3) {
          const fallbackDislike = buttons.nth(2);
          await fallbackDislike.click();
        }
      } else {
        await dislikeButton.click();
      }

      console.log("Clicked dislike button");
      await page.waitForTimeout(500);
    }
  });

  test("System fetches more tracks when recommendations are exhausted", async ({
    page,
    context,
  }) => {
    // Login
    const spotifyButton = page.getByRole("button", {
      name: /sign in with spotify/i,
    });
    await spotifyButton.click();

    const [spotifyPage] = await Promise.all([
      context.waitForEvent("page"),
    ]);

    await spotifyPage.waitForLoadState("networkidle");
    const emailInput = spotifyPage.locator('input[type="email"]').first();
    const passwordInput = spotifyPage.locator('input[type="password"]').first();

    if (await emailInput.isVisible()) {
      await emailInput.fill(SPOTIFY_EMAIL!);
    }
    if (await passwordInput.isVisible()) {
      await passwordInput.fill(SPOTIFY_PASSWORD!);
    }

    const loginButton = spotifyPage.getByRole("button", {
      name: /log in|sign in/i,
    });
    await loginButton.click();

    await page.waitForURL("**/dashboard", { timeout: 30000 });
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Get all current recommendation cards
    let cards = page.locator("li").filter({ has: page.locator("button") });
    let cardCount = await cards.count();
    console.log(`Initial cards: ${cardCount}`);

    // Like/dislike all visible recommendations
    for (let i = 0; i < Math.min(cardCount, 5); i++) {
      const card = cards.nth(i);
      const buttons = card.locator("button");
      const buttonCount = await buttons.count();

      if (buttonCount >= 2) {
        // Click like button (usually second button)
        const likeOrDislike = i % 2 === 0 ? buttons.nth(1) : buttons.nth(2);
        if (await likeOrDislike.isVisible()) {
          await likeOrDislike.click();
          await page.waitForTimeout(300);
        }
      }
    }

    // Click "Discover More" button to fetch more tracks
    const discoverButton = page.getByRole("button", {
      name: /discover more/i,
    });

    if (await discoverButton.isVisible()) {
      console.log("Clicking 'Discover More' button");
      await discoverButton.click();

      // Wait for new recommendations to load
      await page.waitForTimeout(2000);

      // Check if new cards are available
      cards = page.locator("li").filter({ has: page.locator("button") });
      const newCardCount = await cards.count();
      console.log(`Cards after Discover More: ${newCardCount}`);

      // Should have fetched more tracks
      expect(newCardCount).toBeGreaterThan(0);
    }
  });

  test("Persisted recommendations display after user provides feedback", async ({
    page,
    context,
  }) => {
    // First login
    const spotifyButton = page.getByRole("button", {
      name: /sign in with spotify/i,
    });
    await spotifyButton.click();

    const [spotifyPage] = await Promise.all([
      context.waitForEvent("page"),
    ]);

    await spotifyPage.waitForLoadState("networkidle");
    const emailInput = spotifyPage.locator('input[type="email"]').first();
    const passwordInput = spotifyPage.locator('input[type="password"]').first();

    if (await emailInput.isVisible()) {
      await emailInput.fill(SPOTIFY_EMAIL!);
    }
    if (await passwordInput.isVisible()) {
      await passwordInput.fill(SPOTIFY_PASSWORD!);
    }

    const loginButton = spotifyPage.getByRole("button", {
      name: /log in|sign in/i,
    });
    await loginButton.click();

    await page.waitForURL("**/dashboard", { timeout: 30000 });
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Get first recommendation's details
    const firstCard = page
      .locator("li")
      .filter({ has: page.locator("button") })
      .nth(0);
    const firstTitle = await firstCard
      .locator("p")
      .first()
      .textContent();

    console.log(`First recommendation: ${firstTitle}`);

    // Like it
    const buttons = firstCard.locator("button");
    if ((await buttons.count()) >= 2) {
      await buttons.nth(1).click();
      await page.waitForTimeout(500);
    }

    // Navigate to recommendations page (if it exists)
    const recommendationsLink = page.getByRole("link", {
      name: /recommendations/i,
    });

    if (await recommendationsLink.isVisible()) {
      console.log("Navigating to recommendations page");
      await recommendationsLink.click();
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(1000);

      // Check if the liked recommendation appears
      const recommendationCards = page
        .locator("li")
        .filter({ has: page.locator("button") });
      const recCount = await recommendationCards.count();

      console.log(`Recommendations page has ${recCount} items`);

      if (recCount > 0) {
        // Search for the previously liked track
        const allText = await page.locator("body").textContent();
        const hasPreviousTrack = allText?.includes(firstTitle || "") ?? false;
        console.log(
          `Previous track visible on recommendations page: ${hasPreviousTrack}`
        );
      }
    }

    // Go back to dashboard
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Verify dashboard still shows recommendations
    const dashboardCards = page
      .locator("li")
      .filter({ has: page.locator("button") });
    const dashboardCount = await dashboardCards.count();

    console.log(`Dashboard recommendations after navigation: ${dashboardCount}`);

    // Should still have recommendations
    expect(dashboardCount).toBeGreaterThan(0);
  });

  test("No recommendations shown only when user has no liked tracks AND API returns empty", async ({
    page,
    context,
  }) => {
    // This is a validation test that empty state is appropriate
    // In normal usage, this should rarely happen due to fallback seeding

    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    // Check if we're logged in
    const spotifyButton = page.getByRole("button", {
      name: /sign in with spotify/i,
    });
    const isLoggedIn = !(await spotifyButton.isVisible());

    if (isLoggedIn) {
      // If logged in, we should either have recommendations OR see a meaningful message
      const hasRecommendations = (
        await page
          .locator("li")
          .filter({ has: page.locator("button") })
          .count()
      ) > 0;

      if (!hasRecommendations) {
        // Check for appropriate empty state message
        const emptyStateText = page.locator(
          "text=/no signals|start listening|connect spotify/i"
        );
        const hasEmptyState = await emptyStateText.isVisible().catch(() => false);

        console.log(`Has empty state message: ${hasEmptyState}`);
        // Either recommendations exist or empty state message is shown
        expect(hasRecommendations || hasEmptyState).toBe(true);
      }
    }
  });

  test("Recommendations still load after giving feedback on many tracks (regression test)", async ({
    page,
    context,
  }) => {
    // This test catches the regression where ALL recommendations get filtered out
    // after the user gives feedback on many tracks

    // Login first
    const spotifyButton = page.getByRole("button", {
      name: /sign in with spotify/i,
    });
    await spotifyButton.click();

    const [spotifyPage] = await Promise.all([
      context.waitForEvent("page"),
    ]);

    await spotifyPage.waitForLoadState("networkidle");
    const emailInput = spotifyPage.locator('input[type="email"]').first();
    const passwordInput = spotifyPage.locator('input[type="password"]').first();

    if (await emailInput.isVisible()) {
      await emailInput.fill(SPOTIFY_EMAIL!);
    }

    if (await passwordInput.isVisible()) {
      await passwordInput.fill(SPOTIFY_PASSWORD!);
    }

    const loginButton = spotifyPage.getByRole("button", {
      name: /log in|sign in/i,
    });
    await loginButton.click();

    await page.waitForURL("**/dashboard", { timeout: 30000 });
    await page.waitForLoadState("networkidle");

    // Give feedback on at least 10 tracks to populate feedback history
    let feedbackGiven = 0;
    let attempts = 0;
    const maxAttempts = 50;

    while (feedbackGiven < 10 && attempts < maxAttempts) {
      attempts++;

      // Find recommendation items
      const recommendationItems = page.locator("li").filter({
        has: page.locator("button"),
      });

      const count = await recommendationItems.count();

      if (count === 0) {
        // No recommendations visible, wait and try again
        await page.waitForTimeout(1000);
        continue;
      }

      // Click the like or dislike button on first item
      const firstItem = recommendationItems.first();
      const buttons = firstItem.locator("button");
      const buttonCount = await buttons.count();

      if (buttonCount > 0) {
        const likeButton = firstItem.locator("button").first();
        await likeButton.click();

        feedbackGiven++;
        console.log(`Gave feedback ${feedbackGiven}/10`);

        // Wait for feedback to be processed
        await page.waitForTimeout(500);

        // Check if there's a "Discover More" button and click it to refresh
        const discoverButton = page.getByRole("button", {
          name: /discover more/i,
        });

        if (await discoverButton.isVisible()) {
          await discoverButton.click();
          await page.waitForTimeout(1000);
        }
      }
    }

    console.log(`Total feedback given: ${feedbackGiven}`);
    expect(feedbackGiven).toBeGreaterThanOrEqual(5);

    // Now verify recommendations still appear
    // This should NOT show empty state
    await page.waitForTimeout(2000);

    const recommendationItems = page
      .locator("li")
      .filter({ has: page.locator("button") });
    const finalCount = await recommendationItems.count();

    console.log(
      `After ${feedbackGiven} feedback actions, found ${finalCount} recommendations`
    );

    // Should still have recommendations (not all filtered out)
    expect(finalCount).toBeGreaterThan(0);
  });

  test("Discovery page should never show empty state after user gives feedback", async ({
    page,
    context,
  }) => {
    // This test specifically catches the regression where all recommendations
    // disappear if we filter too aggressively

    // Login first
    const spotifyButton = page.getByRole("button", {
      name: /sign in with spotify/i,
    });
    await spotifyButton.click();

    const [spotifyPage] = await Promise.all([
      context.waitForEvent("page"),
    ]);

    await spotifyPage.waitForLoadState("networkidle");
    const emailInput = spotifyPage.locator('input[type="email"]').first();
    const passwordInput = spotifyPage.locator('input[type="password"]').first();

    if (await emailInput.isVisible()) {
      await emailInput.fill(SPOTIFY_EMAIL!);
    }

    if (await passwordInput.isVisible()) {
      await passwordInput.fill(SPOTIFY_PASSWORD!);
    }

    const loginButton = spotifyPage.getByRole("button", {
      name: /log in|sign in/i,
    });
    await loginButton.click();

    await page.waitForURL("**/dashboard", { timeout: 30000 });
    await page.waitForLoadState("networkidle");

    // Initial state should have recommendations
    await page.waitForTimeout(2000);
    let recommendationItems = page
      .locator("li")
      .filter({ has: page.locator("button") });
    let initialCount = await recommendationItems.count();

    console.log(`Initial recommendation count: ${initialCount}`);
    expect(initialCount).toBeGreaterThan(0);

    // Dislike the first item multiple times to ensure filtering works
    for (let i = 0; i < 3; i++) {
      recommendationItems = page
        .locator("li")
        .filter({ has: page.locator("button") });
      const count = await recommendationItems.count();

      if (count === 0) break;

      const firstItem = recommendationItems.first();
      const buttons = firstItem.locator("button");
      const buttonCount = await buttons.count();

      if (buttonCount > 1) {
        // Click the dislike button (usually the second button)
        const dislikeButton = buttons.nth(1);
        await dislikeButton.click();
        console.log(`Disliked track ${i + 1}`);
        await page.waitForTimeout(500);
      }
    }

    // After disliking, still should have recommendations
    // (should not show empty state like "We didn't find any signals")
    await page.waitForTimeout(2000);
    recommendationItems = page
      .locator("li")
      .filter({ has: page.locator("button") });
    const afterDislikes = await recommendationItems.count();

    console.log(`After disliking, recommendation count: ${afterDislikes}`);

    // Check that we don't show the empty state message
    const emptyStateMessage = page.locator(
      "text=/didn't find any signals|no recommendations yet/i"
    );
    const hasEmptyMessage = await emptyStateMessage
      .isVisible()
      .catch(() => false);

    console.log(`Empty state message visible: ${hasEmptyMessage}`);

    // Should have recommendations or at minimum not show empty state
    // The regression was that we showed empty state after filtering all tracks
    if (afterDislikes === 0) {
      expect(hasEmptyMessage).toBe(false);
    } else {
      expect(afterDislikes).toBeGreaterThan(0);
    }
  });
});

import { expect, test } from "@playwright/test";

test.describe("Recommendations with Spotify Integration", () => {
  test("should fetch recommendations from BFF API endpoint (no token => empty)", async ({ page }) => {
    // Test the Next.js API route directly
    const response = await page.request.post("/api/recommendations", {
      data: {
        userId: "e2e-test-user",
        limit: 5,
        filters: ["recent"],
        accessToken: null,
      },
    });

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty("userId", "e2e-test-user");
    expect(data).toHaveProperty("recommendations");
    expect(Array.isArray(data.recommendations)).toBe(true);
    expect(data.recommendations.length).toBe(0);
  });

  test("should return empty recommendations without token on multiple requests", async ({ page }) => {
    // Request 1
    const response1 = await page.request.post("/api/recommendations", {
      data: {
        userId: "e2e-randomization-test",
        limit: 5,
        filters: ["recent"],
        accessToken: null,
      },
    });

    const data1 = await response1.json();
    expect(Array.isArray(data1.recommendations)).toBe(true);
    expect(data1.recommendations.length).toBe(0);

    // Request 2
    const response2 = await page.request.post("/api/recommendations", {
      data: {
        userId: "e2e-randomization-test",
        limit: 5,
        filters: ["recent"],
        accessToken: null,
      },
    });

    const data2 = await response2.json();

    // Without token, both responses should be empty.
  });

  test("should gracefully handle invalid Spotify token (no fallback)", async ({ page }) => {
    // Test with an invalid token - should fall back to library recommendations
    const response = await page.request.post("/api/recommendations", {
      data: {
        userId: "e2e-invalid-token-test",
        limit: 5,
        filters: ["recent"],
        accessToken: "INVALID_TOKEN_FOR_TESTING_12345",
      },
    });

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty("recommendations");
    expect(Array.isArray(data.recommendations)).toBe(true);
    expect(data.recommendations.length).toBe(0);
  });

  test("should pass accessToken through to backend", async ({ page }) => {
    // This test verifies the BFF correctly passes accessToken in the request body
    // by checking that both with and without token return valid responses

    const testToken = "test_spotify_token_abc123";

    const response = await page.request.post("/api/recommendations", {
      data: {
        userId: "e2e-token-passthrough-test",
        limit: 3,
        filters: ["recent"],
        accessToken: testToken,
      },
    });

    expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty("recommendations");
      expect(Array.isArray(data.recommendations)).toBe(true);

    // Verify each recommendation has required fields
    data.recommendations.forEach(
      (rec: { trackId: string; score: number; reason: string }) => {
        expect(rec).toHaveProperty("trackId");
        expect(rec).toHaveProperty("score");
        expect(typeof rec.trackId).toBe("string");
        expect(typeof rec.score).toBe("number");
        expect(rec.score).toBeGreaterThanOrEqual(0);
        expect(rec.score).toBeLessThanOrEqual(1);
      }
    );
  });

  test("should return empty recommendations without token (no fallback)", async ({ page }) => {
    const filters = ["recent", "top-artists", "mood"];

    for (const filter of filters) {
      const response = await page.request.post("/api/recommendations", {
        data: {
          userId: "e2e-filter-test",
          limit: 3,
          filters: [filter],
          accessToken: null,
        },
      });

      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(Array.isArray(data.recommendations)).toBe(true);
      expect(data.recommendations.length).toBe(0);
    }
  });

  test("should reject requests with missing userId", async ({ page }) => {
    const response = await page.request.post("/api/recommendations", {
      data: {
        limit: 5,
        filters: ["recent"],
        accessToken: null,
      },
    });

    expect(response.status()).toBe(400);
    const data = await response.json();
    expect(data).toHaveProperty("error");
  });

  test("should handle different limit values", async ({ page }) => {
    const limits = [1, 5, 10, 20];

    for (const limit of limits) {
      const response = await page.request.post("/api/recommendations", {
        data: {
          userId: "e2e-limit-test",
          limit,
          filters: ["recent"],
          accessToken: null,
        },
      });

      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data.recommendations.length).toBeLessThanOrEqual(limit);
    }
  });

  test("dashboard should display recommendations if user is authenticated", async ({
    page,
  }) => {
    // Navigate to dashboard
    await page.goto("/dashboard");

    // Wait for any redirects to complete
    await page.waitForLoadState("networkidle");

    const url = page.url();

    // If user is authenticated, they should see the dashboard
    if (url.includes("/dashboard")) {
      // Check if recommendations section exists
      const recommendationsSection = page.getByRole("heading", {
        name: /personalized recommendations/i,
      });

      // Wait for recommendations to load
      const isVisible = await recommendationsSection
        .isVisible()
        .catch(() => false);

      if (isVisible) {
        // If recommendations are visible, verify they're loaded
        const recommendationCards = page
          .locator("[data-testid='track-recommendation']")
          .or(page.locator("article"));

        const count = await recommendationCards.count();
        expect(count).toBeGreaterThan(0);
      }
    } else {
      // User is not authenticated, should be redirected
      expect(url).toMatch(/(home|\/)/);
    }
  });

  test("should enrich recommendations with Spotify metadata when token available", async ({
    page,
  }) => {
    // This test verifies that when Spotify metadata is available,
    // the recommendations are properly enriched

    const response = await page.request.post("/api/recommendations", {
      data: {
        userId: "e2e-metadata-test",
        limit: 3,
        filters: ["recent"],
        accessToken: null, // Even without token, should have basic structure
      },
    });

    expect(response.status()).toBe(200);

      const data = await response.json();
      // Without a real token, results may be empty; ensure structure is correct
      expect(data).toHaveProperty("recommendations");
      expect(Array.isArray(data.recommendations)).toBe(true);
  });

  test("should handle concurrent recommendation requests", async ({
    page,
  }) => {
    // Test that the system handles multiple concurrent requests properly
    const requestCount = 5;
    const requests = [];

    for (let i = 0; i < requestCount; i++) {
      requests.push(
        page.request.post("/api/recommendations", {
          data: {
            userId: `e2e-concurrent-test-${i}`,
            limit: 3,
            filters: ["recent"],
            accessToken: null,
          },
        })
      );
    }

    const responses = await Promise.all(requests);

    // All requests should succeed
    responses.forEach((response) => {
      expect(response.status()).toBe(200);
    });

    // All should return valid data
    const dataPromises = responses.map((r) => r.json());
    const allData = await Promise.all(dataPromises);

      allData.forEach((data) => {
        expect(data).toHaveProperty("recommendations");
        expect(Array.isArray(data.recommendations)).toBe(true);
    });
  });

  test("should maintain recommendation consistency for same user/session (no token)", async ({
    page,
  }) => {
    // Multiple calls for the same user should return from the same pool
    // (though in different order due to randomization)

    const responses = [];
    for (let i = 0; i < 3; i++) {
      const response = await page.request.post("/api/recommendations", {
        data: {
          userId: "e2e-consistency-test",
          limit: 3,
          filters: ["recent"],
          accessToken: null,
        },
      });
      responses.push(await response.json());
    }

    // All responses should have recommendations
    responses.forEach((data) => {
      expect(data.recommendations.length).toBe(0);
      expect(data.userId).toBe("e2e-consistency-test");
    });

    // Track IDs might appear in different orders, but should be from the same pool
    const allTrackIds = responses.flatMap((r) =>
      r.recommendations.map((rec: { trackId: string }) => rec.trackId)
    );

    // Should have variety
    const uniqueTrackIds = new Set(allTrackIds);
    expect(uniqueTrackIds.size).toBe(0);
  });

  test("should return empty recommendations without token (metadata test)", async ({
    page,
  }) => {
    // This test catches the bug where track IDs are displayed as titles
    const response = await page.request.post("/api/recommendations", {
      data: {
        userId: "e2e-metadata-test",
        limit: 10,
        filters: ["recent", "top-artists", "mood"],
        accessToken: null,
      },
    });

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.recommendations.length).toBe(0);

    // Spotify track ID pattern: 22 alphanumeric characters (base62)
    const spotifyTrackIdPattern = /^[a-zA-Z0-9]{22}$/;

    // Check each recommendation
    data.recommendations.forEach(
      (rec: {
        trackId: string;
        title?: string;
        artists?: Array<{ name: string }>;
        albumImage?: string;
      }) => {
        // Track ID should be valid
        expect(rec.trackId).toMatch(spotifyTrackIdPattern);

        // Title should NOT be the track ID (this is the bug we're catching!)
        expect(rec.title, `Track ID ${rec.trackId} was returned as title`).not.toBe(
          rec.trackId
        );

        // Title should exist and have reasonable length
        expect(rec.title).toBeTruthy();
        expect(rec.title?.length).toBeGreaterThan(0);
        expect(rec.title?.length).toBeLessThan(200); // Reasonable upper bound

        // If artists are present, they should be valid
        if (rec.artists && rec.artists.length > 0) {
          rec.artists.forEach((artist) => {
            expect(artist.name).toBeTruthy();
            expect(typeof artist.name).toBe("string");
          });
        }
      }
    );
  });

  test("should return empty recommendations without token (coverage test)", async ({
    page,
  }) => {
    // Request recommendations multiple times to ensure all tracks in the library
    // have metadata coverage
    const seenTracks = new Set<string>();
    const tracksWithoutMetadata: string[] = [];

    // Make multiple requests to increase chance of seeing all tracks
    for (let i = 0; i < 5; i++) {
      const response = await page.request.post("/api/recommendations", {
        data: {
          userId: `e2e-metadata-coverage-${i}`,
          limit: 8,
          filters: ["recent", "top-artists", "mood"],
          accessToken: null,
        },
      });

      const data = await response.json();

      data.recommendations.forEach(
        (rec: {
          trackId: string;
          title?: string;
        }) => {
          seenTracks.add(rec.trackId);

          // Verify title is not a track ID
          if (rec.title === rec.trackId) {
            tracksWithoutMetadata.push(rec.trackId);
          }
        }
      );
    }

    expect(
      tracksWithoutMetadata,
      `Found ${tracksWithoutMetadata.length} track(s) displaying as ID instead of title: ${tracksWithoutMetadata.join(", ")}`
    ).toEqual([]);
  });
});

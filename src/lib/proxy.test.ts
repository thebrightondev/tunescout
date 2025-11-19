import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { proxyRecommendations, requestAvailableFilters, submitRecommendationFeedback } from "@/lib/proxy";

describe( "proxyRecommendations", () => {
  const originalTuneHubEnv = process.env.TUNEHUB_API_URL;

  beforeEach( () => {
    process.env.TUNEHUB_API_URL = "https://api.test";
  } );

  afterEach( () => {
    process.env.TUNEHUB_API_URL = originalTuneHubEnv;
    vi.unstubAllGlobals();
  } );

  test( "forwards payload to Tunescout API and returns response", async () => {
    const backendResponse = {
      userId: "user-1",
      recommendations: [
        {
          trackId: "0VjIjW4GlUZAMYd2vXMi3b",
          score: 0.918,
          reason: "Recent favorites",
        },
      ],
    };

    const fetchMock = vi.fn().mockResolvedValue( {
      ok: true,
      json: async () => backendResponse,
    } );
    vi.stubGlobal( "fetch", fetchMock );

    const result = await proxyRecommendations( { userId: "user-1", limit: 3, filters: ["recent"] } );

    expect( fetchMock ).toHaveBeenCalledWith( "https://api.test/api/recommendations", expect.objectContaining( {
      method: "POST",
    } ) );
    expect( result ).toEqual( backendResponse );
  } );

  test( "throws when backend responds with error", async () => {
    const fetchMock = vi.fn().mockResolvedValue( {
      ok: false,
      status: 500,
      json: async () => ( { message: "boom" } ),
    } );
    vi.stubGlobal( "fetch", fetchMock );

    await expect( proxyRecommendations( { userId: "user-1" } ) ).rejects.toThrow( "boom" );
  } );
} );

describe( "requestAvailableFilters", () => {
  const originalTuneHubEnv = process.env.TUNEHUB_API_URL;

  beforeEach( () => {
    process.env.TUNEHUB_API_URL = "https://api.test";
  } );

  afterEach( () => {
    process.env.TUNEHUB_API_URL = originalTuneHubEnv;
    vi.unstubAllGlobals();
  } );

  test( "returns available filters when backend succeeds", async () => {
    const fetchMock = vi.fn().mockResolvedValue( {
      ok: true,
      json: async () => ["recent", "mood"],
    } );
    vi.stubGlobal( "fetch", fetchMock );

    const filters = await requestAvailableFilters();

    expect( filters ).toEqual( ["recent", "mood"] );
  } );

  test( "returns empty array when backend fails", async () => {
    const fetchMock = vi.fn().mockResolvedValue( {
      ok: false,
    } );
    vi.stubGlobal( "fetch", fetchMock );

    const filters = await requestAvailableFilters();

    expect( filters ).toEqual( [] );
  } );
} );

describe( "submitRecommendationFeedback", () => {
  const originalTuneHubEnv = process.env.TUNEHUB_API_URL;

  beforeEach( () => {
    process.env.TUNEHUB_API_URL = "https://api.test";
  } );

  afterEach( () => {
    process.env.TUNEHUB_API_URL = originalTuneHubEnv;
    vi.unstubAllGlobals();
  } );

  test( "posts feedback payload to TuneHub", async () => {
    const fetchMock = vi.fn().mockResolvedValue( {
      ok: true,
      status: 202,
      json: async () => ( { status: "ok" } ),
    } );
    vi.stubGlobal( "fetch", fetchMock );

    await submitRecommendationFeedback( {
      userId: "user-1",
      trackId: "track-abc",
      score: 0.8,
      action: "like",
    } );

    expect( fetchMock ).toHaveBeenCalledWith( "https://api.test/api/recommendations/feedback", expect.any( Object ) );
  } );

  test( "throws when backend rejects feedback", async () => {
    const fetchMock = vi.fn().mockResolvedValue( {
      ok: false,
      status: 400,
      json: async () => ( { message: "bad request" } ),
    } );
    vi.stubGlobal( "fetch", fetchMock );

    await expect( submitRecommendationFeedback( {
      userId: "user-1",
      trackId: "track-abc",
      score: 0.8,
      action: "like",
    } ) ).rejects.toThrow( "bad request" );
  } );
} );


describe( "requestAvailableFilters", () => {
  const originalTuneHubEnv = process.env.TUNEHUB_API_URL;
  const originalLegacyEnv = process.env.TUNESCOUT_API_URL;

  beforeEach( () => {
    process.env.TUNEHUB_API_URL = "https://api.test";
    delete process.env.TUNESCOUT_API_URL;
  } );

  afterEach( () => {
    process.env.TUNEHUB_API_URL = originalTuneHubEnv;
    if ( typeof originalLegacyEnv === "undefined" ) {
      delete process.env.TUNESCOUT_API_URL;
    } else {
      process.env.TUNESCOUT_API_URL = originalLegacyEnv;
    }
    vi.unstubAllGlobals();
  } );

  test( "returns available filters when backend succeeds" , async () => {
    const fetchMock = vi.fn().mockResolvedValue( {
      ok: true,
      json: async () => ["recent", "mood"],
    } );
    vi.stubGlobal( "fetch", fetchMock );

    const filters = await requestAvailableFilters();

    expect( filters ).toEqual( ["recent", "mood"] );
  } );

  test( "returns empty array when backend fails" , async () => {
    const fetchMock = vi.fn().mockResolvedValue( {
      ok: false,
    } );
    vi.stubGlobal( "fetch", fetchMock );

    const filters = await requestAvailableFilters();

    expect( filters ).toEqual( [] );
  } );
} );

describe( "submitRecommendationFeedback", () => {
  const originalTuneHubEnv = process.env.TUNEHUB_API_URL;

  beforeEach( () => {
    process.env.TUNEHUB_API_URL = "https://api.test";
  } );

  afterEach( () => {
    process.env.TUNEHUB_API_URL = originalTuneHubEnv;
    vi.unstubAllGlobals();
  } );

  test( "posts feedback payload to TuneHub" , async () => {
    const fetchMock = vi.fn().mockResolvedValue( {
      ok: true,
      json: async () => ( { status: "accepted" } ),
    } );
    vi.stubGlobal( "fetch", fetchMock );

    await submitRecommendationFeedback( {
      userId: "user-1",
      trackId: "0VjIjW4GlUZAMYd2vXMi3b",
      action: "like",
      score: 0.92,
      rank: 1,
      reason: "Recent favorites",
      source: "dashboard",
    } );

    expect( fetchMock ).toHaveBeenCalledWith( "https://api.test/api/recommendations/feedback", expect.objectContaining( {
      method: "POST",
    } ) );
    const body = JSON.parse( ( fetchMock.mock.calls[0][1] as RequestInit ).body as string );
    expect( body ).toMatchObject( {
      userId: "user-1",
      trackId: "0VjIjW4GlUZAMYd2vXMi3b",
      action: "like",
      rank: 1,
      reason: "Recent favorites",
      score: 0.92,
      source: "dashboard",
    } );
  } );

  test( "throws when backend rejects feedback" , async () => {
    const fetchMock = vi.fn().mockResolvedValue( {
      ok: false,
      status: 500,
      json: async () => ( { message: "failed" } ),
    } );
    vi.stubGlobal( "fetch", fetchMock );

    await expect( submitRecommendationFeedback( {
      userId: "user-2",
      trackId: "track-123",
      action: "dislike",
    } ) ).rejects.toThrow( "failed" );
  } );
} );

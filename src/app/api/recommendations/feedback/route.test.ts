import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const submitRecommendationFeedback = vi.fn();
const authMock = vi.fn();

vi.mock( "@/lib/recommendations", () => ( {
  submitRecommendationFeedback,
} ) );

vi.mock( "@/auth", () => ( {
  auth: authMock,
} ) );

describe( "POST /api/recommendations/feedback", () => {
  beforeEach( () => {
    vi.spyOn( console, "error" ).mockImplementation( () => {} );
  } );

  afterEach( () => {
    vi.resetAllMocks();
    vi.resetModules();
    vi.restoreAllMocks();
  } );

  test( "returns 401 when user is not authenticated", async () => {
    authMock.mockResolvedValueOnce( null );
    const { POST } = await import( "./route" );

    const response = await POST( new Request( "http://localhost", {
      method: "POST",
      body: JSON.stringify( { trackId: "track-1", action: "like" } ),
    } ) );

    expect( response.status ).toBe( 401 );
    expect( submitRecommendationFeedback ).not.toHaveBeenCalled();
  } );

  test( "returns 400 when trackId missing", async () => {
    authMock.mockResolvedValueOnce( { user: { email: "user@example.com" } } );
    const { POST } = await import( "./route" );

    const response = await POST( new Request( "http://localhost", {
      method: "POST",
      body: JSON.stringify( { action: "like" } ),
    } ) );

    expect( response.status ).toBe( 400 );
  } );

  test( "returns 400 when action invalid", async () => {
    authMock.mockResolvedValueOnce( { user: { email: "user@example.com" } } );
    const { POST } = await import( "./route" );

    const response = await POST( new Request( "http://localhost", {
      method: "POST",
      body: JSON.stringify( { trackId: "track-1", action: "save" } ),
    } ) );

    expect( response.status ).toBe( 400 );
  } );

  test( "submits feedback to backend", async () => {
    authMock.mockResolvedValueOnce( { user: { email: "user@example.com" } } );
    submitRecommendationFeedback.mockResolvedValueOnce( undefined );
    const { POST } = await import( "./route" );

    const response = await POST( new Request( "http://localhost", {
      method: "POST",
      body: JSON.stringify( { trackId: "track-1", action: "like", reason: "Recent favorites", rank: 2 } ),
    } ) );

    expect( response.status ).toBe( 202 );
    expect( submitRecommendationFeedback ).toHaveBeenCalledWith( expect.objectContaining( {
      userId: "user@example.com",
      trackId: "track-1",
      action: "like",
      rank: 2,
    } ) );
  } );

  test( "returns 502 when backend throws", async () => {
    authMock.mockResolvedValueOnce( { user: { email: "user@example.com" } } );
    submitRecommendationFeedback.mockRejectedValueOnce( new Error( "boom" ) );
    const { POST } = await import( "./route" );

    const response = await POST( new Request( "http://localhost", {
      method: "POST",
      body: JSON.stringify( { trackId: "track-2", action: "dislike" } ),
    } ) );

    expect( response.status ).toBe( 502 );
  } );
} );

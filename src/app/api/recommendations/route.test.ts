import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const proxyRecommendations = vi.fn();

vi.mock( "@/lib/proxy", () => ( {
  proxyRecommendations,
} ) );

describe( "POST /api/recommendations", () => {
  beforeEach( () => {
    vi.spyOn( console, "error" ).mockImplementation( () => {} );
  } );

  afterEach( () => {
    vi.resetAllMocks();
    vi.resetModules();
    vi.restoreAllMocks();
  } );

  test( "returns 400 when payload is missing userId", async () => {
    const { POST } = await import( "./route" );

    const response = await POST( new Request( "http://localhost", {
      method: "POST",
      body: JSON.stringify( {} ),
    } ) );

    expect( response.status ).toBe( 400 );
  } );

  test( "returns empty list when accessToken is missing", async () => {
    const { POST } = await import( "./route" );

    const response = await POST( new Request( "http://localhost", {
      method: "POST",
      body: JSON.stringify( { userId: "user-1", limit: 5, accessToken: "" } ),
    } ) );

    expect( response.status ).toBe( 200 );
    expect( await response.json() ).toEqual( { userId: "user-1", recommendations: [] } );
    expect( proxyRecommendations ).not.toHaveBeenCalled();
  } );

  test( "proxies recommendations when token provided", async () => {
    const mockResponse = {
      userId: "user-1",
      recommendations: [],
    };
    proxyRecommendations.mockResolvedValueOnce( mockResponse );

    const { POST } = await import( "./route" );

    const response = await POST( new Request( "http://localhost", {
      method: "POST",
      body: JSON.stringify( { userId: "user-1", limit: 5, accessToken: "abc" } ),
    } ) );

    expect( response.status ).toBe( 200 );
    expect( await response.json() ).toEqual( mockResponse );
    expect( proxyRecommendations ).toHaveBeenCalledWith( expect.objectContaining( { userId: "user-1", accessToken: "abc" } ) );
  } );

  test( "returns 502 when backend fails", async () => {
    proxyRecommendations.mockRejectedValueOnce( new Error( "backend down" ) );

    const { POST } = await import( "./route" );

    const response = await POST( new Request( "http://localhost", {
      method: "POST",
      body: JSON.stringify( { userId: "user-2" } ),
    } ) );

    expect( response.status ).toBe( 502 );
  } );
} );

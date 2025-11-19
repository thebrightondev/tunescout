import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const requestAvailableFilters = vi.fn();

vi.mock( "@/lib/recommendations", () => ( {
  requestAvailableFilters,
} ) );

describe( "GET /api/recommendations/filters", () => {
  beforeEach( () => {
    vi.spyOn( console, "error" ).mockImplementation( () => {} );
  } );

  afterEach( () => {
    vi.resetAllMocks();
    vi.resetModules();
    vi.restoreAllMocks();
  } );

  test( "returns filters from backend", async () => {
    requestAvailableFilters.mockResolvedValueOnce( ["recent"] );

    const { GET } = await import( "./route" );
    const response = await GET();

    expect( response.status ).toBe( 200 );
    expect( await response.json() ).toEqual( ["recent"] );
  } );

  test( "returns empty list on failure", async () => {
    requestAvailableFilters.mockRejectedValueOnce( new Error( "boom" ) );

    const { GET } = await import( "./route" );
    const response = await GET();

    expect( response.status ).toBe( 200 );
    expect( await response.json() ).toEqual( [] );
  } );
} );

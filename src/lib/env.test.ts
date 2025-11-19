import { afterAll, beforeEach, describe, expect, test } from "vitest";

import { getTuneHubApiUrl } from "@/lib/env";

describe( "getTuneHubApiUrl", () => {
  const originalTuneHubEnv = process.env.TUNEHUB_API_URL;
  const originalLegacyEnv = process.env.TUNESCOUT_API_URL;

  beforeEach( () => {
    delete process.env.TUNEHUB_API_URL;
    delete process.env.TUNESCOUT_API_URL;
  } );

  afterAll( () => {
    if ( typeof originalTuneHubEnv === "undefined" ) {
      delete process.env.TUNEHUB_API_URL;
    } else {
      process.env.TUNEHUB_API_URL = originalTuneHubEnv;
    }

    if ( typeof originalLegacyEnv === "undefined" ) {
      delete process.env.TUNESCOUT_API_URL;
    } else {
      process.env.TUNESCOUT_API_URL = originalLegacyEnv;
    }
  } );

  test( "returns fallback URL when environment variables are absent", () => {
    expect( getTuneHubApiUrl() ).toBe( "http://tunescout.local.com:8080" );
  } );

  test( "normalizes trailing slash from configured URL", () => {
    process.env.TUNEHUB_API_URL = "https://backend.tunescout.local/api/";

    expect( getTuneHubApiUrl() ).toBe( "https://backend.tunescout.local/api" );
  } );

  test( "prefers legacy environment variable when primary is unset", () => {
    process.env.TUNESCOUT_API_URL = "https://legacy.tunescout.local/";

    expect( getTuneHubApiUrl() ).toBe( "https://legacy.tunescout.local" );
  } );
} );

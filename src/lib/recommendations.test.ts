import { describe, expect, test, vi } from "vitest";

import { enrichRecommendations } from "@/lib/recommendations";
import * as spotify from "@/lib/spotify";
import type { RecommendationResponse, TrackRecommendation } from "@/types/recommendations";

vi.mock( "@/lib/spotify", async () => {
  const actual = await vi.importActual<typeof spotify>( "@/lib/spotify" );
  return {
    ...actual,
    loadSpotifyTrackDetails: vi.fn(),
    mergeRecommendationsWithSpotify: vi.fn(),
  };
} );

describe( "enrichRecommendations", () => {
  test( "returns empty array if no recommendations are provided", async () => {
    const response: RecommendationResponse = { userId: "user-1", recommendations: [] };
    const result = await enrichRecommendations( response, "token" );
    expect( result ).toEqual( [] );
  } );

  test( "builds fallback recommendations if no access token is provided", async () => {
    const response: RecommendationResponse = {
      userId: "user-1",
      recommendations: [{ trackId: "t1", score: 0.9 }],
    };
    const result = await enrichRecommendations( response, null );
    expect( result[0].title ).toBe( "t1" );
    expect( result[0].artists[0].name ).toBe( "Unknown artist" );
  } );

  test( "builds fallback recommendations if Spotify details are empty", async () => {
    vi.mocked( spotify.loadSpotifyTrackDetails ).mockResolvedValue( [] );
    const response: RecommendationResponse = {
      userId: "user-1",
      recommendations: [{ trackId: "t1", score: 0.9 }],
    };
    const result = await enrichRecommendations( response, "token" );
    expect( result[0].title ).toBe( "t1" );
  } );

  test( "merges recommendations with Spotify details", async () => {
    const mockMerged: TrackRecommendation[] = [
      {
        trackId: "t1",
        score: 0.9,
        reason: "popular",
        title: "Track 1",
        artists: [{ id: "a1", name: "Artist 1", image: null }],
        albumImage: null,
        previewUrl: null,
        spotifyUrl: null,
      },
    ];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked( spotify.loadSpotifyTrackDetails ).mockResolvedValue( [{ id: "t1" }] as any );
    vi.mocked( spotify.mergeRecommendationsWithSpotify ).mockReturnValue( mockMerged );

    const response: RecommendationResponse = {
      userId: "user-1",
      recommendations: [{ trackId: "t1", score: 0.9, reason: "popular" }],
    };
    const result = await enrichRecommendations( response, "token" );
    expect( spotify.mergeRecommendationsWithSpotify ).toHaveBeenCalled();
    expect( result ).toEqual( mockMerged );
  } );
} );

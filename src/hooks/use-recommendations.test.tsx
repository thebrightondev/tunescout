import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useRecommendations } from "@/hooks/use-recommendations";
import * as recommendations from "@/lib/recommendations";
import type { TrackRecommendation } from "@/types/recommendations";

vi.mock( "@/lib/recommendations" );

const flushPromises = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

describe( "useRecommendations", () => {
  beforeEach( () => {
    vi.mocked( recommendations.proxyRecommendations ).mockClear();
    vi.mocked( recommendations.submitRecommendationFeedback ).mockClear();
    vi.mocked( recommendations.enrichRecommendations ).mockClear();
  } );

  afterEach( () => {
    vi.useRealTimers();
  } );

  it( "loads recommendations and updates ready state", async () => {
    const mockRecs: TrackRecommendation[] = [
      {
        trackId: "track-1",
        score: 0.82,
        reason: "recent",
        title: "Track One",
        artists: [{ id: "artist-1", name: "Artist One", image: null }],
        albumImage: null,
        previewUrl: null,
        spotifyUrl: null,
      },
    ];
    vi.mocked( recommendations.proxyRecommendations ).mockResolvedValueOnce( { recommendations: [{ trackId: "track-1", score: 0.82, reason: "recent" }] } );
    vi.mocked( recommendations.enrichRecommendations ).mockResolvedValueOnce( mockRecs );

    const { result } = renderHook( () => useRecommendations( {
      userId: "user-123",
      accessToken: "token-abc",
      autoLoad: false,
    } ) );

    expect( result.current.state.status ).toBe( "idle" );

    await act( async () => {
      await result.current.refresh();
    } );

    expect( recommendations.proxyRecommendations ).toHaveBeenCalledWith( {
      userId: "user-123",
      limit: 10,
      filters: [],
    } );

    expect( result.current.state.status ).toBe( "ready" );
    if ( result.current.state.status === "ready" ) {
      expect( result.current.state.recommendations ).toHaveLength( 1 );
      expect( result.current.state.recommendations[0].title ).toBe( "Track One" );
      expect( result.current.state.recommendations[0].artists[0].name ).toBe( "Artist One" );
    }
  } );

  it( "submits feedback with optimistic score adjustments", async () => {
    const initialRecs: TrackRecommendation[] = [
      {
        trackId: "track-1",
        score: 0.4,
        reason: null,
        title: "Track One",
        artists: [],
        albumImage: null,
        previewUrl: null,
        spotifyUrl: null,
      },
    ];
    vi.mocked( recommendations.proxyRecommendations ).mockResolvedValueOnce( { recommendations: [{ trackId: "track-1", score: 0.4, reason: null }] } );
    vi.mocked( recommendations.enrichRecommendations ).mockResolvedValueOnce( initialRecs );
    vi.mocked( recommendations.submitRecommendationFeedback ).mockResolvedValueOnce();

    const { result } = renderHook( () => useRecommendations( {
      userId: "user-123",
      accessToken: "token-abc",
      autoLoad: false,
    } ) );

    await act( async () => {
      await result.current.refresh();
    } );

    const recommendation =
      result.current.state.status === "ready"
        ? result.current.state.recommendations[0]
        : null;

    expect( recommendation ).not.toBeNull();

    await act( async () => {
      await result.current.sendFeedback( recommendation as TrackRecommendation, "like" );
    } );

    expect( recommendations.submitRecommendationFeedback ).toHaveBeenCalled();

    if ( result.current.state.status === "ready" ) {
      expect( result.current.state.recommendations[0].score ).toBeGreaterThan( 0.4 );
    }

    expect( result.current.feedbackState["track-1"].lastAction ).toBe( "like" );
    expect( result.current.feedbackState["track-1"].isPending ).toBe( false );
  } );

  it( "handles failed recommendation fetch", async () => {
    vi.mocked( recommendations.proxyRecommendations ).mockRejectedValueOnce( new Error( "nope" ) );

    const { result } = renderHook( () => useRecommendations( {
      userId: "user-123",
      autoLoad: false,
    } ) );

    await act( async () => {
      await result.current.refresh();
    } );

    expect( result.current.state.status ).toBe( "error" );
  } );

  it( "optionally refetches recommendations after successful feedback", async () => {
    vi.useFakeTimers();

    const initialRecs: TrackRecommendation[] = [
      {
        trackId: "track-1",
        score: 0.5,
        reason: null,
        title: "Track One",
        artists: [],
        albumImage: null,
        previewUrl: null,
        spotifyUrl: null,
      },
    ];
    vi.mocked( recommendations.proxyRecommendations )
      .mockResolvedValueOnce( { recommendations: [{ trackId: "track-1", score: 0.5, reason: null }] } )
      .mockResolvedValueOnce( { recommendations: [{ trackId: "track-2", score: 0.9, reason: null }] } );
    vi.mocked( recommendations.enrichRecommendations )
      .mockResolvedValueOnce( initialRecs )
      .mockResolvedValueOnce( [{ ...initialRecs[0], trackId: "track-2" }] );
    vi.mocked( recommendations.submitRecommendationFeedback ).mockResolvedValueOnce();

    const { result } = renderHook( () => useRecommendations( {
      userId: "user-123",
      autoLoad: true,
      refetchAfterFeedback: true,
      refetchAfterFeedbackDelayMs: 500,
      accessToken: "token-abc",
    } ) );

    await act( async () => {
      await flushPromises();
    } );

    expect( result.current.state.status ).toBe( "ready" );
    const recommendation =
      result.current.state.status === "ready"
        ? result.current.state.recommendations[0]
        : null;

    await act( async () => {
      await result.current.sendFeedback( recommendation as TrackRecommendation, "like" );
      await vi.advanceTimersByTimeAsync( 600 );
    } );

    expect( recommendations.proxyRecommendations ).toHaveBeenCalledTimes( 2 );
    if ( result.current.state.status === "ready" ) {
      expect( result.current.state.recommendations[0].trackId ).toBe( "track-2" );
    }
  } );
} );

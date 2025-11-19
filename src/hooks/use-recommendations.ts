'use client';

import * as React from "react";

import { enrichRecommendations } from "@/lib/recommendations";
import type {
  BaseTrackRecommendation,
  RecommendationState,
  TrackRecommendation,
} from "@/types/recommendations";

type FeedbackStatus = {
  isPending: boolean;
  lastAction: "like" | "dislike" | null;
  error?: string | null;
};

type UseRecommendationsOptions = {
  userId?: string | null;
  accessToken?: string | null;
  limit?: number;
  filters?: string[];
  autoLoad?: boolean;
  onFeedbackSuccess?: (
    item: TrackRecommendation,
    action: "like" | "dislike",
  ) => void;
  onFeedbackError?: (
    item: TrackRecommendation,
    action: "like" | "dislike",
    error: Error,
  ) => void;
  refetchAfterFeedback?: boolean;
  refetchAfterFeedbackDelayMs?: number;
};

type UseRecommendationsResult = {
  state: RecommendationState;
  isFetching: boolean;
  refresh: () => Promise<void>;
  sendFeedback: (
    item: TrackRecommendation,
    action: "like" | "dislike",
    rank?: number,
  ) => Promise<void>;
  feedbackState: Record<string, FeedbackStatus>;
};

const DEFAULT_ARTIST = {
  id: null,
  name: "Unknown artist",
  image: null,
} as const;

function buildFallbackRecommendations (
  recommendations: BaseTrackRecommendation[],
): TrackRecommendation[] {
  return recommendations.map( ( recommendation ) => ( {
    trackId: recommendation.trackId,
    score: recommendation.score,
    reason: recommendation.reason ?? null,
    title: recommendation.title ?? recommendation.trackId,
    artists: recommendation.artists && recommendation.artists.length > 0
      ? recommendation.artists.map( ( name ) => ( {
        id: null,
        name,
        image: null,
      } ) )
      : [DEFAULT_ARTIST],
    albumImage: recommendation.albumImage ?? null,
    previewUrl: null,
    spotifyUrl: null,
  } satisfies TrackRecommendation ) );
}

async function readErrorMessage ( response: Response ): Promise<string | null> {
  try {
    const data = await response.json();
    if ( typeof data === "object" && data && "error" in data ) {
      return String( ( data as { error: unknown } ).error );
    }
  } catch ( _error ) {
    // Ignore parsing issues and fall back to generic text if needed.
  }

  try {
    const text = await response.text();
    return text && text.trim().length > 0 ? text : null;
  } catch ( _error ) {
    return null;
  }
}

export function useRecommendations ( options: UseRecommendationsOptions ): UseRecommendationsResult {
  const {
    userId = null,
    accessToken = null,
    limit = 30,
    filters = [],
    autoLoad = false,
    onFeedbackSuccess,
    onFeedbackError,
    refetchAfterFeedback = false,
    refetchAfterFeedbackDelayMs = 250,
  } = options;

  const [state, setState] = React.useState<RecommendationState>( () => ( {
    status: autoLoad && !!userId ? "loading" : "idle",
  } ) );
  const [isFetching, setIsFetching] = React.useState( () => autoLoad && !!userId );
  const [feedbackState, setFeedbackState] = React.useState<Record<string, FeedbackStatus>>( {} );

  const stateRef = React.useRef( state );
  const filtersRef = React.useRef( filters );
  const requestIdRef = React.useRef( 0 );
  const feedbackRefetchTimeout = React.useRef<number | null>( null );

  React.useEffect( () => {
    stateRef.current = state;
  }, [state] );

  React.useEffect( () => {
    filtersRef.current = filters;
  }, [filters] );

  React.useEffect( () => () => {
    if ( feedbackRefetchTimeout.current !== null ) {
      window.clearTimeout( feedbackRefetchTimeout.current );
      feedbackRefetchTimeout.current = null;
    }
  }, [] );

  const transformRecommendations = React.useCallback(
    async ( recommendations: BaseTrackRecommendation[] ): Promise<TrackRecommendation[]> => {
      if ( recommendations.length === 0 ) {
        return [];
      }

      const enriched = await enrichRecommendations(
        { userId: userId ?? "unknown", recommendations },
        accessToken,
      );
      return enriched;
    },
    [accessToken, userId],
  );

  const refresh = React.useCallback( async () => {
    if ( !userId || userId.trim().length === 0 ) {
      setState( { status: "error", error: "We need a Spotify user identifier to load recommendations." } );
      return;
    }

    const requestId = ++requestIdRef.current;
    setIsFetching( true );
    setState( ( s ) => s.status === "idle" || s.status === "error" ? { status: "loading" } : s );

    try {
      // Call the local API route instead of backend directly to avoid CORS/mixed content issues
      const apiResponse = await fetch( "/api/recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify( {
          userId,
          limit,
          filters: filtersRef.current,
          accessToken,
        } ),
        cache: "no-store",
      } );

      if ( !apiResponse.ok ) {
        const errorMsg = await readErrorMessage( apiResponse );
        throw new Error( errorMsg ?? `Failed to fetch recommendations (${apiResponse.status})` );
      }

      const response = await apiResponse.json();
      const enriched = await enrichRecommendations( response, accessToken );

      if ( requestIdRef.current !== requestId ) {
        return;
      }

      setFeedbackState( {} );
      setState( {
        status: "ready",
        recommendations: enriched,
        lastUpdated: Date.now(),
        lastError: null,
      } );
    } catch ( error ) {
      if ( requestIdRef.current !== requestId ) {
        return;
      }

      const message = error instanceof Error ? error.message : "Failed to load recommendations";
      setState( { status: "error", error: message } );
    } finally {
      if ( requestIdRef.current === requestId ) {
        setIsFetching( false );
      }
    }
  }, [accessToken, limit, userId] );

  React.useEffect( () => {
    if ( autoLoad && userId ) {
      void refresh();
    }
  }, [autoLoad, refresh, userId] );

  const sendFeedback = React.useCallback(
    async (
      item: TrackRecommendation,
      action: "like" | "dislike",
      rank?: number,
    ) => {
      if ( !userId || userId.trim().length === 0 ) {
        throw new Error( "Missing user identifier for feedback." );
      }

      const trackKey = item.trackId;
      const originalScore = item.score;
      let previousReadyState: Extract<RecommendationState, { status: "ready" }> | null = null;

      setFeedbackState( ( previous ) => ( {
        ...previous,
        [trackKey]: {
          isPending: true,
          lastAction: action,
          error: null,
        },
      } ) );

      setState( ( previous ) => {
        if ( previous.status !== "ready" ) {
          return previous;
        }

        previousReadyState = previous;
        const delta = action === "like" ? 0.05 : -0.05;
        const nextRecommendations = previous.recommendations.map( ( recommendation ) => {
          if ( recommendation.trackId !== trackKey ) {
            return recommendation;
          }

          const adjusted = Number.parseFloat( ( recommendation.score + delta ).toFixed( 4 ) );

          return {
            ...recommendation,
            score: Math.max( 0, Math.min( 0.99, adjusted ) ),
          };
        } );

        return {
          ...previous,
          recommendations: nextRecommendations,
          lastError: null,
        };
      } );

      try {
        const readyState = stateRef.current;
        const resolvedRank = typeof rank === "number"
          ? rank
          : readyState.status === "ready"
            ? readyState.recommendations.findIndex( ( recommendation ) => recommendation.trackId === trackKey )
            : null;

        // Call the local API route for feedback instead of backend directly
        const feedbackResponse = await fetch( "/api/recommendations/feedback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify( {
            userId,
            trackId: item.trackId,
            action,
            rank: resolvedRank ?? undefined,
            source: "dashboard",
            accessToken,
          } ),
          cache: "no-store",
        } );

        if ( !feedbackResponse.ok ) {
          const errorMsg = await readErrorMessage( feedbackResponse );
          throw new Error( errorMsg ?? `Feedback submission failed (${feedbackResponse.status})` );
        }

        setFeedbackState( ( previous ) => ( {
          ...previous,
          [trackKey]: {
            isPending: false,
            lastAction: action,
            error: null,
          },
        } ) );

        if ( onFeedbackSuccess ) {
          onFeedbackSuccess( item, action );
        }

        if ( refetchAfterFeedback ) {
          if ( feedbackRefetchTimeout.current !== null ) {
            window.clearTimeout( feedbackRefetchTimeout.current );
          }

          const delay = Math.max( 0, refetchAfterFeedbackDelayMs );
          feedbackRefetchTimeout.current = window.setTimeout( () => {
            feedbackRefetchTimeout.current = null;
            void refresh();
          }, delay );
        }
      } catch ( error ) {
        const message = error instanceof Error ? error.message : "Feedback submission failed";

        if ( previousReadyState ) {
          setState( previousReadyState );
        }

        setFeedbackState( ( previous ) => ( {
          ...previous,
          [trackKey]: {
            isPending: false,
            lastAction: null,
            error: message,
          },
        } ) );

        if ( onFeedbackError ) {
          const normalizedError = error instanceof Error ? error : new Error( message );
          onFeedbackError( item, action, normalizedError );
        }
      }
    },
    [onFeedbackError, onFeedbackSuccess, refetchAfterFeedback, refetchAfterFeedbackDelayMs, refresh, userId],
  );

  return React.useMemo( () => ( {
    state,
    isFetching,
    refresh,
    sendFeedback,
    feedbackState,
  } ), [feedbackState, isFetching, refresh, sendFeedback, state] );
}

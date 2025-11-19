import { getTuneHubApiUrl } from "@/lib/env";
import type { RecommendationResponse } from "@/types/recommendations";

type RecommendationParams = {
  userId: string;
  limit?: number;
  filters?: string[];
  accessToken?: string | null;
};

type FeedbackParams = {
  userId: string;
  trackId: string;
  action: "like" | "dislike";
  reason?: string | null;
  score?: number | null;
  rank?: number | null;
  source?: string | null;
  accessToken?: string | null;
};

async function safeReadError ( response: Response ): Promise<string | null> {
  try {
    const data = await response.json();
    if ( typeof data === "object" && data && "message" in data ) {
      return String( ( data as { message: unknown } ).message );
    }
  } catch ( _error ) {
    // Ignore parsing issues and fall back to generic message
  }

  return null;
}

function buildHeaders ( accessToken?: string | null ): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if ( accessToken ) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  return headers;
}

export async function proxyRecommendations ( params: RecommendationParams ): Promise<RecommendationResponse> {
  const baseUrl = getTuneHubApiUrl();
  const { userId, limit = 6, filters = [], accessToken } = params;

  const response = await fetch( `${baseUrl}/api/recommendations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify( {
      userId,
      limit,
      filters,
      accessToken: accessToken || null,
    } ),
    cache: "no-store",
  } );

  if ( !response.ok ) {
    const message = await safeReadError( response );
    throw new Error( message ?? `Recommendation request failed with status ${response.status}` );
  }

  return ( await response.json() ) as RecommendationResponse;
}

export async function requestAvailableFilters (): Promise<string[]> {
  const baseUrl = getTuneHubApiUrl();

  const response = await fetch( `${baseUrl}/api/recommendations/filters`, {
    method: "GET",
    cache: "no-store",
  } );

  if ( !response.ok ) {
    return [];
  }

  const body = ( await response.json() ) as unknown;
  return Array.isArray( body ) ? body.map( ( value ) => String( value ) ) : [];
}

export async function submitRecommendationFeedback ( params: FeedbackParams ): Promise<void> {
  const baseUrl = getTuneHubApiUrl();
  const { userId, trackId, action, reason = null, score = null, rank = null, source = null, accessToken } = params;

  const response = await fetch( `${baseUrl}/api/recommendations/feedback`, {
    method: "POST",
    headers: buildHeaders( accessToken ),
    body: JSON.stringify( {
      userId,
      trackId,
      action,
      reason,
      score,
      rank,
      source,
    } ),
    cache: "no-store",
  } );

  if ( !response.ok ) {
    const message = await safeReadError( response );
    throw new Error( message ?? `Feedback request failed with status ${response.status}` );
  }
}

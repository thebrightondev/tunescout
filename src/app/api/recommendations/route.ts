import { NextResponse } from "next/server";

import { enrichRecommendations, proxyRecommendations } from "@/lib/recommendations";
import { getMusicEngineUrl } from "@/lib/env";

async function getDislikedTrackIds(userId: string): Promise<Set<string>> {
  try {
    const baseUrl = getMusicEngineUrl();
    const response = await fetch(
      `${baseUrl}/feedback/tracks?user_id=${encodeURIComponent(userId)}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
      },
    );

    if (!response.ok) {
      console.warn(
        `Failed to fetch feedback track IDs: ${response.status}`,
      );
      return new Set();
    }

    const data = (await response.json()) as { track_ids?: string[] };
    return new Set(data.track_ids ?? []);
  } catch (error) {
    console.warn("Error fetching feedback track IDs:", error);
    return new Set();
  }
}

async function getCachedRecommendations(userId: string): Promise<Array<{
  trackId: string;
  title: string;
  artists: string[];
  albumImage?: string;
  score: number;
  reason?: string;
}>> {
  try {
    const baseUrl = getMusicEngineUrl();
    const response = await fetch(`${baseUrl}/recommendations/cached?user_id=${encodeURIComponent(userId)}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      console.warn(`Failed to fetch cached recommendations: ${response.status}`);
      return [];
    }

    const data = await response.json() as { recommendations?: Array<{
      track_id: string;
      title: string;
      artists: string;
      album_image?: string;
      score: number;
      reason?: string;
    }> };

    // Transform from snake_case to camelCase
    return (data.recommendations ?? []).map(rec => ({
      trackId: rec.track_id,
      title: rec.title,
      artists: typeof rec.artists === 'string' ? rec.artists.split(',').map(a => a.trim()) : [],
      albumImage: rec.album_image,
      score: rec.score,
      reason: rec.reason,
    }));
  } catch (error) {
    console.warn("Error fetching cached recommendations:", error);
    return [];
  }
}

export async function POST ( request: Request ) {
  const payload = ( await request.json().catch( () => ( {} ) ) ) as Partial<{
    userId: string;
    limit: number;
    filters: string[];
    accessToken: string;
  }>;

  if ( !payload.userId || payload.userId.trim().length === 0 ) {
    return NextResponse.json( { error: "Missing userId" }, { status: 400 } );
  }

  try {
    if ( !payload.accessToken || payload.accessToken.trim().length === 0 ) {
      // No Spotify token: return empty list to avoid curated fallback
      return NextResponse.json( { userId: payload.userId, recommendations: [] }, { status: 200 } );
    }
    const response = await proxyRecommendations( {
      userId: payload.userId,
      limit: payload.limit,
      filters: payload.filters,
      accessToken: payload.accessToken,
    } );

    const enriched = await enrichRecommendations( response, payload.accessToken ?? null );

    // Fetch all feedback track IDs (both liked and disliked)
    const feedbackTrackIds = await getDislikedTrackIds(payload.userId);
    
    // Filter out ALL tracked tracks from fresh recommendations
    const filtered = enriched.filter(
      (rec) => !feedbackTrackIds.has(rec.trackId),
    );

    // If no fresh recommendations after filtering, fall back to cached
    if (filtered.length === 0) {
      console.log(
        `No fresh recommendations after filtering for ${payload.userId}, checking cached`,
      );
      const cachedRecs = await getCachedRecommendations(payload.userId);

      // Filter out tracked tracks from cache too
      const filteredCached = cachedRecs.filter(
        (rec) => !feedbackTrackIds.has(rec.trackId),
      );

      if (filteredCached.length > 0) {
        console.log(
          `Using ${filteredCached.length} cached recommendations`,
        );
        return NextResponse.json(
          {
            userId: payload.userId,
            recommendations: filteredCached.map((rec) => ({
              trackId: rec.trackId,
              title: rec.title,
              artists: rec.artists,
              albumImage: rec.albumImage,
              score: rec.score,
              reason: rec.reason,
            })),
          },
          { status: 200 },
        );
      }
    }

    return NextResponse.json(
      {
        userId: response.userId,
        recommendations: filtered,
      },
      { status: 200 },
    );
  } catch ( error ) {
    console.error( "Failed to proxy recommendations", error );
    return NextResponse.json( { error: "Failed to fetch recommendations" }, { status: 502 } );
  }
}


import {
  proxyRecommendations,
  requestAvailableFilters,
  submitRecommendationFeedback,
} from "@/lib/proxy";
import { loadSpotifyTrackDetails, mergeRecommendationsWithSpotify } from "@/lib/spotify";
import type {
  BaseTrackRecommendation,
  RecommendationResponse,
  TrackRecommendation,
  RecommendationArtist,
} from "@/types/recommendations";

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

const DEFAULT_ARTIST = {
  id: null,
  name: "Unknown artist",
  image: null,
} as const;

function buildFallbackRecommendations (
  recommendations: BaseTrackRecommendation[],
): TrackRecommendation[] {
  return recommendations.map( ( recommendation ) => {
    const rawArtists = Array.isArray( recommendation.artists ) ? recommendation.artists : [];
    const artists: RecommendationArtist[] = [];
    for ( const v of rawArtists ) {
      if ( typeof v === "string" ) {
        const name = v.trim();
        if ( name.length > 0 ) {
          artists.push( { id: null, name, image: null } );
        }
        continue;
      }
      const obj = v as unknown as { id?: unknown; name?: unknown; image?: unknown };
      const name = typeof obj.name === "string" ? obj.name : undefined;
      const id = typeof obj.id === "string" ? obj.id : null;
      const image = typeof obj.image === "string" ? obj.image : null;
      if ( name && name.trim().length > 0 ) {
        artists.push( { id, name, image } );
      }
    }   

    const albumImage = ( recommendation as unknown as { albumImage?: unknown; album_image?: unknown } );
    const resolvedAlbumImage =
      typeof albumImage.albumImage === "string"
        ? albumImage.albumImage
        : typeof albumImage.album_image === "string"
          ? albumImage.album_image
          : null;

    return {
      trackId: recommendation.trackId,
      score: recommendation.score,
      reason: recommendation.reason ?? null,
      title: recommendation.title ?? recommendation.trackId,
  artists: artists.length > 0 ? artists : [DEFAULT_ARTIST],
      albumImage: resolvedAlbumImage,
      previewUrl: null,
      spotifyUrl: null,
    } satisfies TrackRecommendation;
  } );
}

async function enrichRecommendations (
  response: RecommendationResponse,
  accessToken: string | null,
): Promise<TrackRecommendation[]> {
  const recommendations = response.recommendations ?? [];
  if ( recommendations.length === 0 ) {
    return [];
  }

  // Always apply fallback first to convert string artists to objects
  const baseRecommendations = buildFallbackRecommendations( recommendations );

  if ( !accessToken ) {
    // Without access token, return fallback recommendations with backend metadata
    return baseRecommendations;
  }

  const spotifyDetails = await loadSpotifyTrackDetails(
    recommendations.map( ( r ) => r.trackId ),
    accessToken,
  );

  if ( spotifyDetails.length === 0 ) {
    return baseRecommendations;
  }

  return mergeRecommendationsWithSpotify( baseRecommendations, spotifyDetails );
}

export {
  enrichRecommendations,
  proxyRecommendations,
  requestAvailableFilters,
  safeReadError,
  submitRecommendationFeedback,
};

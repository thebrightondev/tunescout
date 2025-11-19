import type {
  RecommendationArtist,
  TrackRecommendation,
} from "@/types/recommendations";

const SPOTIFY_API_BASE = "https://api.spotify.com/v1";
const TRACK_BATCH_LIMIT = 50;

type SpotifyFetchOptions = {
  accessToken: string;
  cache?: RequestCache;
};

type RawSpotifyTrack = {
  id: string;
  name: string;
  preview_url?: string | null;
  external_urls?: { spotify?: string };
  album?: {
    images?: Array<{ url?: string | null }>;
  };
  artists?: Array<{
    id?: string | null;
    name?: string | null;
  }>;
};

type RawSpotifyArtist = {
  id: string;
  name: string;
  images?: Array<{ url?: string | null }>;
};

export type SpotifyArtistDetails = {
  id: string | null;
  name: string;
  image?: string | null;
};

export type SpotifyTrackDetails = {
  id: string;
  title: string;
  albumImage?: string | null;
  previewUrl?: string | null;
  spotifyUrl?: string | null;
  artists: SpotifyArtistDetails[];
};

function chunkIds ( ids: string[], size: number ): string[][] {
  const chunks: string[][] = [];
  for ( let index = 0; index < ids.length; index += size ) {
    chunks.push( ids.slice( index, index + size ) );
  }
  return chunks;
}

async function fetchSpotify ( path: string, { accessToken, cache = "no-store" }: SpotifyFetchOptions ) {
  const response = await fetch( `${SPOTIFY_API_BASE}${path}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache,
  } );

  if ( !response.ok ) {
    const message = await response.text().catch( () => "Failed to contact Spotify API" );
    throw new Error( message );
  }

  return response.json();
}

async function fetchSpotifyPublic ( path: string, cache: RequestCache = "default" ) {
  const response = await fetch( `${SPOTIFY_API_BASE}${path}`, {
    method: "GET",
    cache,
  } );

  if ( !response.ok ) {
    throw new Error( `Spotify API error: ${response.status}` );
  }

  return response.json();
}

async function loadTrackBatch ( ids: string[], accessToken: string ): Promise<RawSpotifyTrack[]> {
  if ( ids.length === 0 ) {
    return [];
  }

  const params = new URLSearchParams( { ids: ids.join( "," ) } );
  const data = await fetchSpotify( `/tracks?${params.toString()}`, { accessToken } ) as { tracks: RawSpotifyTrack[] };
  return data.tracks ?? [];
}

async function loadTrackBatchPublic ( ids: string[] ): Promise<RawSpotifyTrack[]> {
  if ( ids.length === 0 ) {
    return [];
  }

  try {
    const params = new URLSearchParams( { ids: ids.join( "," ) } );
    const data = await fetchSpotifyPublic( `/tracks?${params.toString()}`, "force-cache" ) as { tracks: RawSpotifyTrack[] };
    return data.tracks ?? [];
  } catch ( error ) {
    console.error( "Failed to load public Spotify tracks", error );
    return [];
  }
}

async function loadArtistBatch ( ids: string[], accessToken: string ): Promise<RawSpotifyArtist[]> {
  if ( ids.length === 0 ) {
    return [];
  }

  const params = new URLSearchParams( { ids: ids.join( "," ) } );
  const data = await fetchSpotify( `/artists?${params.toString()}`, { accessToken } ) as { artists: RawSpotifyArtist[] };
  return data.artists ?? [];
}

async function loadArtistBatchPublic ( ids: string[] ): Promise<RawSpotifyArtist[]> {
  if ( ids.length === 0 ) {
    return [];
  }

  try {
    const params = new URLSearchParams( { ids: ids.join( "," ) } );
    const data = await fetchSpotifyPublic( `/artists?${params.toString()}`, "force-cache" ) as { artists: RawSpotifyArtist[] };
    return data.artists ?? [];
  } catch ( error ) {
    console.error( "Failed to load public Spotify artists", error );
    return [];
  }
}

const SPOTIFY_TRACK_ID_REGEX = /^[A-Za-z0-9]{22}$/;
const previouslyLoggedInvalidTrackIds = new Set<string>();

export async function loadSpotifyTrackDetails ( trackIds: string[], accessToken?: string | null ): Promise<SpotifyTrackDetails[]> {
  if ( !accessToken || trackIds.length === 0 ) {
    return [];
  }

  try {
    const uniqueTrackIds = Array.from( new Set( trackIds ) );
    const validTrackIds = uniqueTrackIds.filter( ( id ) => SPOTIFY_TRACK_ID_REGEX.test( id ) );

    if ( uniqueTrackIds.length !== validTrackIds.length ) {
      const invalidIds = uniqueTrackIds.filter( ( id ) => !SPOTIFY_TRACK_ID_REGEX.test( id ) );
      const freshInvalidIds = invalidIds.filter( ( id ) => !previouslyLoggedInvalidTrackIds.has( id ) );

      if ( freshInvalidIds.length > 0 ) {
        console.info( "Skipping invalid Spotify track identifiers", {
          count: freshInvalidIds.length,
        } );
        freshInvalidIds.forEach( ( id ) => previouslyLoggedInvalidTrackIds.add( id ) );
      }
    }

    if ( validTrackIds.length === 0 ) {
      return [];
    }

    const chunks = chunkIds( validTrackIds, TRACK_BATCH_LIMIT );
    const batches = await Promise.all( chunks.map( ( chunk ) => loadTrackBatch( chunk, accessToken ) ) );
    const tracks = batches.flat().filter( ( track ): track is RawSpotifyTrack & { id: string } => Boolean( track?.id ) );

    if ( tracks.length === 0 ) {
      return [];
    }

    const uniqueArtistIds = Array.from( new Set( tracks.flatMap( ( track ) => ( track.artists ?? [] )
      .map( ( artist ) => artist?.id )
      .filter( ( id ): id is string => Boolean( id ) ) ) ) );

    const artistChunks = chunkIds( uniqueArtistIds, TRACK_BATCH_LIMIT );
    const artistBatches = await Promise.all( artistChunks.map( ( chunk ) => loadArtistBatch( chunk, accessToken ) ) );
    const artists = artistBatches.flat().filter( ( artist ): artist is RawSpotifyArtist & { id: string } => Boolean( artist?.id ) );
    const artistMap = new Map( artists.map( ( artist ) => [artist.id, artist] ) );

    return tracks.map( ( track ) => {
      const artistsWithImages: SpotifyArtistDetails[] = ( track.artists ?? [] ).map( ( artist ) => {
        const artistId = artist?.id ?? null;
        const artistEntry = artistId ? artistMap.get( artistId ) : null;

        return {
          id: artistId,
          name: artist?.name ?? "Unknown artist",
          image: artistEntry?.images?.[0]?.url ?? null,
        } satisfies SpotifyArtistDetails;
      } );

      return {
        id: track.id,
        title: track.name ?? track.id,
        albumImage: track.album?.images?.[0]?.url ?? null,
        previewUrl: track.preview_url ?? null,
        spotifyUrl: track.external_urls?.spotify ?? null,
        artists: artistsWithImages,
      } satisfies SpotifyTrackDetails;
    } );
  } catch ( error ) {
    console.error( "Failed to load Spotify track details", error );
    return [];
  }
}

export async function loadSpotifyTrackDetailsPublic ( trackIds: string[] ): Promise<SpotifyTrackDetails[]> {
  if ( trackIds.length === 0 ) {
    return [];
  }

  try {
    const uniqueTrackIds = Array.from( new Set( trackIds ) );
    const validTrackIds = uniqueTrackIds.filter( ( id ) => SPOTIFY_TRACK_ID_REGEX.test( id ) );

    if ( validTrackIds.length === 0 ) {
      return [];
    }

    const chunks = chunkIds( validTrackIds, TRACK_BATCH_LIMIT );
    const batches = await Promise.all( chunks.map( ( chunk ) => loadTrackBatchPublic( chunk ) ) );
    const tracks = batches.flat().filter( ( track ): track is RawSpotifyTrack & { id: string } => Boolean( track?.id ) );

    if ( tracks.length === 0 ) {
      return [];
    }

    const uniqueArtistIds = Array.from( new Set( tracks.flatMap( ( track ) => ( track.artists ?? [] )
      .map( ( artist ) => artist?.id )
      .filter( ( id ): id is string => Boolean( id ) ) ) ) );

    const artistChunks = chunkIds( uniqueArtistIds, TRACK_BATCH_LIMIT );
    const artistBatches = await Promise.all( artistChunks.map( ( chunk ) => loadArtistBatchPublic( chunk ) ) );
    const artists = artistBatches.flat().filter( ( artist ): artist is RawSpotifyArtist & { id: string } => Boolean( artist?.id ) );
    const artistMap = new Map( artists.map( ( artist ) => [artist.id, artist] ) );

    return tracks.map( ( track ) => {
      const artistsWithImages: SpotifyArtistDetails[] = ( track.artists ?? [] ).map( ( artist ) => {
        const artistId = artist?.id ?? null;
        const artistEntry = artistId ? artistMap.get( artistId ) : null;

        return {
          id: artistId,
          name: artist?.name ?? "Unknown artist",
          image: artistEntry?.images?.[0]?.url ?? null,
        } satisfies SpotifyArtistDetails;
      } );

      return {
        id: track.id,
        title: track.name ?? track.id,
        albumImage: track.album?.images?.[0]?.url ?? null,
        previewUrl: track.preview_url ?? null,
        spotifyUrl: track.external_urls?.spotify ?? null,
        artists: artistsWithImages,
      } satisfies SpotifyTrackDetails;
    } );
  } catch ( error ) {
    console.error( "Failed to load public Spotify track details", error );
    return [];
  }
}

export function mergeRecommendationsWithSpotify (
  recommendations: TrackRecommendation[],
  tracks: SpotifyTrackDetails[],
): TrackRecommendation[] {
  const trackById = new Map( tracks.map( ( track ) => [track.id, track] ) );

  return recommendations.map( ( recommendation ) => {
    const trackDetails = trackById.get( recommendation.trackId );

    if ( !trackDetails ) {
      // No Spotify details available; keep existing metadata from backend cache.
      return recommendation;
    }

    const artists: RecommendationArtist[] = ( trackDetails.artists ?? [] ).map( ( artist ) => ( {
      id: artist.id ?? null,
      name: artist.name ?? "Unknown artist",
      image: artist.image ?? null,
    } satisfies RecommendationArtist ) );

    return {
      trackId: trackDetails.id,
      score: recommendation.score,
      reason: recommendation.reason,
      title: trackDetails.title,
      artists: artists.length > 0 ? artists : recommendation.artists,
      albumImage: trackDetails.albumImage ?? recommendation.albumImage ?? null,
      previewUrl: trackDetails.previewUrl ?? recommendation.previewUrl ?? null,
      spotifyUrl: trackDetails.spotifyUrl ?? recommendation.spotifyUrl ?? null,
    } satisfies TrackRecommendation;
  } );
}

const DEFAULT_API_URL = "http://tunescout.local.com:8080";
const DEFAULT_MUSIC_ENGINE_URL = "http://music-engine:8000";

function normalizeUrl ( value: string ): string {
  return value.endsWith( "/" ) ? value.slice( 0, -1 ) : value;
}

export function getTuneHubApiUrl (): string {
  const raw = process.env.TUNEHUB_API_URL ?? process.env.TUNESCOUT_API_URL;

  if ( !raw || raw.trim().length === 0 ) {
    return DEFAULT_API_URL;
  }

  return normalizeUrl( raw.trim() );
}

export function getMusicEngineUrl (): string {
  const raw = process.env.MUSIC_ENGINE_BASE_URL;

  if ( !raw || raw.trim().length === 0 ) {
    return DEFAULT_MUSIC_ENGINE_URL;
  }

  return normalizeUrl( raw.trim() );
}


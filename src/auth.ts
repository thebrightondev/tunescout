import NextAuth from "next-auth";
import type { Session } from "next-auth";
import type { NextRequest } from "next/server";
import Spotify from "next-auth/providers/spotify";

const baseAppUrl = (process.env.NEXTAUTH_URL ?? process.env.AUTH_URL ?? "https://tunescout.local.com:3000").replace(/\/$/, "");
const redirectProxyUrl = (process.env.AUTH_REDIRECT_PROXY_URL ?? `${baseAppUrl}/api/auth`).replace(/\/$/, "");

const scopes = [
  "user-read-email",
  "user-read-private",
  "user-top-read",
  "user-read-recently-played",
  "user-read-playback-state",
  "user-read-currently-playing",
  "user-read-playback-position",
  "user-library-read",
  "playlist-read-private",
  "playlist-read-collaborative",
  "user-follow-read",
].join(" ");

let hasLoggedRevokedRefreshToken = false;

type SpotifyToken = {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  tokenType?: string;
};

type ExtendedToken = SpotifyToken & {
  name?: string | null;
  email?: string | null;
  picture?: string | null;
  error?: string;
};

type SpotifyRefreshResponse = {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
  error?: string;
  error_description?: string;
};

type SessionUser = {
  name?: string | null;
  email?: string | null;
  image?: string | null;
};

type SessionWithTokens = Session &
  Record<string, unknown> & {
    user?: SessionUser;
    expires: string;
    accessToken?: string;
    refreshToken?: string;
    tokenType?: string;
    error?: string | null;
  };

type SignInEvent = {
  user?: SessionUser | null;
  account?: unknown;
  profile?: unknown;
  isNewUser?: boolean;
};

type SignOutEvent = {
  token?: Record<string, unknown> & { email?: string | null };
  session?: SessionWithTokens | null;
};

type SessionEvent = {
  session: SessionWithTokens;
  token: Record<string, unknown> & ExtendedToken;
};

type JWTCallbackParams = {
  token: Record<string, unknown> & {
    name?: string | null;
    email?: string | null;
    picture?: string | null;
    access_token?: string | null;
    refresh_token?: string | null;
    expires_at?: number | null;
  };
  account?: {
    access_token?: string | null;
    refresh_token?: string | null;
    expires_at?: number | null;
    expires_in?: number | null;
    token_type?: string | null;
  } | null;
  profile?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  } | null;
};

type SessionCallbackParams = {
  session: Session;
  token: Record<string, unknown> & ExtendedToken;
};

type AuthRouteHandler = (
  request: NextRequest,
  context: { params: Promise<{ nextauth: string[] }> },
) => void | Response | Promise<void | Response>;

async function refreshSpotifyToken(token: ExtendedToken): Promise<ExtendedToken> {
  if (!token.refreshToken) {
    return token;
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID ?? "";
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET ?? "";

  if (!clientId || !clientSecret) {
    console.error("Spotify client credentials are missing; cannot refresh token.");
    return {
      ...token,
      error: "MissingClientCredentials",
    } satisfies ExtendedToken;
  }

  const basicCredentials =
    typeof Buffer !== "undefined"
      ? Buffer.from(`${clientId}:${clientSecret}`, "utf-8").toString("base64")
      : typeof btoa !== "undefined"
        ? btoa(`${clientId}:${clientSecret}`)
        : null;

  if (!basicCredentials) {
    console.error("Unable to encode Spotify credentials for refresh request.");
    return {
      ...token,
      error: "CredentialEncodingError",
    } satisfies ExtendedToken;
  }

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${basicCredentials}`,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: token.refreshToken,
    }),
  });

  const rawBody = await response.text();
  let refreshed: SpotifyRefreshResponse | null = null;

  try {
    refreshed = rawBody ? (JSON.parse(rawBody) as SpotifyRefreshResponse) : null;
  } catch (parseError) {
    console.error("Failed to parse Spotify refresh response", parseError);
  }

  if (!response.ok) {
    const message = refreshed?.error_description ?? refreshed?.error ?? "Failed to refresh Spotify access token";
    const shouldInvalidateRefreshToken = /invalid_grant|revoked/i.test(message);

    if (!shouldInvalidateRefreshToken || !hasLoggedRevokedRefreshToken) {
      console.warn("Spotify token refresh failed", {
        status: response.status,
        statusText: response.statusText,
        body: refreshed ?? rawBody,
      });
    }

    if (shouldInvalidateRefreshToken) {
      hasLoggedRevokedRefreshToken = true;
    }

    return {
      ...token,
      accessToken: shouldInvalidateRefreshToken ? "" : token.accessToken,
      refreshToken: shouldInvalidateRefreshToken ? undefined : token.refreshToken,
      expiresAt: shouldInvalidateRefreshToken ? 0 : token.expiresAt,
      tokenType: token.tokenType,
      error: message,
    } satisfies ExtendedToken;
  }

  if (!refreshed?.access_token) {
    console.error("Spotify refresh response missing access token", refreshed);
    return {
      ...token,
      error: "Spotify refresh response missing access token",
    } satisfies ExtendedToken;
  }

  hasLoggedRevokedRefreshToken = false;

  return {
    ...token,
    accessToken: refreshed.access_token,
    expiresAt: Math.floor(Date.now() / 1000 + (refreshed.expires_in ?? 3600)),
    refreshToken: refreshed.refresh_token ?? token.refreshToken,
    tokenType: refreshed.token_type ?? token.tokenType,
    error: undefined,
  } satisfies ExtendedToken;
}

const resolvedSecret = process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET;

const DEFAULT_DEV_SECRET = "tunescout-dev-secret-0123456789abcdef";

const secret = resolvedSecret ?? ( process.env.NODE_ENV === "development" ? DEFAULT_DEV_SECRET : undefined );

if ( !resolvedSecret && process.env.NODE_ENV === "development" ) {
  console.warn( "NEXTAUTH_SECRET/AUTH_SECRET not set. Falling back to development secret 'tunescout-dev-secret-0123456789abcdef'." );
}

const authConfig = {
  session: {
    strategy: "jwt",
  },
  trustHost: true,
  debug: process.env.NODE_ENV === "development",
  logger: {
    debug: (...args: unknown[]) => console.debug("[auth][debug]", ...args),
    warn: (...args: unknown[]) => console.warn("[auth][warn]", ...args),
    error: (...args: unknown[]) => console.error("[auth][error]", ...args),
  },
  pages: {
    signIn: "/auth/signin",
  },
  providers: [
    Spotify({
      clientId: process.env.SPOTIFY_CLIENT_ID ?? "",
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET ?? "",
      authorization: {
        url: "https://accounts.spotify.com/authorize",
        params: {
          scope: scopes,
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile }: JWTCallbackParams) {
      const picture =
        typeof (profile as { image_url?: unknown; image?: unknown } | null)?.image === "string"
          ? ((profile as { image?: string }).image ?? null)
          : token.picture ?? null;

      const extendedToken: ExtendedToken = {
        accessToken: (token as unknown as ExtendedToken).accessToken ?? (token.access_token as string) ?? "",
        refreshToken: (token as unknown as ExtendedToken).refreshToken ?? (token.refresh_token as string | undefined),
        expiresAt:
          (token as unknown as ExtendedToken).expiresAt ??
          (typeof token.expires_at === "number" ? token.expires_at : 0),
        tokenType: (token as unknown as ExtendedToken).tokenType,
        name: token.name,
        email: token.email,
        picture,
        error: (token as unknown as ExtendedToken).error,
      } satisfies ExtendedToken;

      if (account) {
        console.log("[auth][jwt] Initial sign-in with Spotify account", {
          email: profile?.email,
          hasAccessToken: !!account.access_token,
          hasRefreshToken: !!account.refresh_token,
        });
        return {
          ...extendedToken,
          accessToken: account.access_token ?? extendedToken.accessToken,
          refreshToken: account.refresh_token ?? extendedToken.refreshToken,
          expiresAt: account.expires_at ?? Math.floor(Date.now() / 1000 + (account.expires_in ?? 0)),
          tokenType: account.token_type ?? extendedToken.tokenType,
          name: profile?.name ?? token.name,
          email: profile?.email ?? token.email,
          picture,
          error: undefined,
        } satisfies ExtendedToken;
      }

      if (extendedToken.expiresAt && Date.now() / 1000 < extendedToken.expiresAt - 60) {
        return extendedToken;
      }

      try {
        return await refreshSpotifyToken(extendedToken);
      } catch (error) {
        console.error("Failed to refresh Spotify token", error);
        const message = error instanceof Error ? error.message : "RefreshTokenError";
        const shouldInvalidateRefreshToken = /invalid_grant|revoked/i.test(message);
        return {
          ...extendedToken,
          accessToken: shouldInvalidateRefreshToken ? "" : extendedToken.accessToken,
          refreshToken: shouldInvalidateRefreshToken ? undefined : extendedToken.refreshToken,
          expiresAt: shouldInvalidateRefreshToken ? 0 : extendedToken.expiresAt,
          tokenType: extendedToken.tokenType,
          error: message,
        } satisfies ExtendedToken;
      }
    },
    async session({ session, token }: SessionCallbackParams): Promise<SessionWithTokens | null> {
      const extendedToken = token as ExtendedToken;

      const sessionWithTokens = session as SessionWithTokens;

      sessionWithTokens.user = {
        ...(sessionWithTokens.user ?? {}),
        name: token.name,
        email: token.email,
        image: token.picture,
      };

      sessionWithTokens.accessToken = extendedToken.accessToken;
      sessionWithTokens.refreshToken = extendedToken.refreshToken;
      sessionWithTokens.tokenType = extendedToken.tokenType;
      if (extendedToken.expiresAt) {
        sessionWithTokens.expires = new Date(extendedToken.expiresAt * 1000).toISOString();
      }
      sessionWithTokens.error = extendedToken.error ?? null;

      console.log("[auth][session] Returning session:", {
        user: sessionWithTokens.user?.email,
        hasAccessToken: !!sessionWithTokens.accessToken,
        error: sessionWithTokens.error,
      });

      return sessionWithTokens;
    },
  },
  events: {
    async signIn(message: SignInEvent) {
      console.log("[auth][event][signIn]", { user: message.user?.email ?? message.user?.name ?? "unknown" });
    },
    async signOut(message: SignOutEvent) {
      console.log("[auth][event][signOut]", {
        user: message.token?.email ?? message.session?.user?.email ?? "unknown",
      });
    },
    async session(message: SessionEvent) {
      console.log("[auth][event][session]", {
        user: message.session?.user?.email,
        expires: message.session?.expires,
      });
    },
    async error(error: unknown) {
      console.error("[auth][event][error]", error);
    },
  },
  ...(secret ? { secret } : {}),
};

type AuthConfig = typeof authConfig;

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = (NextAuth as unknown as (config: AuthConfig) => {
  handlers: { GET: AuthRouteHandler; POST: AuthRouteHandler };
  auth: (...args: unknown[]) => Promise<SessionWithTokens | null>;
  signIn: (...args: unknown[]) => Promise<unknown>;
  signOut: (...args: unknown[]) => Promise<unknown>;
})(authConfig);

export type { SessionWithTokens };

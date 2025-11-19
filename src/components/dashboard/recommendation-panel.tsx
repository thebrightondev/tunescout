'use client';

import * as React from "react";
import type { Session } from "next-auth";
import { signIn, useSession } from "next-auth/react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { RecommendationList } from "@/components/dashboard/recommendation-list";
import { Button } from "@/components/ui/button";
import { useRecommendations } from "@/hooks/use-recommendations";

type SessionWithAccessToken = Session & {
  accessToken?: string | null;
};

export function RecommendationPanel () {
  const { data: session, status } = useSession();

  const userId = React.useMemo( () => {
    if ( !session ) {
      return null;
    }

    return session.user?.email ?? session.user?.name ?? null;
  }, [session] );

  const resolvedAccessToken = ( session as SessionWithAccessToken | null )?.accessToken ?? null;
  const hasSpotifyToken = typeof resolvedAccessToken === "string" && resolvedAccessToken.trim().length > 0;
  const sessionError = ( session as unknown as { error?: string | null } | null )?.error ?? null;

  const {
    state,
    isFetching,
    refresh,
    sendFeedback,
    feedbackState,
  } = useRecommendations( {
    userId,
    accessToken: resolvedAccessToken,
    // Auto-load recommendations when the user is signed in
    autoLoad: true,
    limit: 10,
    onFeedbackSuccess: ( item, action ) => {
      const verb = action === "like" ? "saved" : "skipped";
      toast.success( `You ${verb} ${item.title}` );
    },
    onFeedbackError: ( item, _action, error ) => {
      toast.error( error.message ?? `Could not update feedback for ${item.title}` );
    },
    refetchAfterFeedback: false,
  } );

  if ( status === "loading" ) {
    return <RecommendationList state={{ status: "loading" }} />;
  }

  if ( !session || !userId ) {
    return (
      <div className="rounded-lg border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
        Sign in with Spotify to start receiving personalized recommendations.
      </div>
    );
  }
  return (
    <div className="space-y-4">
      {!hasSpotifyToken || sessionError ? (
        <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-800">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <p className="font-medium">Connect Spotify to see your personalized recommendations</p>
              {sessionError ? (
                <p className="text-xs opacity-80">{sessionError}</p>
              ) : (
                <p className="text-xs opacity-80">We couldn’t read your Spotify session. Please sign in again.</p>
              )}
            </div>
            <Button
              type="button"
              size="sm"
              variant="default"
              onClick={() => signIn( "spotify" )}
            >
              Sign in with Spotify
            </Button>
          </div>
        </div>
      ) : null}
      <div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => refresh()}
          disabled={isFetching}
        >
          {isFetching ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              <span>Discovering…</span>
            </span>
          ) : (
            "Discover More"
          )}
        </Button>
      </div>

      <RecommendationList
        state={state}
        onRetry={refresh}
        onFeedback={sendFeedback}
        feedbackState={feedbackState}
        emptyHint={hasSpotifyToken
          ? "We didn’t find any signals just yet. Start listening on Spotify and you’ll see suggestions here."
          : "Connect Spotify to start receiving personalized recommendations."
        }
      />
    </div>
  );
}

'use client';

import * as React from "react";
import Image from "next/image";
import { Loader2, Play, ThumbsDown, ThumbsUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import type {
  RecommendationState,
  TrackRecommendation,
} from "@/types/recommendations";

type FeedbackState = {
  isPending: boolean;
  lastAction: "like" | "dislike" | null;
  error?: string | null;
};

type RecommendationListProps = {
  state: RecommendationState;
  onRetry?: () => void;
  onFeedback?: ( item: TrackRecommendation, action: "like" | "dislike", rank: number ) => Promise<void> | void;
  feedbackState?: Record<string, FeedbackState | undefined>;
  emptyHint?: string;
};

function formatScore ( score: number ): string {
  return score.toFixed( 2 );
}

function RecommendationSkeletonItem () {
  return (
    <li className="flex animate-pulse items-start gap-4 rounded-lg border border-border/60 bg-card/60 px-4 py-3">
      <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-md bg-muted" />
      <div className="flex flex-1 flex-col gap-3">
        <div className="h-4 w-1/2 rounded bg-muted" />
        <div className="h-3 w-1/3 rounded bg-muted" />
      </div>
      <div className="flex h-9 w-16 items-center justify-center rounded-md bg-muted" />
    </li>
  );
}

function RecommendationSkeletonList () {
  return (
    <ul className="space-y-3">
      {Array.from( { length: 5 } ).map( ( _, index ) => (
        <RecommendationSkeletonItem key={`skeleton-${index}`} />
      ) )}
    </ul>
  );
}

function FeedbackError ( { message }: { message: string } ) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      className="mt-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive"
    >
      {message}
    </div>
  );
}

export function RecommendationList ( {
  state,
  onRetry,
  onFeedback,
  feedbackState = {},
  emptyHint = "No recommendations yet. Once the backend is running, this panel will populate with ranked tracks.",
}: RecommendationListProps ) {
  if ( state.status === "idle" || state.status === "loading" ) {
    return <RecommendationSkeletonList />;
  }

  if ( state.status === "error" ) {
    return (
      <div className="space-y-3 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-5 text-destructive">
        <p className="text-sm font-medium">{state.error}</p>
        {onRetry ? (
          <Button type="button" size="sm" variant="secondary" onClick={onRetry}>
            Try again
          </Button>
        ) : null}
      </div>
    );
  }

  const items = state.recommendations;

  if ( items.length === 0 ) {
    return (
      <p className="rounded-md border border-dashed border-border bg-muted/30 px-4 py-6 text-sm text-muted-foreground">
        {emptyHint}
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {items.map( ( item, index ) => {
        const artistNames = item.artists
          .map( ( artist ) => artist.name )
          .filter( ( name ) => name && name.trim().length > 0 );
        const artistsDisplay = artistNames.length > 0 ? artistNames.join( ", " ) : "Unknown artist";
        const stateForItem = feedbackState[item.trackId] ?? { isPending: false, lastAction: null, error: null };
        const likeActive = stateForItem.lastAction === "like";
        const dislikeActive = stateForItem.lastAction === "dislike";
        const likePending = stateForItem.isPending && stateForItem.lastAction === "like";
        const dislikePending = stateForItem.isPending && stateForItem.lastAction === "dislike";

        const handleFeedback = async ( action: "like" | "dislike" ) => {
          if ( stateForItem.isPending || !onFeedback ) {
            return;
          }

          await onFeedback( item, action, index );
        };

        return (
          <li
            key={item.trackId}
            className="flex items-start justify-between gap-4 rounded-lg border border-border/70 bg-card/70 px-4 py-4 shadow-sm"
          >
            <div className="flex flex-1 items-start gap-4">
              <div className="relative h-14 w-14 overflow-hidden rounded-md bg-gradient-to-br from-emerald-500/30 to-emerald-700/40">
                {item.albumImage ? (
                  <Image
                    src={item.albumImage}
                    alt={`Album art for ${item.title}`}
                    fill
                    className="object-cover"
                    sizes="56px"
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-lg font-semibold text-emerald-50">
                    ♪
                  </span>
                )}
              </div>

              <div className="flex flex-1 flex-col gap-2">
                <div className="flex flex-col gap-1">
                  <div className="flex flex-wrap items-start gap-2">
                    <p className="text-sm font-semibold text-foreground" title={item.title}>
                      {item.title}
                    </p>
                    {item.reason ? (
                      <span className="inline-flex flex-shrink-0 items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                        {item.reason}
                      </span>
                    ) : null}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-1" title={artistsDisplay}>
                    {artistsDisplay}
                  </p>
                </div>

                <div className="mt-auto flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1 rounded-md bg-foreground/10 px-2 py-1 font-semibold text-foreground">
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Match</span>
                    <span>{formatScore( item.score )}</span>
                  </span>
                  <span className="rounded-md bg-muted px-2 py-1">
                    #{index + 1}
                  </span>
                </div>

                {stateForItem.error ? <FeedbackError message={stateForItem.error} /> : null}
              </div>
            </div>

            <div className="flex flex-col items-end justify-between gap-2">
              <div className="flex items-center gap-2">
                {item.spotifyUrl && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="rounded-full"
                    asChild
                    aria-label="Play on Spotify"
                  >
                    <a href={item.spotifyUrl} target="_blank" rel="noopener noreferrer">
                      <Play className="h-4 w-4" />
                    </a>
                  </Button>
                )}
                <Button
                  type="button"
                  variant={dislikeActive ? "default" : "outline"}
                  size="icon"
                  className="rounded-full"
                  onClick={() => handleFeedback( "dislike" )}
                  disabled={stateForItem.isPending}
                  aria-pressed={dislikeActive}
                  aria-label="Dislike recommendation"
                >
                  {dislikePending ? (
                    <Loader2
                      data-testid={`feedback-spinner-${item.trackId}-dislike`}
                      className="h-4 w-4 animate-spin"
                      aria-hidden="true"
                    />
                  ) : (
                    <ThumbsDown className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  type="button"
                  variant={likeActive ? "default" : "outline"}
                  size="icon"
                  className="rounded-full"
                  onClick={() => handleFeedback( "like" )}
                  disabled={stateForItem.isPending}
                  aria-pressed={likeActive}
                  aria-label="Like recommendation"
                >
                  {likePending ? (
                    <Loader2
                      data-testid={`feedback-spinner-${item.trackId}-like`}
                      className="h-4 w-4 animate-spin"
                      aria-hidden="true"
                    />
                  ) : (
                    <ThumbsUp className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </li>
        );
      } )}
    </ul>
  );
}

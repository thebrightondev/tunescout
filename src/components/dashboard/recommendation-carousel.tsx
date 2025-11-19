'use client';

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Play, ThumbsDown, ThumbsUp } from "lucide-react";

import { Button } from "@/components/ui/button";

export type RecommendationCarouselItem = {
  id: string;
  title: string;
  artistName: string;
  artistImage?: string | null;
  albumImage?: string | null;
  spotifyUrl?: string | null;
  previewUrl?: string | null;
  score?: number;
  reason?: string | null;
  rank?: number | null;
};

type RecommendationCarouselProps = {
  items: RecommendationCarouselItem[];
  onFeedback?: ( item: RecommendationCarouselItem, feedback: "like" | "dislike" ) => Promise<void> | void;
};

export function RecommendationCarousel ( { items, onFeedback }: RecommendationCarouselProps ) {
  const scrollRef = React.useRef<HTMLDivElement>( null );
  const [canScrollPrev, setCanScrollPrev] = React.useState( false );
  const [canScrollNext, setCanScrollNext] = React.useState( false );
  const [feedbackState, setFeedbackState] = React.useState<Record<string, {
    isPending: boolean;
    lastAction: "like" | "dislike" | null;
    error?: string;
  }>>( {} );

  React.useEffect( () => {
    const container = scrollRef.current;
    if ( !container ) {
      return;
    }

    const updateButtons = () => {
      const { scrollLeft, clientWidth, scrollWidth } = container;
      setCanScrollPrev( scrollLeft > 0 );
      setCanScrollNext( scrollLeft + clientWidth < scrollWidth - 1 );
    };

    updateButtons();
    container.addEventListener( "scroll", updateButtons, { passive: true } );
    window.addEventListener( "resize", updateButtons );

    return () => {
      container.removeEventListener( "scroll", updateButtons );
      window.removeEventListener( "resize", updateButtons );
    };
  }, [items.length] );

  const handleScroll = ( direction: "prev" | "next" ) => {
    const container = scrollRef.current;
    if ( !container ) {
      return;
    }

    const offset = direction === "prev" ? -container.clientWidth : container.clientWidth;
    container.scrollBy( { left: offset, behavior: "smooth" } );
  };

  if ( items.length === 0 ) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-muted/30 px-6 py-12 text-center text-sm text-muted-foreground">
        No recommendations are available right now. Start listening on Spotify and check back soon for fresh picks.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">

        <div className="hidden gap-2 md:flex">
          <Button
            type="button"
            variant="secondary"
            size="icon"
            aria-label="Scroll left"
            disabled={!canScrollPrev}
            onClick={() => handleScroll( "prev" )}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="icon"
            aria-label="Scroll right"
            disabled={!canScrollNext}
            onClick={() => handleScroll( "next" )}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="relative">
        <div className="absolute left-0 top-1/2 hidden -translate-y-1/2 md:block">
          <Button
            type="button"
            variant="secondary"
            size="icon"
            className="shadow-lg"
            aria-label="Scroll left"
            disabled={!canScrollPrev}
            onClick={() => handleScroll( "prev" )}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>

        <div
          ref={scrollRef}
          className="flex snap-x snap-mandatory gap-5 overflow-x-auto pb-4 pt-1 scroll-smooth"
        >
          {items.map( ( item, index ) => {
            const cardId = `${item.id}-${index}`;
            const state = feedbackState[cardId] ?? { isPending: false, lastAction: null };
            const likeActive = state.lastAction === "like";
            const dislikeActive = state.lastAction === "dislike";

            const submitFeedback = async ( action: "like" | "dislike" ) => {
              let shouldExit = false;

              setFeedbackState( ( previous ) => {
                const prior = previous[cardId];
                if ( prior?.isPending ) {
                  shouldExit = true;
                  return previous;
                }

                return {
                  ...previous,
                  [cardId]: {
                    isPending: true,
                    lastAction: action,
                    error: undefined,
                  },
                };
              } );

              if ( shouldExit ) {
                return;
              }

              try {
                if ( onFeedback ) {
                  await onFeedback( item, action );
                } else {
                  const response = await fetch( "/api/recommendations/feedback", {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify( {
                      trackId: item.id,
                      action,
                      reason: item.reason ?? null,
                      score: item.score ?? null,
                      rank: typeof item.rank === "number" ? item.rank : index,
                      source: "dashboard",
                    } ),
                    cache: "no-store",
                  } );

                  if ( !response.ok ) {
                    const body = await response.json().catch( () => null ) as { error?: string } | null;
                    const message = body?.error ?? `Feedback request failed with status ${response.status}`;
                    throw new Error( message );
                  }
                }

                setFeedbackState( ( previous ) => ( {
                  ...previous,
                  [cardId]: {
                    isPending: false,
                    lastAction: action,
                    error: undefined,
                  },
                } ) );
              } catch ( error ) {
                console.error( "Failed to submit recommendation feedback", error );
                const message = error instanceof Error ? error.message : "Unknown feedback error";
                setFeedbackState( ( previous ) => ( {
                  ...previous,
                  [cardId]: {
                    isPending: false,
                    lastAction: null,
                    error: message,
                  },
                } ) );
              }
            };

            return (
              <article
                key={cardId}
                className="group relative flex h-full min-w-[260px] max-w-[320px] flex-shrink-0 snap-center flex-col overflow-hidden rounded-2xl border border-border/60 bg-card shadow-lg transition hover:-translate-y-1 hover:shadow-xl"
              >
                <div className="relative h-48 w-full overflow-hidden bg-muted">
                  {item.albumImage ? (
                    <Image
                      src={item.albumImage}
                      alt={`Album art for ${item.title}`}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 80vw, 320px"
                      priority={false}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-emerald-500/20 to-emerald-900/40 text-emerald-50">
                      <span className="text-5xl font-semibold">♪</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/10 to-transparent" />
                </div>

                <div className="flex flex-1 flex-col gap-4 p-5">
                  <div className="space-y-3">
                    {item.reason ? (
                      <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                        {item.reason}
                      </span>
                    ) : null}
                    <h3 className="text-lg font-semibold leading-tight text-foreground">{item.title}</h3>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      {item.artistImage ? (
                        <Image
                          src={item.artistImage}
                          alt={`${item.artistName} avatar`}
                          width={36}
                          height={36}
                          className="h-9 w-9 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary">
                          {item.artistName.slice( 0, 1 ).toUpperCase()}
                        </div>
                      )}
                      <span className="line-clamp-1 font-medium">{item.artistName}</span>
                    </div>
                  </div>

                  <div className="mt-auto space-y-2">
                    {typeof item.score === "number" ? (
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Match score: {item.score.toFixed( 2 )}</p>
                    ) : null}

                    <div className="flex items-center justify-between">
                      {item.spotifyUrl ? (
                        <Button
                          asChild
                          variant="ghost"
                          size="icon"
                          aria-label="Play on Spotify"
                          className="rounded-full"
                        >
                          <Link href={item.spotifyUrl} target="_blank" rel="noopener noreferrer">
                            <Play className="h-5 w-5" />
                          </Link>
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled
                          aria-label="Preview unavailable"
                          className="rounded-full"
                        >
                          <Play className="h-5 w-5" />
                        </Button>
                      )}

                      <div className="flex items-center gap-1.5">
                        <Button
                          type="button"
                          variant={dislikeActive ? "default" : "ghost"}
                          size="icon"
                          aria-label="Dislike recommendation"
                          className="rounded-full"
                          onClick={() => submitFeedback( "dislike" )}
                          disabled={state.isPending}
                          aria-pressed={dislikeActive}
                        >
                          <ThumbsDown className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant={likeActive ? "default" : "ghost"}
                          size="icon"
                          aria-label="Like recommendation"
                          className="rounded-full"
                          onClick={() => submitFeedback( "like" )}
                          disabled={state.isPending}
                          aria-pressed={likeActive}
                        >
                          <ThumbsUp className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            );
          } )}
        </div>

        <div className="absolute right-0 top-1/2 hidden -translate-y-1/2 md:block">
          <Button
            type="button"
            variant="secondary"
            size="icon"
            className="shadow-lg"
            aria-label="Scroll right"
            disabled={!canScrollNext}
            onClick={() => handleScroll( "next" )}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

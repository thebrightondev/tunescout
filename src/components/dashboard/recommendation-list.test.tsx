import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { RecommendationList } from "@/components/dashboard/recommendation-list";
import type { RecommendationState } from "@/types/recommendations";

vi.mock( "next/image", () => ( {
  __esModule: true,
  default: ( props: { src?: string; alt?: string } ) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={props.src ?? ""} alt={props.alt ?? ""} />;
  },
} ) );

afterEach( () => {
  cleanup();
} );

describe( "RecommendationList", () => {
  it( "renders skeleton placeholders while loading", () => {
    const { container } = render( <RecommendationList state={{ status: "loading" }} /> );
    expect( container.querySelectorAll( "li" ).length ).toBeGreaterThan( 0 );
  } );

  it( "shows error message and retry action", async () => {
    const onRetry = vi.fn();
    render( <RecommendationList state={{ status: "error", error: "Failed" }} onRetry={onRetry} /> );

    await userEvent.click( screen.getByRole( "button", { name: /try again/i } ) );
    expect( onRetry ).toHaveBeenCalled();
  } );

  it( "renders recommendations with feedback controls", async () => {
    const onFeedback = vi.fn();
    const state: RecommendationState = {
      status: "ready",
      recommendations: [
        {
          trackId: "track-1",
          title: "Song Alpha",
          score: 0.91,
          reason: "top",
          artists: [
            {
              id: "artist-1",
              name: "Artist One",
              image: null,
            },
          ],
          albumImage: null,
          previewUrl: null,
          spotifyUrl: null,
        },
      ],
      lastUpdated: Date.now(),
      lastError: null,
    };

    render( <RecommendationList state={state} onFeedback={onFeedback} /> );

    expect( screen.getByText( "Song Alpha" ) ).toBeInTheDocument();
    expect( screen.getByText( "Artist One" ) ).toBeInTheDocument();
    expect( screen.getByText( /0\.91/ ) ).toBeInTheDocument();

    await userEvent.click( screen.getByRole( "button", { name: /^like recommendation$/i } ) );
    expect( onFeedback ).toHaveBeenCalledWith( expect.objectContaining( { trackId: "track-1" } ), "like", 0 );
  } );

  it( "disables actions and shows pending spinner while feedback is sending", () => {
    const state: RecommendationState = {
      status: "ready",
      recommendations: [
        {
          trackId: "track-1",
          title: "Song Beta",
          score: 0.75,
          artists: [],
          reason: null,
          albumImage: null,
          previewUrl: null,
          spotifyUrl: null,
        },
      ],
      lastUpdated: Date.now(),
      lastError: null,
    };

    render( <RecommendationList
      state={state}
      feedbackState={{ "track-1": { isPending: true, lastAction: "like" } }}
    /> );

    const likeButton = screen.getByRole( "button", { name: /^like recommendation$/i } );
    const dislikeButton = screen.getByRole( "button", { name: /^dislike recommendation$/i } );

    expect( likeButton ).toBeDisabled();
    expect( dislikeButton ).toBeDisabled();
    expect( screen.getByTestId( "feedback-spinner-track-1-like" ) ).toBeInTheDocument();
  } );
} );

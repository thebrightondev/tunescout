"use client";

import { Suspense } from "react";
import { useSession } from "next-auth/react";
import { redirect, useRouter } from "next/navigation";

import { RecommendationCarousel } from "@/components/dashboard/recommendation-carousel";
import { Button } from "@/components/ui/button";
import { useRecommendations } from "@/hooks/use-recommendations";

function RecommendationsPage () {
  const router = useRouter();
  const { data: session, status } = useSession( {
    required: true,
    onUnauthenticated () {
      // Client-side redirect for cleared cookies or expired session
      router.replace( "/" );
    },
  } );

  const userId = session?.user?.email ?? session?.user?.name ?? null;

  const {
    state,
    isFetching,
    refresh,
  } = useRecommendations( {
    userId,
    accessToken: session?.accessToken,
    autoLoad: !!session && !!userId,
  } );

  if ( status === "loading" || !session || !userId ) {
    return <div>Loading...</div>;
  }

  if ( state.status === "error" ) {
    return (
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">Recommendations</h1>
        <p className="text-red-500">{state.error}</p>
        <form
          onSubmit={( e ) => {
            e.preventDefault();
            void refresh();
          }}
        >
          <Button type="submit" className="mt-4" disabled={isFetching}>
            {isFetching ? "Retrying..." : "Try again"}
          </Button>
        </form>
      </div>
    );
  }

  const hadRecommendations =
    state.status === "ready" && state.recommendations.length > 0;
  const carouselItems =
    state.status === "ready"
      ? state.recommendations.map( ( item ) => ( {
        ...item,
        id: item.trackId,
        artistName: item.artists.map( ( a ) => a.name ).join( ", " ),
        artistImage: item.artists.find( ( a ) => a.image )?.image ?? null,
      } ) )
      : [];

  return (
    <div className="container mx-auto p-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Your Personalised Recommendations</h1>
        <p className="text-muted-foreground">Curated based on your listening history and feedback.</p>
      </div>

      {state.status === "loading" ? (
        <div className="rounded-lg border border-dashed border-border px-6 py-12 text-center space-y-4">
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
          </div>
          <p className="text-muted-foreground">
            Loading your personalized recommendations...
          </p>
        </div>
      ) : hadRecommendations ? (
        <RecommendationCarousel items={carouselItems} />
      ) : (
        <div className="rounded-lg border border-dashed border-border px-6 py-12 text-center">
          <p className="text-muted-foreground mb-4">
            No recommendations yet. Start giving feedback in the Discover section to build your personalized list.
          </p>
          <Button onClick={() => router.push( "/dashboard" )}>
            Go to Discover
          </Button>
        </div>
      )}
    </div>
  );
}

export default function RecommendationsPageWrapper () {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <RecommendationsPage />
    </Suspense>
  );
}

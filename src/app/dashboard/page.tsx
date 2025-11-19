"use client";

import { Suspense } from "react";
import { useSession } from "next-auth/react";
import { redirect, useRouter } from "next/navigation";

import { RecommendationCarousel } from "@/components/dashboard/recommendation-carousel";
import { RecommendationPanel } from "@/components/dashboard/recommendation-panel";
import { Button } from "@/components/ui/button";
import { useRecommendations } from "@/hooks/use-recommendations";

function Dashboard () {
  const router = useRouter();
  const { data: session, status } = useSession( {
    required: true,
    onUnauthenticated () {
      // Client-side redirect for cleared cookies or expired session
      router.replace( "/" );
    },
  } );

  const {
    state,
    isFetching,
    refresh,
  } = useRecommendations( {
    userId: session?.user?.email ?? session?.user?.name ?? null,
    accessToken: session?.accessToken,
    autoLoad: !!session,
  } );

  if ( status === "loading" || !session ) {
    return <div>Loading...</div>;
  }

  if ( state.status === "error" ) {
    return (
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
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

  return (
    <div className="container mx-auto p-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Discover new songs</h1>
      </div>

      <RecommendationPanel />

    </div>
  );
}

export default function DashboardPage () {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Dashboard />
    </Suspense>
  );
}

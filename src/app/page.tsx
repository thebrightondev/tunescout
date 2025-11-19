import { redirect } from "next/navigation";

import { SignInButton } from "@/components/auth/auth-buttons";
import { UserSummary } from "@/components/auth/user-summary";
import { auth } from "@/auth";

export default async function Home () {
  const session = await auth();

  if ( session ) {
    redirect( "/dashboard" );
  }

  return (
    <main className="relative flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-background via-background to-emerald-950/10 px-6 py-16">
      <div className="absolute inset-x-1/2 top-24 -z-10 h-[480px] w-[480px] -translate-x-1/2 rounded-full bg-emerald-500/10 blur-3xl" />
      <div className="absolute inset-y-0 right-0 -z-10 hidden w-1/2 bg-gradient-to-l from-emerald-600/10 via-transparent to-transparent lg:block" />

      <section className="grid w-full max-w-6xl gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div className="space-y-6">
          <p className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium uppercase tracking-wider text-emerald-700">
            Tunescout · Spotify insights
          </p>
          <h1 className="text-balance text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
            Turn Spotify listening data into personalized discovery moments.
          </h1>
          <p className="max-w-xl text-lg text-muted-foreground">
            Sign in with your Spotify account to unlock tailored recommendations, collaborative playlists, and
            data-driven highlights sourced directly from your listening history.
          </p>

          <SignInButton />
        </div>

        <div className="flex w-full justify-center">
          <UserSummary />
        </div>
      </section>
    </main>
  );
}

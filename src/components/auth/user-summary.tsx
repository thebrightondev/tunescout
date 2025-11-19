"use client";

import Image from "next/image";
import { useSession } from "next-auth/react";

import type { SessionWithTokens } from "@/auth";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SignOutButton } from "./auth-buttons";

export function UserSummary () {
  const { data, status } = useSession();
  const session = data as SessionWithTokens | null;

  if ( status === "loading" ) {
    return (
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>Loading your profile…</CardTitle>
          <CardDescription>Fetching data from Spotify.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Please wait a moment.</p>
        </CardContent>
      </Card>
    );
  }

  if ( !session?.user ) {
    return null;
  }

  return (
    <Card className="max-w-md">
      <CardHeader className="flex flex-row items-center gap-4">
        {session.user.image ? (
          <Image
            src={session.user.image}
            alt={session.user.name ?? "Spotify user"}
            width={56}
            height={56}
            className="h-14 w-14 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-lg font-semibold text-primary">
            {( session.user.name ?? "S" ).slice( 0, 1 )}
          </div>
        )}
        <div className="space-y-1">
          <CardTitle className="text-xl">{session.user.name ?? "Spotify listener"}</CardTitle>
          <CardDescription>{session.user.email ?? "No email on file"}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          Access token ready. You can now query the Spotify Web API on behalf of this user. Use the token in
          server actions or API routes to fetch playlists, recommendations, and more.
        </p>
        <div>
          <span className="block text-xs uppercase tracking-wide text-muted-foreground">Access token</span>
          <code className="mt-1 block truncate rounded bg-muted px-3 py-2 text-xs">
            {session.accessToken ?? "No token available"}
          </code>
        </div>
        <SignOutButton />
      </CardContent>
    </Card>
  );
}

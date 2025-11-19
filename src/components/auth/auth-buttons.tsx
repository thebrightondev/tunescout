"use client";

import type { SVGProps } from "react";
import { LogOut } from "lucide-react";
import { signIn, signOut } from "next-auth/react";

import { Button } from "@/components/ui/button";

function SpotifyIcon ( props: SVGProps<SVGSVGElement> ) {
  return (
    <svg viewBox="0 0 24 24" role="img" aria-hidden="true" {...props}>
      <path
        d="M12 0C5.371 0 0 5.371 0 12s5.371 12 12 12 12-5.371 12-12S18.629 0 12 0zm5.494 17.339a.748.748 0 01-1.028.249c-2.811-1.715-6.349-2.105-10.521-1.143a.748.748 0 01-.327-1.458c4.536-1.02 8.428-.57 11.54 1.204.36.22.472.694.249 1.028zm1.451-3.233a.935.935 0 01-1.287.311c-3.214-1.967-8.115-2.534-11.93-1.376a.936.936 0 11-.53-1.797c4.33-1.282 9.698-.657 13.343 1.566a.935.935 0 01.404 1.296zm.124-3.37c-3.857-2.291-10.228-2.5-13.894-1.362a1.122 1.122 0 01-.63-2.152c4.252-1.246 11.17-1.003 15.523 1.62a1.122 1.122 0 11-1.116 1.94z"
        fill="currentColor"
      />
    </svg>
  );
}

export function SignInButton () {
  return (
    <Button
      size="lg"
      className="gap-2 bg-black text-white hover:bg-black/90 focus-visible:ring-white focus-visible:ring-offset-black rounded-xl"
      onClick={() => void signIn( "spotify", { callbackUrl: "/dashboard" } )}
    >
      <SpotifyIcon className="h-6 w-6 text-white" />
      <span>Sign in with Spotify</span>
    </Button>
  );
}

export function SignOutButton () {
  return (
    <Button variant="outline" className="gap-2" onClick={() => void signOut( { callbackUrl: "/" } )}>
      <LogOut className="h-4 w-4" />
      <span>Sign out</span>
    </Button>
  );
}

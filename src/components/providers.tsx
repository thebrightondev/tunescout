"use client";

import { SessionProvider } from "next-auth/react";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/theme-provider";

declare global {
  interface Window {
    __tunescoutPatchedBroadcastChannel?: boolean;
  }
}

if ( typeof window !== "undefined" && !window.__tunescoutPatchedBroadcastChannel ) {
  window.__tunescoutPatchedBroadcastChannel = true;

  if ( typeof window.BroadcastChannel !== "undefined" ) {
    try {
      const channel = new window.BroadcastChannel( "tunescout-storage-test" );
      channel.close();
    } catch ( error ) {
      console.warn( "[tunescout] BroadcastChannel is unavailable; disabling cross-tab session sync.", error );

      class NoopBroadcastChannel {
        readonly name: string;

        constructor ( name: string ) {
          this.name = name;
        }

        postMessage (): void { }

        addEventListener (): void { }

        removeEventListener (): void { }

        close (): void { }
      }

      window.BroadcastChannel = NoopBroadcastChannel as unknown as typeof BroadcastChannel;
    }
  }
}

export function Providers ( { children }: { children: React.ReactNode } ) {
  return (
    <ThemeProvider>
      <SessionProvider>{children}</SessionProvider>
      <Toaster />
    </ThemeProvider>
  );
}

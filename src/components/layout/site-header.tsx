"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";

import { SignInButton, SignOutButton } from "@/components/auth/auth-buttons";
import { ThemeToggle } from "@/components/theme-toggle";

export function SiteHeader () {
  const pathname = usePathname();
  const { data: session } = useSession();

  const isActive = ( href: string ) => {
    return pathname === href || pathname.startsWith( `${href}/` );
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 backdrop-blur bg-background/80">
      <div className="mx-auto flex w-full items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2 text-lg font-semibold">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-white">♪</span>
          Tunescout
        </Link>

        {session?.user && (
          <nav className="flex items-center gap-6">
            <Link
              href="/dashboard"
              className={`text-sm font-medium transition-colors border-b-2 ${isActive( "/dashboard" )
                ? "text-foreground border-emerald-500"
                : "text-muted-foreground hover:text-foreground border-transparent"
                }`}
            >
              Discover
            </Link>
            <Link
              href="/recommendations"
              className={`text-sm font-medium transition-colors border-b-2 ${isActive( "/recommendations" )
                ? "text-foreground border-emerald-500"
                : "text-muted-foreground hover:text-foreground border-transparent"
                }`}
            >
              Recommendations
            </Link>
          </nav>
        )}

        <div className="flex items-center gap-3">
          <ThemeToggle />
          {session?.user ? (
            <>
              {/* <span className="hidden text-sm text-muted-foreground sm:inline">
                {session.user.name ?? session.user.email ?? "Logged in"}
              </span> */}
              <SignOutButton />
            </>
          ) : (
            <SignInButton />
          )}
        </div>
      </div>
    </header>
  );
}

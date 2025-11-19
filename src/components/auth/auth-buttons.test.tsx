import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { SignInButton, SignOutButton } from "./auth-buttons";
import { signIn, signOut } from "next-auth/react";

vi.mock( "next-auth/react", () => ( {
  signIn: vi.fn(),
  signOut: vi.fn(),
} ) );

describe( "auth buttons", () => {
  it( "triggers spotify sign-in when clicked", () => {
    render( <SignInButton /> );

    fireEvent.click( screen.getByRole( "button", { name: /sign in with spotify/i } ) );

    expect( signIn ).toHaveBeenCalledWith( "spotify", { callbackUrl: "/dashboard" } );
  } );

  it( "signs out and redirects home", () => {
    render( <SignOutButton /> );

    fireEvent.click( screen.getByRole( "button", { name: /sign out/i } ) );

    expect( signOut ).toHaveBeenCalledWith( { callbackUrl: "/" } );
  } );
} );
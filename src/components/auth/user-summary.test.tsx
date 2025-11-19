import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { SessionWithTokens } from "@/auth";
import { UserSummary } from "./user-summary";

const useSessionMock = vi.fn();
const signOutMock = vi.fn();

vi.mock( "next-auth/react", () => ( {
  useSession: () => useSessionMock(),
  signOut: ( ...args: unknown[] ) => signOutMock( ...args ),
} ) );

afterEach( () => {
  vi.clearAllMocks();
  useSessionMock.mockReset();
} );

describe( "UserSummary", () => {
  it( "renders a loading card while session is loading", () => {
    useSessionMock.mockReturnValue( { data: null, status: "loading" } );

    render( <UserSummary /> );

    expect( screen.getByText( /loading your profile/i ) ).toBeInTheDocument();
    expect( screen.getByText( /fetching data from spotify/i ) ).toBeInTheDocument();
  } );

  it( "renders nothing when no authenticated session is available", () => {
    useSessionMock.mockReturnValue( { data: null, status: "unauthenticated" } );

    const { container } = render( <UserSummary /> );

    expect( container.firstChild ).toBeNull();
  } );

  it( "shows user profile details and access token", () => {
    const session: SessionWithTokens = {
      user: {
        name: "Ada Lovelace",
        email: "ada@example.com",
        image: "https://example.com/avatar.png",
      },
      accessToken: "token-123",
      refreshToken: "refresh-456",
      tokenType: "Bearer",
      expires: new Date( Date.now() + 60_000 ).toISOString(),
    } as SessionWithTokens;

    useSessionMock.mockReturnValue( { data: session, status: "authenticated" } );

    render( <UserSummary /> );

    expect( screen.getByText( "Ada Lovelace" ) ).toBeInTheDocument();
    expect( screen.getByText( "ada@example.com" ) ).toBeInTheDocument();
    expect( screen.getByText( /token-123/ ) ).toBeInTheDocument();
    expect( screen.getByRole( "button", { name: /sign out/i } ) ).toBeInTheDocument();
  } );
} );
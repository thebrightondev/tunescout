import { NextResponse } from "next/server";

import { requestAvailableFilters } from "@/lib/recommendations";

export async function GET () {
  try {
    const filters = await requestAvailableFilters();
    return NextResponse.json( filters, { status: 200 } );
  } catch ( error ) {
    console.error( "Failed to fetch available filters", error );
    return NextResponse.json( [], { status: 200 } );
  }
}

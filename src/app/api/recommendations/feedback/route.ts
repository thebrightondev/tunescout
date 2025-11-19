import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { submitRecommendationFeedback } from "@/lib/recommendations";

const VALID_ACTIONS = new Set(["like", "dislike"]);

export async function POST(request: Request) {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user?.email ?? session.user?.name ?? "spotify-user").trim();

  const payload = (await request.json().catch(() => null)) as
    | {
        trackId?: unknown;
        action?: unknown;
        reason?: unknown;
        score?: unknown;
        rank?: unknown;
        source?: unknown;
      }
    | null;

  if (!payload || typeof payload.trackId !== "string" || payload.trackId.trim().length === 0) {
    return NextResponse.json({ error: "Missing trackId" }, { status: 400 });
  }

  const action = typeof payload.action === "string" ? payload.action.toLowerCase() : null;

  if (!action || !VALID_ACTIONS.has(action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const reason = typeof payload.reason === "string" ? payload.reason : null;
  const score = typeof payload.score === "number" ? payload.score : null;
  const rank = typeof payload.rank === "number" ? payload.rank : null;
  const source = typeof payload.source === "string" && payload.source.trim().length > 0 ? payload.source : "dashboard";

  try {
    await submitRecommendationFeedback({
      userId,
      trackId: payload.trackId,
      action: action as "like" | "dislike",
      reason,
      score,
      rank,
      source,
    });

    return NextResponse.json({ status: "accepted" }, { status: 202 });
  } catch (error) {
    console.error("Failed to submit recommendation feedback", error);
    return NextResponse.json({ error: "Failed to submit feedback" }, { status: 502 });
  }
}

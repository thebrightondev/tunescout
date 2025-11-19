export type BaseTrackRecommendation = {
  trackId: string;
  score: number;
  reason?: string | null;
  title?: string | null;
  artists?: string[] | null;
  albumImage?: string | null;
};

export type RecommendationArtist = {
  id: string | null;
  name: string;
  image?: string | null;
};

export type TrackRecommendation = Omit<BaseTrackRecommendation, "artists" | "title" | "albumImage"> & {
  title: string;
  artists: RecommendationArtist[];
  albumImage?: string | null;
  spotifyUrl?: string | null;
  previewUrl?: string | null;
};

export type RecommendationResponse = {
  userId: string;
  recommendations: BaseTrackRecommendation[];
};

export type RecommendationState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; error: string }
  | {
    status: "ready";
    recommendations: TrackRecommendation[];
    lastUpdated: number;
    lastError?: string | null;
  };

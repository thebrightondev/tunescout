import type { NextConfig } from "next";

const shouldSkipBuildChecks = process.env.NEXT_SKIP_BUILD_CHECKS === "true";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: shouldSkipBuildChecks,
  },
  typescript: {
    ignoreBuildErrors: shouldSkipBuildChecks,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "i.scdn.co",
      },
      {
        protocol: "https",
        hostname: "mosaic.scdn.co",
      },
      {
        protocol: "https",
        hostname: "image-cdn.spotifycdn.com",
      },
      {
        protocol: "https",
        hostname: "seeded-session-images.scdn.co",
      },
    ],
  },
};

export default nextConfig;

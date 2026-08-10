import type { NextConfig } from "next";

const immutableAssetCacheHeader = {
  key: "Cache-Control",
  value: "public, max-age=31536000, immutable",
};

const nextConfig: NextConfig = {
  compress: true,
  async headers() {
    return [
      {
        headers: [immutableAssetCacheHeader],
        source: "/brand/:path*",
      },
      {
        headers: [immutableAssetCacheHeader],
        source: "/uploads/:path*",
      },
    ];
  },
};

export default nextConfig;

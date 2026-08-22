import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    // Product images travel as compressed data URLs. The default ~1 MB action
    // body was returning HTTP 500 / "Failed to fetch" during publish.
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;

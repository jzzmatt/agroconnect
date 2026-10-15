import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      {
        source: "/services",
        destination: "/agriexpert?view=servicos",
        permanent: false,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/manifest.json",
        headers: [{ key: "Content-Type", value: "application/manifest+json; charset=utf-8" }],
      },
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
  experimental: {
    // Product images travel as compressed data URLs. The default ~1 MB action
    // body was returning HTTP 500 / "Failed to fetch" during publish.
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;

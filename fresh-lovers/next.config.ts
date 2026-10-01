import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // This app lives inside another repo — pin the workspace root to this folder.
  turbopack: { root: __dirname },
  images: { formats: ["image/avif", "image/webp"] },
};

export default nextConfig;

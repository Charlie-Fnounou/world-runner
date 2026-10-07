import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // This app lives inside another repo — pin the workspace root to this folder.
  turbopack: { root: __dirname },
  images: { formats: ["image/avif", "image/webp"] },
  async redirects() {
    // the kids pouches were merged into Yogurt en Pouch (variants 8+)
    return [{ source: "/productos/yogurt-pouches-ninos", destination: "/productos/yogurt-en-pouch?v=8", permanent: true }];
  },
};

export default nextConfig;

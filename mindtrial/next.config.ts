import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // This app lives in the mindtrial/ folder of the world-runner repo. Vercel's
  // build output step expects files to be traced from the repository root, so
  // the tracing root is the parent folder. Builds use webpack (see package.json):
  // Turbopack would then treat the parent folder as its project root and pick
  // up the other app's src/proxy.ts.
  outputFileTracingRoot: path.join(__dirname, ".."),
};

export default nextConfig;

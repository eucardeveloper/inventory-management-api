import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emits a self-contained server bundle in .next/standalone so the production
  // image does not need node_modules or the full source tree.
  output: "standalone",
};

export default nextConfig;

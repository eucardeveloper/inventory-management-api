import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: [
    "@mui/material",
    "@mui/system",
    "@mui/utils",
    "@mui/icons-material",
    "@emotion/react",
    "@emotion/styled",
  ],
  devIndicators: false,
  // Only read by `next dev` (docker-compose.dev.yml): lets the dev server answer pages opened via 127.0.0.1 too.
  allowedDevOrigins: ["localhost", "127.0.0.1"],
  // Defence in depth for every page: no MIME sniffing, no framing, a short referrer, no powerful browser features.
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;

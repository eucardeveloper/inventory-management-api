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
};

export default nextConfig;
